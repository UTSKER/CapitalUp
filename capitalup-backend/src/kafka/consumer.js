const kafka = require("./kafka");

const consumer = kafka.consumer({
    groupId: "notification-group",
});

async function connectConsumer(topic, handler) {
    await consumer.connect();

    await consumer.subscribe({
        topic,
        fromBeginning: true,
    });

    console.log(`✅ Listening on ${topic}`);

    await consumer.run({
        eachMessage: async ({ message }) => {
            const data = JSON.parse(message.value.toString());

            await handler(data);
        },
    });
}

module.exports = connectConsumer;