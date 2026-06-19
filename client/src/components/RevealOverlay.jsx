// Shown when the round ends: the answer + who solved it.
export default function RevealOverlay({ room }) {
  const r = room.round;
  const result = r?.result;
  if (!result) return null;

  const solvers = result.solvers || [];

  return (
    <div className="overlay">
      <div className="overlaycard reveal">
        <div className="reveallabel">The answer was</div>
        <div className="revealword">{result.answer?.toUpperCase()}</div>
        {r.hint && <div className="revealhint">{r.hint}</div>}

        {room.settings.consensus && (
          <div className={`consensus ${result.consensusWin ? "win" : "lose"}`}>
            {result.consensusWin
              ? "✅ Consensus reached — the room wins!"
              : "❌ No consensus — the room loses this round."}
          </div>
        )}

        {result.winningTeam != null && (
          <div className="teamwin">
            🏆 Team {result.winningTeam === 0 ? "A" : "B"} takes the round!
          </div>
        )}

        <div className="solvers">
          {solvers.length ? (
            <>
              <div className="solvershead">Solved by</div>
              {solvers.map((s) => (
                <div key={s.id} className="solverrow">
                  <span>{s.name}</span>
                  <span className="solvet">{s.timeLeft}s left</span>
                </div>
              ))}
            </>
          ) : (
            <div className="nobody">Nobody cracked it! 🫥</div>
          )}
        </div>
      </div>
    </div>
  );
}
