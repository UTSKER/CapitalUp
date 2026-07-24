const { Kafka } = require("kafkajs");

const kafka = new Kafka({
    clientId: "capitalup-backend",
    brokers: process.env.KAFKA_BROKERS.split(","),
});

module.exports = kafka;