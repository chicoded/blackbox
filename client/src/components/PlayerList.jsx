import { useStore } from "../net/store.js";

export default function PlayerList({ scoreboard }) {
  const { room, you } = useStore();
  const players = [...room.players];
  if (scoreboard) players.sort((a, b) => b.score - a.score);

  return (
    <div className="playerlist">
      <div className="plhead">
        {scoreboard ? "Scoreboard" : `Players (${players.length})`}
      </div>
      {players.map((p) => (
        <div key={p.id} className={`plrow ${p.id === you ? "me" : ""}`}>
          <span className="status">
            {p.lastGuessCorrect ? "✅" : p.id === room.hostId ? "👑" : "•"}
          </span>
          <span className="pname">
            {p.name}
            {room.settings.teamMode && p.teamId != null && (
              <em className={`teamtag t${p.teamId}`}>{p.teamId === 0 ? "A" : "B"}</em>
            )}
          </span>
          <span className="pscore">{p.score}</span>
        </div>
      ))}
    </div>
  );
}
