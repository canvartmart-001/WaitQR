import { io } from "socket.io-client";

export function createRealtimeClient() {
  return io({
    path: "/socket.io",
    transports: ["polling", "websocket"],
  });
}
