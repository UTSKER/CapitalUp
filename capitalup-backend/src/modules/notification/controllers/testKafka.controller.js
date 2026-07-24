const { producer, topics } = require("../../../kafka");

exports.publishTest = async (req, res) => {
    await producer.publish(topics.NOTIFICATION, {
        event: "TEST",
        message: "Hello Kafka",
        createdAt: new Date().toISOString(),
    });

    return res.json({
        success: true,
        message: "Published to Kafka",
    });
};