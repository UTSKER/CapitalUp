/**
 * Operational eval: LATENCY (with time-to-first-token).
 * 
 * Unlike quality evals (correctness, faithfulness, toxicity),
 * latency is a deterministic measurement: run the pipeline N times,
 * collect a distribution, and report percentiles against a budget (SLO).
 *
 * Two latency numbers matter:
 *   - END-TO-END total : how long until the FULL answer is ready
 *   - TTFT (perceived) : how long until the user sees the FIRST token stream in
 *
 * Key ideas encoded:
 *   - performance.now() high-resolution clock
 *   - Percentiles (p50, p95, p99) to measure tail latency
 *   - Warmup cycle discard (eliminates cold-start bias)
 *   - Stage decomposition (Retrieval ms + Generation ms + TTFT ms)
 *   - Answer length tracking (latency scales with output size)
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { performance } = require("perf_hooks");

const retrieverService = require("../src/modules/ai/knowledge/retrieval/retriever.service");
const llmService = require("../src/modules/ai/services/llm.service");
const aiService = require("../src/modules/ai/services/ai.service");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");

// ============================================================
// 1. CONFIG & DATASET
// ============================================================
let dataset = [];
try {
  dataset = require("./rag_eval/dataset.json");
} catch (e) {
  dataset = [
    { question: "What is the difference between a Market Order and a Limit Order?" },
    { question: "How does an OCO (One-Cancels-the-Other) order work when a stop loss is hit?" },
    { question: "What are the max order value and quantity limits enforced by the risk engine?" },
    { question: "What documents are required to complete KYC verification on CapitalUp?" }
  ];
}

const QUESTIONS = dataset.map((d) => d.question || d);

const REPEATS = 2;            // Measured runs per question -> total samples = QUESTIONS.length * REPEATS
const WARMUP_RUNS = 2;        // Throwaway runs before measuring to eliminate cold start
const MAX_RETRIES = 2;        // Max retry attempts per query run on network failures

const MEASURE_TTFT = true;    // Stream generation and clock time-to-first-token (perceived latency)
const STAGE_LEVEL = true;     // Split retrieval vs generation

// SLOs / Performance Budgets
const SLO_P95_MS = 3500;        // End-to-end full answer p95 budget (3.5s)
const SLO_TTFT_P95_MS = 1500;   // Perceived first-token p95 budget (1.5s)
const SLO_RETRIEVAL_P95_MS = 800; // Knowledge retrieval p95 budget (800ms)

const mockUser = {
  userId: "17",
  fullName: "Eval Trader",
  email: "eval@capitalup.com",
  cashBalance: 25000,
};

// ============================================================
// 2. CAPITALUP PRODUCTION RAG PROMPT TEMPLATE
// ============================================================
function buildRagPrompt(question, context, user = mockUser) {
  const currentDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  const userInfoText = user
    ? `User Profile:
- Name: ${user.fullName || "Trader"}
- Available Balance: ₹${(user.cashBalance || 0).toLocaleString("en-IN")}`
    : "";

  return `You are CapitalUp AI Assistant, a concise, smart financial copilot.

Current Date & Time: ${currentDate}
${userInfoText}

CRITICAL RULES:
1. **CONCISE RESPONSE**: Keep your final answer under 60-90 words. Direct, polite, and helpful.
2. **NO TECHNICAL LEAKS (ZERO TOLERANCE)**: NEVER mention API endpoints (e.g. GET/POST /api/...), code snippets, markdown filenames (like "portfolio.md" or "admin.md"), database tables, middlewares, or internal server mechanics.
3. **GREETINGS & CASUAL QUESTIONS**: For greetings (e.g., "hy", "hi", "how are you"), reply warmly and concisely in 1-2 friendly sentences. Do NOT output documentation.
4. **PLATFORM ASSISTANCE**: Use the Live Context below to answer user queries about their KYC, portfolio, or trading.
5. **DO NOT OUTPUT THINKING TAGS**: Give ONLY the final response to the user. Do not include <think> or internal reasoning in your output.

=== CONTEXT ===
${context || "No extra context."}

=== USER QUESTION ===
${question}
`;
}

// ============================================================
// 3. PIPELINE ADAPTERS WITH RETRY
// ============================================================

// Execute an async task with up to MAX_RETRIES attempts
async function executeWithRetry(fn, maxRetries = MAX_RETRIES) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
  }
  throw lastError;
}

// End-to-end full pipeline execution
async function runEndToEnd(question) {
  return executeWithRetry(async () => {
    const result = await aiService.chat(question, mockUser);
    return result?.reply || "";
  });
}

// Stage-level execution (Retrieval ms + Non-streaming Generation ms)
async function runStages(question) {
  return executeWithRetry(async () => {
    const t0 = performance.now();
    const docs = await retrieverService.retrieve(question, 4);
    const context = retrieverService.formatContext(docs);
    const t1 = performance.now();

    const answer = await llmService.chat(question, context, mockUser);
    const t2 = performance.now();

    return {
      answer,
      stages: {
        retrieval: t1 - t0,
        generation: t2 - t1,
      },
    };
  });
}

// Stage-level streaming execution (Retrieval ms + TTFT ms + Generation ms)
async function runStagesStreaming(question) {
  return executeWithRetry(async () => {
    const t0 = performance.now();
    const docs = await retrieverService.retrieve(question, 4);
    const context = retrieverService.formatContext(docs);
    const t1 = performance.now();

    const prompt = buildRagPrompt(question, context, mockUser);
    let firstTokenTime = null;
    const pieces = [];

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (geminiKey) {
      try {
        const isBearer = geminiKey.startsWith("AQ.") || geminiKey.startsWith("ya29.");
        const headers = { "Content-Type": "application/json" };
        let url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-1.5-flash"}:streamGenerateContent?alt=sse`;
        if (isBearer) {
          headers["Authorization"] = `Bearer ${geminiKey}`;
        } else {
          url += `&key=${geminiKey}`;
        }

        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 300 }
          })
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let done = false;
          while (!done) {
            const { value, done: streamDone } = await reader.read();
            done = streamDone;
            if (value) {
              const chunkText = decoder.decode(value, { stream: true });
              const lines = chunkText.split("\n");
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const parsed = JSON.parse(line.slice(6));
                    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    if (text) {
                      if (firstTokenTime === null) firstTokenTime = performance.now();
                      pieces.push(text);
                    }
                  } catch (e) {}
                }
              }
            }
          }
        }
      } catch (geminiStreamErr) {
        // Fallback to non-streaming chat
        const fallback = await llmService.chat(question, context, mockUser);
        firstTokenTime = performance.now();
        pieces.push(fallback);
      }
    } else {
      try {
        const activeModels = await llmService.getActiveGroqModels();
        const modelInstance = llmService.getModel(activeModels[0] || "openai/gpt-oss-20b");

        const stream = await modelInstance.stream([
          new SystemMessage("You are the official CapitalUp AI Assistant. Provide only the final helpful answer directly."),
          new HumanMessage(prompt),
        ]);

        for await (const chunk of stream) {
          const textChunk = typeof chunk?.content === "string" ? chunk.content : "";
          if (textChunk && firstTokenTime === null) {
            firstTokenTime = performance.now();
          }
          pieces.push(textChunk);
        }
      } catch (err) {
        const fallbackAnswer = await llmService.chat(question, context, mockUser);
        firstTokenTime = performance.now();
        pieces.push(fallbackAnswer);
      }
    }

    const t2 = performance.now();
    const rawAnswer = pieces.join("");
    const answer = rawAnswer.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    const ttftMs = firstTokenTime ? firstTokenTime - t0 : NaN;

    return {
      answer,
      stages: {
        retrieval: t1 - t0,
        generation: t2 - t1,
        ttft: ttftMs,
      },
    };
  });
}

// ============================================================
// 3. PERCENTILE HELPER
// ============================================================
function percentile(values, p) {
  const clean = values.filter((v) => !isNaN(v) && v != null);
  if (!clean.length) return NaN;

  const sorted = [...clean].sort((a, b) => a - b);
  const k = (sorted.length - 1) * (p / 100.0);
  const lo = Math.floor(k);
  const hi = Math.ceil(k);

  if (lo === hi) return sorted[lo];
  return sorted[lo] * (hi - k) + sorted[hi] * (k - lo);
}

function summarize(samples) {
  const clean = samples.filter((s) => !isNaN(s) && s != null);
  if (!clean.length) {
    return { n: 0, mean: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0 };
  }
  const sum = clean.reduce((acc, val) => acc + val, 0);
  return {
    n: clean.length,
    mean: sum / clean.length,
    p50: percentile(clean, 50),
    p95: percentile(clean, 95),
    p99: percentile(clean, 99),
    min: Math.min(...clean),
    max: Math.max(...clean),
  };
}

// ============================================================
// 4. BENCHMARK RUNNER
// ============================================================
async function runBenchmark() {
  console.log("\n============================================================");
  console.log("  RAG EVALUATION: OPERATIONAL LATENCY BENCHMARK");
  console.log("============================================================");
  console.log(`Evaluated Questions : ${dataset.length} (Standard & Tricky)`);
  console.log(`Repeats Per Query   : ${REPEATS}`);
  console.log(`Max Retries On Err  : ${MAX_RETRIES}`);
  console.log(`Total Sample Size   : ${dataset.length * REPEATS}`);
  console.log(`Warmup Discards     : ${WARMUP_RUNS}`);
  console.log(`Measure TTFT (Stream): ${MEASURE_TTFT}`);

  // Warmup loop
  console.log(`\n⏳ Running ${WARMUP_RUNS} throwaway warmup calls (cold start elimination)...`);
  for (let i = 0; i < WARMUP_RUNS; i++) {
    process.stdout.write(`  Warmup ${i + 1}/${WARMUP_RUNS}... `);
    await runEndToEnd(dataset[i % dataset.length].question || QUESTIONS[0]);
    console.log("✓ Done");
  }

  const totalMs = [];
  const retrievalMs = [];
  const generationMs = [];
  const ttftMs = [];
  const answerLengths = [];
  const trickyTotalMs = [];
  const standardTotalMs = [];

  console.log(`\n🚀 Measuring latency across 15 test questions (${dataset.length} queries x ${REPEATS} runs)...`);

  for (let qIdx = 0; qIdx < dataset.length; qIdx++) {
    const item = dataset[qIdx];
    const q = item.question || item;
    const typeTag = item.type === "tricky" ? "⚡ TRICKY" : "📌 STANDARD";
    const catTag = item.category ? `[${item.category.toUpperCase()}]` : "";

    console.log(`\n[${qIdx + 1}/${dataset.length}] ${typeTag} ${catTag} "${q.length > 60 ? q.slice(0, 57) + '...' : q}"`);

    for (let r = 0; r < REPEATS; r++) {
      const start = performance.now();
      let answer = "";

      if (MEASURE_TTFT) {
        const res = await runStagesStreaming(q);
        answer = res.answer;
        retrievalMs.push(res.stages.retrieval);
        generationMs.push(res.stages.generation);
        ttftMs.push(res.stages.ttft);
      } else if (STAGE_LEVEL) {
        const res = await runStages(q);
        answer = res.answer;
        retrievalMs.push(res.stages.retrieval);
        generationMs.push(res.stages.generation);
      } else {
        answer = await runEndToEnd(q);
      }

      const elapsed = performance.now() - start;
      totalMs.push(elapsed);
      answerLengths.push((answer || "").length);

      if (item.type === "tricky") {
        trickyTotalMs.push(elapsed);
      } else {
        standardTotalMs.push(elapsed);
      }

      process.stdout.write(`   Run ${r + 1}/${REPEATS}: ${elapsed.toFixed(0)}ms (retrieval: ${(retrievalMs[retrievalMs.length - 1] || 0).toFixed(0)}ms, gen: ${(generationMs[generationMs.length - 1] || 0).toFixed(0)}ms)\n`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return {
    total: totalMs,
    retrieval: retrievalMs,
    generation: generationMs,
    ttft: ttftMs,
    answer_len: answerLengths,
    standardTotal: standardTotalMs,
    trickyTotal: trickyTotalMs,
  };
}

// ============================================================
// 5. REPORTING & SLO VERDICTS
// ============================================================
function printRow(label, s) {
  const lbl = label.padEnd(14, " ");
  const n = String(s.n).padEnd(4, " ");
  const mean = s.mean.toFixed(1).padStart(8, " ");
  const p50 = s.p50.toFixed(1).padStart(8, " ");
  const p95 = s.p95.toFixed(1).padStart(8, " ");
  const p99 = s.p99.toFixed(1).padStart(8, " ");
  const min = s.min.toFixed(1).padStart(8, " ");
  const max = s.max.toFixed(1).padStart(8, " ");

  console.log(`${lbl} | n=${n} mean=${mean}ms  p50=${p50}ms  p95=${p95}ms  p99=${p99}ms  min=${min}ms  max=${max}ms`);
}

function printSloLine(label, p95Value, budgetMs) {
  const isPass = p95Value <= budgetMs;
  const status = isPass ? "✅ PASS" : "❌ FAIL";
  const lbl = label.padEnd(24, " ");
  const p95Str = p95Value.toFixed(0).padStart(5, " ");
  console.log(`SLO: ${lbl} p95 <= ${String(budgetMs).padStart(4, " ")} ms  ->  p95 = ${p95Str} ms   [${status}]`);
}

function printReport(results) {
  console.log("\n" + "=".repeat(84));
  console.log("  RAG PIPELINE LATENCY EVALUATION REPORT (milliseconds)");
  console.log("=".repeat(84));

  const total = summarize(results.total);
  printRow("end-to-end", total);

  if (results.ttft.length) {
    printRow("ttft (visible)", summarize(results.ttft));
  }
  if (results.retrieval.length) {
    printRow("retrieval", summarize(results.retrieval));
    printRow("generation", summarize(results.generation));
  }

  if (results.standardTotal.length && results.trickyTotal.length) {
    console.log("-".repeat(84));
    printRow("std questions", summarize(results.standardTotal));
    printRow("tricky queries", summarize(results.trickyTotal));
  }

  const avgLen = results.answer_len.reduce((a, b) => a + b, 0) / results.answer_len.length;
  console.log("-".repeat(84));
  console.log(`Average answer length : ${avgLen.toFixed(0)} characters (token volume directly drives generation latency)`);

  console.log("=".repeat(84));
  console.log("  SERVICE LEVEL OBJECTIVE (SLO) VERDICTS");
  console.log("=".repeat(84));
  printSloLine("Full Answer (Total)", total.p95, SLO_P95_MS);

  if (results.ttft.length) {
    printSloLine("TTFT (Perceived First Token)", summarize(results.ttft).p95, SLO_TTFT_P95_MS);
  }
  if (results.retrieval.length) {
    printSloLine("Knowledge Retrieval", summarize(results.retrieval).p95, SLO_RETRIEVAL_P95_MS);
  }
  console.log("=".repeat(84) + "\n");
}

// ============================================================
// 6. MAIN EXECUTION
// ============================================================
async function main() {
  try {
    const { redisClient } = require("../src/config/redis");
    await redisClient.connect().catch(() => {});

    const results = await runBenchmark();
    printReport(results);
    process.exit(0);
  } catch (err) {
    console.error("❌ Evaluation Benchmark failed:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  runBenchmark,
  runStages,
  runStagesStreaming,
  percentile,
  summarize,
};
