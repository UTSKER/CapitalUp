const kafka = require("./kafka");

const admin = kafka.admin();

async function initializeKafka() {
    if (!process.env.KAFKA_BROKERS || !process.env.KAFKA_BROKERS.trim()) {
        console.log("ℹ️ Kafka initialization bypassed (local mode)");
        return;
    }

    try {
        await admin.connect();

        const topics = await admin.listTopics();

        if (!topics.includes("notification-events")) {
            await admin.createTopics({
                topics: [
                    {
                        topic: "notification-events",
                        numPartitions: 2,
                        replicationFactor: 1,
                    },
                ],
            });

            console.log("✅ notification-events topic created");
        } else {
            console.log("✅ notification-events topic already exists");
        }

        await admin.disconnect();
    } catch (err) {
        console.warn("⚠️ Kafka Admin initialization failed, bypassing for local:", err.message);
    }
}

module.exports = initializeKafka;