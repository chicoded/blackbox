// Black Box - shared protocol between client and server.
// NOTE: client/src/net/protocol.js is a copy of this file. Keep them in sync.

// Socket.IO event names.
export const EV = {
  // client -> server
  CREATE_ROOM: "create_room",
  JOIN_ROOM: "join_room",
  UPDATE_SETTINGS: "update_settings",
  START_GAME: "start_game",
  SUBMIT_GUESS: "submit_guess",
  NEXT_ROUND: "next_round",
  LEAVE_ROOM: "leave_room",

  // server -> client
  ROOM_UPDATE: "room_update",
  ROUND_START: "round_start",
  CLUE_REVEAL: "clue_reveal",
  TIMER_TICK: "timer_tick",
  GUESS_RESULT: "guess_result",
  ROUND_REVEAL: "round_reveal",
  GAME_OVER: "game_over",
  ERROR: "error_msg",
};

// Room/round lifecycle phases (the state machine).
export const PHASE = {
  LOBBY: "LOBBY",
  STARTING: "STARTING",
  PLAYING: "PLAYING",
  REVEAL: "REVEAL",
  SCORING: "SCORING",
  ROUND_END: "ROUND_END",
  GAME_OVER: "GAME_OVER",
};

// Default room settings.
export const DEFAULT_SETTINGS = {
  modeId: "seedPhrase",
  roundTimeSec: 60,
  maxPlayers: 8,
  teamMode: false,
  consensus: false,
  rounds: 5,
};
