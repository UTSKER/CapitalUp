import { io } from "socket.io-client";

const normalizeSocketUrl = (value = "") => {
  if (!value) return "http://localhost:3000";
  return value.replace(/\/api\/?$/, "");
};

const socket = io(normalizeSocketUrl(import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL), {
  transports: ["websocket"],
  withCredentials: true,
});

export default socket;