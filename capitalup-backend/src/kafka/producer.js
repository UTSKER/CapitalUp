const kafka = require("./kafka");

const producer = kafka.producer();

let connected = false;

async function connectProducer() {
    if (!process.env.KAFKA_BROKERS || !process.env.KAFKA_BROKERS.trim()) {
        console.log("ℹ️ Kafka Producer bypassed (local mode)");
        return;
    }
    if (!connected) {
        try {
            await producer.connect();
            connected = true;
            console.log("✅ Kafka Producer Connected");
        } catch (err) {
            console.warn("⚠️ Kafka Producer connection failed, bypassing for local:", err.message);
        }
    }
}

async function publish(topic, message) {
    if (!connected || !process.env.KAFKA_BROKERS || !process.env.KAFKA_BROKERS.trim()) {
        // Direct local dispatch bypass for notifications
        try {
            const notificationService = require("../modules/notification/services/notification.service");
            if (topic === "notification-events" || message.event || message.userId) {
                await notificationService.sendNotification(message);
            }
        } catch (err) {
            console.warn("⚠️ Local notification dispatch warning:", err.message);
        }
        return;
    }

    try {
        await producer.send({
            topic,
            messages: [
                {
                    value: JSON.stringify(message),
                },
            ],
        });
    } catch (err) {
        console.error("❌ Kafka publish error:", err.message);
        // Fallback to direct notification dispatch
        try {
            const notificationService = require("../modules/notification/services/notification.service");
            if (topic === "notification-events" || message.event || message.userId) {
                await notificationService.sendNotification(message);
            }
        } catch (fallbackErr) {
            console.warn("⚠️ Local notification fallback warning:", fallbackErr.message);
        }
    }
}

module.exports = {
    connectProducer,
    publish,
};

