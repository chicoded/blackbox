// Tiny external store wired to the Socket.IO connection.
// Components read it via useStore() (useSyncExternalStore).
import { io } from "socket.io-client";
import { useSyncExternalStore } from "react";
import { EV } from "./protocol.js";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || `http://${location.hostname}:3001`;

let state = {
  connected: false,
  you: null, // our socket id
  code: null, // room code we're in
  room: null, // sanitized room from server
  modes: [],
  error: null,
  toast: null, // { text, kind } transient guess feedback
};

const listeners = new Set();

function set(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const socket = io(SERVER_URL, { autoConnect: true });

socket.on("connect", () => set({ connected: true, you: socket.id }));
socket.on("disconnect", () => set({ connected: false }));
socket.on("modes", (modes) => set({ modes }));

socket.on(EV.ROOM_UPDATE, (room) => set({ room, code: room?.code ?? null }));

socket.on(EV.GUESS_RESULT, ({ name, correct, playerId }) => {
  const mine = playerId === state.you;
  const text = correct
    ? `${mine ? "You" : name} guessed it! 🎉`
    : mine
    ? "Not quite — try again!"
    : null;
  if (text) flashToast({ text, kind: correct ? "good" : "bad" });
});

let toastTimer = null;
function flashToast(toast) {
  set({ toast });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => set({ toast: null }), 2200);
}

// ---- store hook ----
function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return state;
}
export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// ---- actions ----
export const actions = {
  createRoom(name) {
    return new Promise((resolve) => {
      socket.emit(EV.CREATE_ROOM, { name }, (res) => {
        if (!res?.ok) set({ error: res?.error || "Could not create room." });
        else set({ error: null });
        resolve(res);
      });
    });
  },
  joinRoom(code, name) {
    return new Promise((resolve) => {
      socket.emit(EV.JOIN_ROOM, { code, name }, (res) => {
        if (!res?.ok) set({ error: res?.error || "Could not join room." });
        else set({ error: null });
        resolve(res);
      });
    });
  },
  updateSettings(settings) {
    socket.emit(EV.UPDATE_SETTINGS, settings);
  },
  startGame() {
    socket.emit(EV.START_GAME);
  },
  submitGuess(text) {
    socket.emit(EV.SUBMIT_GUESS, { text });
  },
  nextRound() {
    socket.emit(EV.NEXT_ROUND);
  },
  leave() {
    socket.emit(EV.LEAVE_ROOM);
    set({ room: null, code: null });
  },
  clearError() {
    set({ error: null });
  },
};
