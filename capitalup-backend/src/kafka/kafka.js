const { Kafka } = require("kafkajs");

const isKafkaConfigured = Boolean(process.env.KAFKA_BROKERS && process.env.KAFKA_BROKERS.trim());

let kafka;

if (isKafkaConfigured) {
    kafka = new Kafka({
        clientId: "capitalup-backend",
        brokers: process.env.KAFKA_BROKERS.split(","),
        connectionTimeout: 10000,
        authenticationTimeout: 10000,
        ssl: process.env.KAFKA_CA_CERT ? {
            ca: [process.env.KAFKA_CA_CERT],
        } : (process.env.KAFKA_SSL === "true"),
        ...(process.env.KAFKA_SASL_USERNAME ? {
            sasl: {
                mechanism: "scram-sha-256",
                username: process.env.KAFKA_SASL_USERNAME,
                password: process.env.KAFKA_SASL_PASSWORD,
            },
        } : {}),
    });
} else {
    // Stub client for local development when Kafka broker is not running
    kafka = {
        producer: () => ({
            connect: async () => {},
            send: async () => {},
            disconnect: async () => {},
        }),
        consumer: () => ({
            connect: async () => {},
            subscribe: async () => {},
            run: async () => {},
            disconnect: async () => {},
        }),
        admin: () => ({
            connect: async () => {},
            listTopics: async () => [],
            createTopics: async () => {},
            disconnect: async () => {},
        }),
    };
}

module.exports = kafka;
