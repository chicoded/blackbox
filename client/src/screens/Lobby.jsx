import { actions, useStore } from "../net/store.js";
import PlayerList from "../components/PlayerList.jsx";

export default function Lobby() {
  const { room, you, modes } = useStore();
  const isHost = room.hostId === you;
  const s = room.settings;

  const set = (patch) => isHost && actions.updateSettings(patch);

  return (
    <div className="lobby">
      <div className="card">
        <div className="roomcode">
          <span className="label">ROOM CODE</span>
          <span className="code">{room.code}</span>
          <button
            className="btn tiny"
            onClick={() => navigator.clipboard?.writeText(room.code)}
          >
            copy
          </button>
        </div>

        <h3 className="section">Choose a Black Box</h3>
        <div className="modegrid">
          {modes.map((m) => (
            <button
              key={m.id}
              className={`modecard ${s.modeId === m.id ? "active" : ""} ${
                isHost ? "" : "locked"
              }`}
              onClick={() => set({ modeId: m.id })}
            >
              <div className="emoji">{m.character?.emoji}</div>
              <div className="mtitle">{m.title}</div>
              <div className="mchar">{m.character?.name}</div>
            </button>
          ))}
        </div>

        <h3 className="section">Settings</h3>
        <div className="settings">
          <Setting label={`Round time: ${s.roundTimeSec}s`}>
            <input
              type="range"
              min="15"
              max="120"
              step="5"
              value={s.roundTimeSec}
              disabled={!isHost}
              onChange={(e) => set({ roundTimeSec: +e.target.value })}
            />
          </Setting>
          <Setting label={`Rounds: ${s.rounds}`}>
            <input
              type="range"
              min="1"
              max="10"
              value={s.rounds}
              disabled={!isHost}
              onChange={(e) => set({ rounds: +e.target.value })}
            />
          </Setting>
          <Setting label={`Max players: ${s.maxPlayers}`}>
            <input
              type="range"
              min="2"
              max="12"
              value={s.maxPlayers}
              disabled={!isHost}
              onChange={(e) => set({ maxPlayers: +e.target.value })}
            />
          </Setting>
          <div className="toggles">
            <label className={`toggle ${!isHost ? "locked" : ""}`}>
              <input
                type="checkbox"
                checked={s.teamMode}
                disabled={!isHost}
                onChange={(e) => set({ teamMode: e.target.checked })}
              />
              <span>2-Team mode</span>
            </label>
            <label className={`toggle ${!isHost ? "locked" : ""}`}>
              <input
                type="checkbox"
                checked={s.consensus}
                disabled={!isHost}
                onChange={(e) => set({ consensus: e.target.checked })}
              />
              <span>Consensus (everyone must agree)</span>
            </label>
          </div>
        </div>
      </div>

      <div className="card sidebar">
        <PlayerList />
        {isHost ? (
          <button
            className="btn primary big"
            disabled={room.players.length < 1}
            onClick={actions.startGame}
          >
            Start Game
          </button>
        ) : (
          <div className="waiting">Waiting for host to start…</div>
        )}
        <button className="btn ghost" onClick={actions.leave}>
          Leave room
        </button>
      </div>
    </div>
  );
}

function Setting({ label, children }) {
  return (
    <div className="setting">
      <span className="slabel">{label}</span>
      {children}
    </div>
  );
}
