// Shows the clues that have been revealed so far. Locked slots show "?".
export default function ClueGrid({ clues = [], total = 0 }) {
  const lockedCount = Math.max(0, total - clues.length);
  return (
    <div className="cluewrap">
      <div className="cluehead">
        Clues <span>{clues.length}/{total}</span>
      </div>
      <div className="cluegrid">
        {clues.map((clue, i) => (
          <Clue key={i} clue={clue} />
        ))}
        {Array.from({ length: lockedCount }).map((_, i) => (
          <div key={`l${i}`} className="clue locked">
            <div className="cluelabel">Locked</div>
            <div className="cluebody">🔒</div>
            <div className="cluehint">unlocks as time runs</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Clue({ clue }) {
  return (
    <div className="clue">
      <div className="cluelabel">{clue.label || clue.type}</div>
      <div className="cluebody">
        {clue.type === "images" ? (
          <div className="emojirow">
            {clue.payload.map((e, i) => (
              <span key={i} className="clueimg">
                {e}
              </span>
            ))}
          </div>
        ) : clue.type === "word" ? (
          <span className="clueword">{clue.payload}</span>
        ) : (
          <span className="cluetext">{clue.payload}</span>
        )}
      </div>
    </div>
  );
}
