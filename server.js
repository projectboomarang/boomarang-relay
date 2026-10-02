// server.js
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });
const rooms = new Map();

wss.on("connection", (ws) => {
  let roomId = null;

  ws.on("message", (data) => {
    let msg;

    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    // Join a room
    if (msg.type === "join") {
      roomId = String(msg.room);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }

      const room = rooms.get(roomId);

      if (room.size >= 2) {
        ws.send(JSON.stringify({
          type: "error",
          message: "Room is full"
        }));
        return;
      }

      room.add(ws);

      ws.send(JSON.stringify({
        type: "joined",
        room: roomId,
        players: room.size
      }));

      for (const client of room) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "player_joined",
            players: room.size
          }));
        }
      }

      return;
    }

    // Relay gameplay messages
    if (roomId && rooms.has(roomId)) {
      for (const client of rooms.get(roomId)) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "game",
            data: msg
          }));
        }
      }
    }
  });

  ws.on("close", () => {
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    room.delete(ws);

    for (const client of room) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "player_left",
          players: room.size
        }));
      }
    }

    if (room.size === 0) {
      rooms.delete(roomId);
    }
  });
});

console.log("2K22 community relay running on ws://localhost:8080");
