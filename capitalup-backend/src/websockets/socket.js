const { Server } = require("socket.io");

let io;

function initializeSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL,
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("disconnect", () => {
            console.log("Disconnected:", socket.id);
        });
    });

    return io;
}

function getIO() {
    return io;
}

module.exports = {
    initializeSocket,
    getIO,
};