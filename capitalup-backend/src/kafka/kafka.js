const { Kafka } = require("kafkajs");

const kafka = new Kafka({
    clientId: "capitalup-backend",
    brokers: process.env.KAFKA_BROKERS.split(","),
    connectionTimeout: 10000,
    authenticationTimeout: 10000,
    ssl: process.env.KAFKA_CA_CERT ? {
        ca: [process.env.KAFKA_CA_CERT],
    } : true,
    sasl: {
        mechanism: "scram-sha-256",
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD,
    },
});

module.exports = kafka;