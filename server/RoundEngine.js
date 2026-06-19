// The round state machine: STARTING -> PLAYING -> REVEAL -> ROUND_END -> (loop|GAME_OVER).
// One engine instance per room. It mutates room state and calls broadcast()
// whenever clients need a fresh view.
import { PHASE, EV } from "../shared/events.js";
import { getMode } from "./ModeRegistry.js";
import { buildMask, renderMask, revealCountForProgress } from "./util/mask.js";

const COUNTDOWN_MS = 3000; // "3..2..1" before a round
const REVEAL_HOLD_MS = 6000; // how long the answer/scoreboard stays up
const TICK_MS = 1000;

export class RoundEngine {
  constructor(io, room, broadcast) {
    this.io = io;
    this.room = room;
    this.broadcast = broadcast; // () => emit sanitized room to everyone
    this.tickTimer = null;
    this.phaseTimer = null;
  }

  stop() {
    clearInterval(this.tickTimer);
    clearTimeout(this.phaseTimer);
    this.tickTimer = null;
    this.phaseTimer = null;
  }

  startGame() {
    const room = this.room;
    room.usedAnswers = [];
    room.players.forEach((p) => (p.score = 0));
    this._startRound(1);
  }

  _startRound(index) {
    const room = this.room;
    const mode = getMode(room.settings.modeId);
    const puzzle = mode.createRound(room.usedAnswers);
    room.usedAnswers.push(puzzle.answer);

    const mask = buildMask(puzzle.answer, { keepFirst: mode.maskStyle === "soft" });
    const durationSec = room.settings.roundTimeSec;

    room.round = {
      index,
      modeId: mode.id,
      title: mode.title,
      character: mode.character,
      intro: mode.intro,
      answer: puzzle.answer,
      hint: puzzle.hint,
      clues: puzzle.clues,
      mask,
      maskedWord: renderMask(puzzle.answer, mask, revealCountForProgress(mask, 0)),
      cluesRevealed: 1, // first clue is shown immediately
      guesses: [],
      durationSec,
      durationMs: durationSec * 1000,
      timeLeftSec: durationSec,
      startedAt: null,
      endsAt: null,
      result: null,
    };

    // reset per-round player flags
    room.players.forEach((p) => {
      p.hasGuessed = false;
      p.lastGuessCorrect = false;
      p.solveTimeLeft = 0;
    });

    room.phase = PHASE.STARTING;
    this.broadcast();

    // countdown, then go live
    this.phaseTimer = setTimeout(() => this._beginPlaying(), COUNTDOWN_MS);
  }

  _beginPlaying() {
    const room = this.room;
    const r = room.round;
    if (!r) return;
    r.startedAt = Date.now();
    r.endsAt = r.startedAt + r.durationMs;
    room.phase = PHASE.PLAYING;
    this.broadcast();

    this.tickTimer = setInterval(() => this._tick(), TICK_MS);
  }

  _tick() {
    const room = this.room;
    const r = room.round;
    if (!r || room.phase !== PHASE.PLAYING) return;

    const now = Date.now();
    const elapsed = now - r.startedAt;
    const progress = Math.min(1, elapsed / r.durationMs);
    r.timeLeftSec = Math.max(0, Math.ceil((r.endsAt - now) / 1000));

    // progressively un-mask letters
    r.maskedWord = renderMask(r.answer, r.mask, revealCountForProgress(r.mask, progress));

    // drip clues: reveal clue i once progress passes i / totalClues
    const target = Math.min(r.clues.length, Math.floor(progress * r.clues.length) + 1);
    if (target > r.cluesRevealed) r.cluesRevealed = target;

    this.broadcast();

    if (r.timeLeftSec <= 0) this._reveal();
  }

  submitGuess(playerId, text) {
    const room = this.room;
    const r = room.round;
    if (!r || room.phase !== PHASE.PLAYING) return { ok: false };

    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.lastGuessCorrect) return { ok: false };

    const mode = getMode(r.modeId);
    const correct = mode.checkGuess(text, r.answer);
    r.guesses.push({ playerId, text, correct, at: Date.now() });

    if (correct) {
      const timeLeftMs = Math.max(0, r.endsAt - Date.now());
      const speedBonus = Math.floor((timeLeftMs / r.durationMs) * 1000);
      player.score += 200 + speedBonus; // base + speed
      player.hasGuessed = true;
      player.lastGuessCorrect = true;
      player.solveTimeLeft = r.timeLeftSec;
      this.broadcast();
      this._maybeEndEarly();
    } else {
      player.hasGuessed = true; // they used their guess this tick (still can retry)
    }

    return { ok: true, correct };
  }

  _maybeEndEarly() {
    const room = this.room;
    const active = room.players.filter((p) => p.connected);
    if (active.length > 0 && active.every((p) => p.lastGuessCorrect)) {
      this._reveal();
    }
  }

  _reveal() {
    clearInterval(this.tickTimer);
    this.tickTimer = null;

    const room = this.room;
    const r = room.round;
    if (!r) return;

    r.maskedWord = r.answer; // fully unmasked
    r.timeLeftSec = 0;
    r.result = this._scoreRound();
    room.phase = PHASE.REVEAL;
    this.broadcast();

    const isLast = r.index >= room.settings.rounds;
    this.phaseTimer = setTimeout(() => {
      if (isLast) this._gameOver();
      else this._startRound(r.index + 1);
    }, REVEAL_HOLD_MS);
  }

  // advance immediately (host pressed "next")
  forceNext() {
    const room = this.room;
    const r = room.round;
    if (!r) return;
    if (room.phase === PHASE.REVEAL) {
      clearTimeout(this.phaseTimer);
      if (r.index >= room.settings.rounds) this._gameOver();
      else this._startRound(r.index + 1);
    }
  }

  _scoreRound() {
    const room = this.room;
    const r = room.round;
    const solvers = room.players
      .filter((p) => p.lastGuessCorrect)
      .map((p) => ({ id: p.id, name: p.name, timeLeft: p.solveTimeLeft }));

    let winningTeam = null;
    if (room.settings.teamMode) {
      const teamSolved = { 0: false, 1: false };
      room.players.forEach((p) => {
        if (p.lastGuessCorrect && p.teamId != null) teamSolved[p.teamId] = true;
      });
      if (teamSolved[0] && !teamSolved[1]) winningTeam = 0;
      else if (teamSolved[1] && !teamSolved[0]) winningTeam = 1;
    }

    let consensusWin = null;
    if (room.settings.consensus) {
      const active = room.players.filter((p) => p.connected);
      consensusWin = active.length > 0 && active.every((p) => p.lastGuessCorrect);
    }

    return {
      answer: r.answer,
      solvers,
      winningTeam,
      consensusWin,
    };
  }

  _gameOver() {
    const room = this.room;
    room.phase = PHASE.GAME_OVER;

    let winner = null;
    if (room.settings.teamMode) {
      const totals = { 0: 0, 1: 0 };
      room.players.forEach((p) => {
        if (p.teamId != null) totals[p.teamId] += p.score;
      });
      winner =
        totals[0] === totals[1]
          ? { type: "tie" }
          : { type: "team", teamId: totals[0] > totals[1] ? 0 : 1, totals };
    } else {
      const sorted = [...room.players].sort((a, b) => b.score - a.score);
      winner = sorted.length ? { type: "player", id: sorted[0].id, name: sorted[0].name } : null;
    }

    room.round = room.round
      ? { ...room.round, maskedWord: room.round.answer, timeLeftSec: 0 }
      : null;
    room.winner = winner;
    this.broadcast();
  }
}
