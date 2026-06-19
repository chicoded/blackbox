// Owns all rooms + players. Also produces the "sanitized" room view that is
// safe to send to clients (the answer is stripped until the reveal phase).
import { PHASE, DEFAULT_SETTINGS } from "../shared/events.js";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no easily-confused chars

function makeCode() {
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // code -> room
    this.socketToCode = new Map(); // socketId -> code
  }

  createRoom(hostId, hostName) {
    let code = makeCode();
    while (this.rooms.has(code)) code = makeCode();

    const room = {
      code,
      hostId,
      phase: PHASE.LOBBY,
      settings: { ...DEFAULT_SETTINGS },
      players: [],
      usedAnswers: [],
      round: null,
      engine: null,
    };
    this.rooms.set(code, room);
    this.addPlayer(room, hostId, hostName);
    return room;
  }

  getRoom(code) {
    return this.rooms.get((code || "").toUpperCase());
  }

  getRoomBySocket(socketId) {
    const code = this.socketToCode.get(socketId);
    return code ? this.rooms.get(code) : undefined;
  }

  addPlayer(room, socketId, name) {
    const teamId = room.settings.teamMode ? room.players.length % 2 : null;
    const player = {
      id: socketId,
      name: (name || "Player").slice(0, 16),
      teamId,
      score: 0,
      connected: true,
      hasGuessed: false,
      lastGuessCorrect: false,
      solveTimeLeft: 0,
    };
    room.players.push(player);
    this.socketToCode.set(socketId, room.code);
    return player;
  }

  removePlayer(socketId) {
    const room = this.getRoomBySocket(socketId);
    this.socketToCode.delete(socketId);
    if (!room) return undefined;

    room.players = room.players.filter((p) => p.id !== socketId);

    if (room.players.length === 0) {
      room.engine?.stop();
      this.rooms.delete(room.code);
      return undefined;
    }
    // Reassign host if needed.
    if (room.hostId === socketId) {
      room.hostId = room.players[0].id;
    }
    return room;
  }

  getPlayer(room, socketId) {
    return room?.players.find((p) => p.id === socketId);
  }

  // Public view of the room that is safe to broadcast.
  sanitize(room) {
    const revealed = [
      PHASE.REVEAL,
      PHASE.SCORING,
      PHASE.ROUND_END,
      PHASE.GAME_OVER,
    ].includes(room.phase);

    let round = null;
    if (room.round) {
      const r = room.round;
      round = {
        index: r.index,
        totalRounds: room.settings.rounds,
        modeId: r.modeId,
        title: r.title,
        character: r.character,
        intro: r.intro,
        maskedWord: r.maskedWord,
        wordLength: [...r.answer].length,
        clues: r.clues.slice(0, r.cluesRevealed),
        cluesRevealed: r.cluesRevealed,
        totalClues: r.clues.length,
        durationSec: r.durationSec,
        timeLeftSec: r.timeLeftSec,
        // only at reveal:
        answer: revealed ? r.answer : undefined,
        hint: revealed ? r.hint : undefined,
        result: revealed ? r.result : undefined,
      };
    }

    return {
      code: room.code,
      hostId: room.hostId,
      phase: room.phase,
      settings: room.settings,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        teamId: p.teamId,
        score: p.score,
        connected: p.connected,
        hasGuessed: p.hasGuessed,
        lastGuessCorrect: p.lastGuessCorrect,
      })),
      round,
      winner: room.winner ?? null,
    };
  }
}
