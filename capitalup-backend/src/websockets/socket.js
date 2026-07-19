const { Server } = require("socket.io");

let io;
let connectedSocketCount = 0;

function initializeSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || process.env.FRONTEND_ORIGIN || "http://localhost:5173",
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        connectedSocketCount++;
        console.log("Client connected:", socket.id);

        socket.on("disconnect", () => {
            connectedSocketCount = Math.max(0, connectedSocketCount - 1);
            console.log("Disconnected:", socket.id);
        });
    });

    return io;
}

function getIO() {
    return io;
}

function getConnectedSocketCount() {
    return connectedSocketCount;
}

module.exports = {
    initializeSocket,
    getIO,
    getConnectedSocketCount,
};
