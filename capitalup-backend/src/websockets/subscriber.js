const { subscriber } = require("../config/redis");
const { getIO } = require("./socket");

async function startSubscriber() {
  console.log("Starting Redis subscriber...");

  await subscriber.subscribe("market:update", (message) => {
    // console.log("Received from Redis:", message);

    const data = JSON.parse(message);

    const io = getIO();

    if (!io) {
      // console.log("Socket.IO not initialized");
      return;
    }

    io.emit("market:update", data);
  });

  console.log("Subscribed to market:update");
}

module.exports = startSubscriber;