const connectConsumer = require("../../../kafka/consumer");
const { topics } = require("../../../kafka");
const notificationService = require("./notification.service");

async function startNotificationConsumer() {
    await connectConsumer(topics.NOTIFICATION, async (data) => {
        console.log("=================================");
        console.log("Kafka Message Received");
        console.log(data);
        console.log("=================================");

        try {
            await notificationService.sendNotification(data);

            console.log("✅ Notification processed");
        } catch (err) {
            console.error("❌ Notification failed:", err);
        }
    });
}

module.exports = startNotificationConsumer;