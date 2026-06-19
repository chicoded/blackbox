import { actions, useStore } from "../net/store.js";

export default function Results() {
  const { room, you } = useStore();
  const isHost = room.hostId === you;
  const winner = room.winner;
  const sorted = [...room.players].sort((a, b) => b.score - a.score);

  let headline = "Game over";
  if (winner?.type === "player") {
    headline = winner.id === you ? "🏆 You win!" : `🏆 ${winner.name} wins!`;
  } else if (winner?.type === "team") {
    headline = `🏆 Team ${winner.teamId === 0 ? "A" : "B"} wins!`;
  } else if (winner?.type === "tie") {
    headline = "🤝 It's a tie!";
  }

  return (
    <div className="results card">
      <h1 className="title">{headline}</h1>
      <div className="finalboard">
        {sorted.map((p, i) => (
          <div key={p.id} className={`finalrow ${p.id === you ? "me" : ""}`}>
            <span className="rank">{["🥇", "🥈", "🥉"][i] || `#${i + 1}`}</span>
            <span className="pname">
              {p.name}
              {room.settings.teamMode && (
                <em className={`teamtag t${p.teamId}`}>
                  {p.teamId === 0 ? "A" : "B"}
                </em>
              )}
            </span>
            <span className="pscore">{p.score}</span>
          </div>
        ))}
      </div>

      {isHost ? (
        <button className="btn primary big" onClick={actions.startGame}>
          Play again
        </button>
      ) : (
        <div className="waiting">Waiting for host to restart…</div>
      )}
      <button className="btn ghost" onClick={actions.leave}>
        Back to home
      </button>
    </div>
  );
}
