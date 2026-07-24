const kafka = require("./kafka");

const admin = kafka.admin();

async function initializeKafka() {
    await admin.connect();

    const topics = await admin.listTopics();

    if (!topics.includes("notification-events")) {
        await admin.createTopics({
            topics: [
                {
                    topic: "notification-events",
                    numPartitions: 3,
                    replicationFactor: 1,
                },
            ],
        });

        console.log("✅ notification-events topic created");
    } else {
        console.log("✅ notification-events topic already exists");
    }

    await admin.disconnect();
}

module.exports = initializeKafka;