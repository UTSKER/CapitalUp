const kafka = require("./kafka");

const producer = kafka.producer();

let connected = false;

async function connectProducer() {
    if (!connected) {
        await producer.connect();
        connected = true;
        console.log("✅ Kafka Producer Connected");
    }
}

async function publish(topic, message) {
    await producer.send({
        topic,
        messages: [
            {
                value: JSON.stringify(message),
            },
        ],
    });
}

module.exports = {
    connectProducer,
    publish,
};