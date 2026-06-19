// Black Box server: Socket.IO authority for rooms, rounds, and scoring.
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

import { EV, PHASE } from "../shared/events.js";
import { RoomManager } from "./RoomManager.js";
import { RoundEngine } from "./RoundEngine.js";
import { listModes } from "./ModeRegistry.js";

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.get("/", (_req, res) => res.send("Black Box server is running."));
app.get("/health", (_req, res) => res.json({ ok: true, modes: listModes().length }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const manager = new RoomManager();

function broadcast(room) {
  if (!room) return;
  io.to(room.code).emit(EV.ROOM_UPDATE, manager.sanitize(room));
}

function ensureEngine(room) {
  if (!room.engine) room.engine = new RoundEngine(io, room, () => broadcast(room));
  return room.engine;
}

io.on("connection", (socket) => {
  socket.emit("modes", listModes());

  socket.on(EV.CREATE_ROOM, ({ name } = {}, cb) => {
    const room = manager.createRoom(socket.id, name);
    socket.join(room.code);
    cb?.({ ok: true, code: room.code, you: socket.id });
    broadcast(room);
  });

  socket.on(EV.JOIN_ROOM, ({ code, name } = {}, cb) => {
    const room = manager.getRoom(code);
    if (!room) return cb?.({ ok: false, error: "Room not found." });
    if (room.phase !== PHASE.LOBBY)
      return cb?.({ ok: false, error: "Game already in progress." });
    if (room.players.length >= room.settings.maxPlayers)
      return cb?.({ ok: false, error: "Room is full." });

    manager.addPlayer(room, socket.id, name);
    socket.join(room.code);
    cb?.({ ok: true, code: room.code, you: socket.id });
    broadcast(room);
  });

  socket.on(EV.UPDATE_SETTINGS, (settings = {}) => {
    const room = manager.getRoomBySocket(socket.id);
    if (!room || socket.id !== room.hostId || room.phase !== PHASE.LOBBY) return;

    const next = { ...room.settings, ...settings };
    next.roundTimeSec = Math.max(15, Math.min(180, Number(next.roundTimeSec) || 60));
    next.maxPlayers = Math.max(2, Math.min(20, Number(next.maxPlayers) || 8));
    next.rounds = Math.max(1, Math.min(15, Number(next.rounds) || 5));
    room.settings = next;

    // re-balance teams when toggled
    room.players.forEach((p, i) => {
      p.teamId = next.teamMode ? i % 2 : null;
    });
    broadcast(room);
  });

  socket.on(EV.START_GAME, () => {
    const room = manager.getRoomBySocket(socket.id);
    if (!room || socket.id !== room.hostId) return;
    if (room.phase !== PHASE.LOBBY && room.phase !== PHASE.GAME_OVER) return;
    room.winner = null;
    ensureEngine(room).startGame();
  });

  socket.on(EV.SUBMIT_GUESS, ({ text } = {}) => {
    const room = manager.getRoomBySocket(socket.id);
    if (!room?.engine) return;
    const res = room.engine.submitGuess(socket.id, text);
    if (res.ok) {
      const player = manager.getPlayer(room, socket.id);
      io.to(room.code).emit(EV.GUESS_RESULT, {
        playerId: socket.id,
        name: player?.name,
        correct: res.correct,
      });
    }
  });

  socket.on(EV.NEXT_ROUND, () => {
    const room = manager.getRoomBySocket(socket.id);
    if (!room || socket.id !== room.hostId) return;
    room.engine?.forceNext();
  });

  socket.on(EV.LEAVE_ROOM, () => handleLeave(socket));
  socket.on("disconnect", () => handleLeave(socket));
});

function handleLeave(socket) {
  const room = manager.getRoomBySocket(socket.id);
  if (!room) return;
  const stillThere = manager.removePlayer(socket.id);
  socket.leave(room.code);
  if (stillThere) broadcast(stillThere);
}

httpServer.listen(PORT, () => {
  console.log(`Black Box server listening on http://localhost:${PORT}`);
});
