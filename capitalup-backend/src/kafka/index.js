const producer = require("./producer");
const consumer = require("./consumer");
const topics = require("./topics");
const initializeKafka = require("./admin");

module.exports = {
    producer,
    consumer,
    topics,
    initializeKafka,
};