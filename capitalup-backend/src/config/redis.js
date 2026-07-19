require("dotenv").config({ override: true });
const { createClient } = require("redis");
const EventEmitter = require("events");

// In-Memory Mock Redis Client Fallback
class MockRedisClient extends EventEmitter {
  constructor() {
    super();
    this.store = new Map();
    this.isMock = true;
  }

  async connect() {
    console.warn("⚠️  Redis: Running in In-Memory Mock Fallback Mode (Real Redis connection failed/skipped)");
    return Promise.resolve();
  }

  async disconnect() {
    return Promise.resolve();
  }

  async set(key, value, options) {
    this.store.set(key, value);
    if (options && options.PX) {
      setTimeout(() => {
        this.store.delete(key);
      }, options.PX);
    }
    return "OK";
  }

  async del(key) {
    this.store.delete(key);
    return 1;
  }

  async incr(key) {
    const next = Number(this.store.get(key) || 0) + 1;
    this.store.set(key, String(next));
    return next;
  }

  async expire(key, seconds) {
    setTimeout(() => this.store.delete(key), Number(seconds) * 1000);
    return 1;
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async flushAll() {
    this.store.clear();
    return "OK";
  }

  duplicate() {
    return this; // Share same in-memory bus for pub/sub
  }

  async subscribe(channel, callback) {
    this.on(channel, callback);
    return Promise.resolve();
  }

  async publish(channel, message) {
    this.emit(channel, message);
    return Promise.resolve(1);
  }
}

const mockClient = new MockRedisClient();

const redisUrl =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`;

const realClient = createClient({
  url: redisUrl,
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    connectTimeout: 3000, // Fail fast (3s) instead of hanging the server startup
    reconnectStrategy: (retries) => {
      if (retries > 2) {
        // Stop attempting to reconnect to avoid continuous error logging
        return new Error("Max reconnection attempts reached");
      }
      return 1000;
    }
  }
});

let useMock = false;
let activeClient = realClient;
let activePublisher = null;
let activeSubscriber = null;

// Proxy wrapper for redisClient
const clientProxy = new Proxy({}, {
  get(target, prop) {
    if (prop === "connect") {
      return async () => {
        try {
          await realClient.connect();
          activeClient = realClient;
          console.log("Successfully connected to Redis Server");
        } catch (err) {
          console.error("❌ Redis connection failed. Falling back to In-Memory Mock:", err.message);
          useMock = true;
          activeClient = mockClient;
          await mockClient.connect();
        }
      };
    }
    const val = activeClient[prop];
    return typeof val === "function" ? val.bind(activeClient) : val;
  }
});

// Proxy wrapper for publisher
const publisherProxy = new Proxy({}, {
  get(target, prop) {
    if (prop === "connect") {
      return async () => {
        if (useMock) {
          activePublisher = mockClient;
          return Promise.resolve();
        }
        try {
          activePublisher = realClient.duplicate();
          activePublisher.on("error", (err) => {
            if (!useMock) console.error("Redis Publisher Error:", err.message);
          });
          await activePublisher.connect();
        } catch (err) {
          console.error("❌ Redis Publisher connection failed. Falling back to Mock:", err.message);
          activePublisher = mockClient;
        }
      };
    }
    const current = activePublisher || mockClient;
    const val = current[prop];
    return typeof val === "function" ? val.bind(current) : val;
  }
});

// Proxy wrapper for subscriber
const subscriberProxy = new Proxy({}, {
  get(target, prop) {
    if (prop === "connect") {
      return async () => {
        if (useMock) {
          activeSubscriber = mockClient;
          return Promise.resolve();
        }
        try {
          activeSubscriber = realClient.duplicate();
          activeSubscriber.on("error", (err) => {
            if (!useMock) console.error("Redis Subscriber Error:", err.message);
          });
          await activeSubscriber.connect();
        } catch (err) {
          console.error("❌ Redis Subscriber connection failed. Falling back to Mock:", err.message);
          activeSubscriber = mockClient;
        }
      };
    }
    const current = activeSubscriber || mockClient;
    const val = current[prop];
    return typeof val === "function" ? val.bind(current) : val;
  }
});

// Prevent top-level unhandled errors on the initial real client object
realClient.on("error", (err) => {
  if (!useMock) {
    console.error("Redis Client Error Event:", err.message);
  }
});

module.exports = {
  redisClient: clientProxy,
  publisher: publisherProxy,
  subscriber: subscriberProxy,
};
