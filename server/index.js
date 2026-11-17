
const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });
  res.end("Original Arena Online Server is running!");
});

const wss = new WebSocket.Server({ server });
const rooms = new Map();

const MODES = {
  "1v1": 2,
  "2v2": 4,
  "4players": 4
};

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(room, data) {
  room.players.forEach(client => send(client, data));
}

function leaveRoom(ws) {
  const code = ws.roomCode;
  if (!code) return;

  const room = rooms.get(code);
  ws.roomCode = null;

  if (!room) return;

  room.players = room.players.filter(p => p !== ws);

  if (room.players.length === 0) {
    rooms.delete(code);
  } else {
    broadcast(room, {
      type: "playerLeft",
      playerCount: room.players.length
    });
  }
}

wss.on("connection", ws => {
  ws.on("message", message => {
    let data;

    try {
      data = JSON.parse(message.toString());
    } catch {
      send(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    if (data.type === "createRoom") {
      leaveRoom(ws);

      const maxPlayers = MODES[data.mode];

      if (!maxPlayers) {
        send(ws, { type: "error", message: "Invalid mode" });
        return;
      }

      let code;
      do {
        code = Math.random().toString(36)
          .substring(2, 8).toUpperCase();
      } while (rooms.has(code));

      const room = {
        code,
        mode: data.mode,
        maxPlayers,
        players: [ws],
        started: false
      };

      rooms.set(code, room);
      ws.roomCode = code;

      send(ws, {
        type: "roomCreated",
        roomCode: code,
        mode: data.mode,
        maxPlayers,
        playerCount: 1
      });
      return;
    }

    if (data.type === "joinRoom") {
      leaveRoom(ws);

      const code = String(data.roomCode || "")
        .trim().toUpperCase();

      const room = rooms.get(code);

      if (!room) {
        send(ws, { type: "error", message: "Room not found" });
        return;
      }

      if (room.started || room.players.length >= room.maxPlayers) {
        send(ws, { type: "error", message: "Room unavailable" });
        return;
      }

      room.players.push(ws);
      ws.roomCode = code;

      broadcast(room, {
        type: "playerJoined",
        roomCode: code,
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers
      });
      return;
    }

    const room = rooms.get(ws.roomCode);

    if (!room) {
      send(ws, { type: "error", message: "Not in a room" });
      return;
    }

    if (data.type === "startGame") {
      if (room.players[0] !== ws) {
        send(ws, { type: "error", message: "Only host can start" });
        return;
      }

      if (room.players.length !== room.maxPlayers) {
        send(ws, { type: "error", message: "Players are missing" });
        return;
      }

      room.started = true;
      broadcast(room, { type: "gameStarted" });
      return;
    }

    if (data.type === "gameState" || data.type === "gameAction") {
      room.players.forEach(client => {
        if (client !== ws) {
          send(client, {
            ...data,
            senderId: room.players.indexOf(ws)
          });
        }
      });
      return;
    }

    if (data.type === "leaveRoom") {
      leaveRoom(ws);
    }
  });

  ws.on("close", () => leaveRoom(ws));
  ws.on("error", () => leaveRoom(ws));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Online server listening on port " + PORT);
});

