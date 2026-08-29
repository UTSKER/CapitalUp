class ContextBuilder {
    build(result) {
        switch (result.type) {
            case "GENERAL":
                return "";

            case "RAG":
                return this.buildRAG(result);

            case "KYC":
                return this.buildKYC(result);

            case "PORTFOLIO":
                return this.buildPortfolio(result);

            case "MARKET":
                return this.buildMarket(result);

            case "TICKET":
                return this.buildTicket(result);

            default:
                return "";
        }
    }

    buildRAG(result) {
        if (!result.data || !result.data.documents || !result.data.documents.length) {
            return "No relevant documentation found.";
        }

        // Filter out admin docs and sanitize internal API endpoints
        return result.data.documents
            .filter((doc) => doc.fileName !== "admin.md")
            .map((doc) => {
                // Strip raw technical endpoints and middleware jargon
                const cleanText = doc.text
                    .replace(/-\s*\*\*Endpoint:\*\*.*$/gm, "")
                    .replace(/GET\s*\/api\/[^\s]+/gi, "")
                    .replace(/POST\s*\/api\/[^\s]+/gi, "")
                    .replace(/`adminMiddleware`|`authenticate`/g, "")
                    .trim();

                return cleanText;
            })
            .filter(Boolean)
            .join("\n\n---\n\n");
    }

    buildKYC(result) {
        const kyc = result.data || {};

        if (!kyc.exists) {
            return "The user has not started KYC verification yet.";
        }

        return `Live User KYC Information:
- Status: ${kyc.status || "PENDING"}
- Remarks: ${kyc.remarks || "No remarks"}
- PAN Name: ${kyc.panFullName || "Provided"}
- Bank: ${kyc.bankName || "Not linked"}
- Account Holder: ${kyc.accountHolder || "N/A"}`;
    }

    buildPortfolio(result) {
        const portfolio = result.data || {};
        const summary = portfolio.summary || {
            total_invested: 0,
            current_value: 0,
            total_profit_loss: 0,
            total_profit_loss_percentage: 0,
            balance: 0
        };
        const holdings = portfolio.holdings || [];

        let context = `Live User Portfolio Information:\n`;
        context += `- Total Invested: ₹${Number(summary.total_invested || 0).toLocaleString('en-IN')}\n`;
        context += `- Current Value: ₹${Number(summary.current_value || 0).toLocaleString('en-IN')}\n`;
        context += `- Total Profit/Loss: ₹${Number(summary.total_profit_loss || 0).toLocaleString('en-IN')} (${summary.total_profit_loss_percentage || 0}%)\n`;
        context += `- Available Cash Balance: ₹${Number(summary.balance || 0).toLocaleString('en-IN')}\n\n`;

        if (holdings.length === 0) {
            context += `The user currently does not hold any stock positions.`;
        } else {
            context += `Holdings:\n`;
            holdings.forEach(h => {
                context += `- ${h.symbol || "Stock"}: Quantity: ${h.quantity || 0}, Avg Buy Price: ₹${h.average_buy_price || 0}, Current Price: ₹${h.current_price || 0}, PnL: ₹${h.profit_loss || 0} (${h.profit_loss_percentage || 0}%)\n`;
            });
        }
        return context;
    }

    buildMarket(result) {
        const data = result.data || {};
        const statusText = data.isMarketOpen 
            ? "OPEN (Live trading is active)" 
            : "CLOSED (Outside trading hours)";
        
        let context = `Current Stock Market Status: ${statusText}\n\n`;

        if (data.single) {
            const s = data.stock || {};
            context += `Live Market Stock Quote for ${s.symbol || "N/A"}:
- Company: ${s.companyName || s.company_name || s.symbol || "N/A"}
- Current Last Price: ₹${s.lastPrice || s.price || 0}
- Previous Close: ₹${s.previousClose || 0}
- Daily High: ₹${s.high || 0}
- Daily Low: ₹${s.low || 0}`;
            return context;
        } else {
            context += `Live Market Stock Prices:\n`;
            (data.stocks || []).forEach(s => {
                context += `- ${s.symbol}: Price: ₹${s.lastPrice || 0}, High: ₹${s.high || 0}, Low: ₹${s.low || 0}\n`;
            });
            return context;
        }
    }

    buildTicket(result) {
        const data = result.data || {};
        return `Support Tickets Status: ${data.message || "Support system active."}`;
    }
}

module.exports = new ContextBuilder();