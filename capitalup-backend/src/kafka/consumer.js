const kafka = require("./kafka");

const consumer = kafka.consumer({
    groupId: "notification-group",
});

async function connectConsumer(topic, handler) {
    if (!process.env.KAFKA_BROKERS || !process.env.KAFKA_BROKERS.trim()) {
        console.log(`ℹ️ Kafka Consumer bypassed for ${topic} (local mode)`);
        return;
    }

    try {
        await consumer.connect();

        await consumer.subscribe({
            topic,
            fromBeginning: true,
        });

        console.log(`✅ Listening on ${topic}`);

        await consumer.run({
            eachMessage: async ({ message }) => {
                try {
                    const data = JSON.parse(message.value.toString());
                    await handler(data);
                } catch (msgErr) {
                    console.error("❌ Kafka consumer message handling error:", msgErr.message);
                }
            },
        });
    } catch (err) {
        console.warn(`⚠️ Kafka Consumer connection failed for ${topic}, bypassing for local:`, err.message);
    }
}

module.exports = connectConsumer;

