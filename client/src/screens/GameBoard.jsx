import { actions, useStore } from "../net/store.js";
import { PHASE } from "../net/protocol.js";
import MaskedWord from "../components/MaskedWord.jsx";
import ClueGrid from "../components/ClueGrid.jsx";
import Timer from "../components/Timer.jsx";
import GuessInput from "../components/GuessInput.jsx";
import PlayerList from "../components/PlayerList.jsx";
import RevealOverlay from "../components/RevealOverlay.jsx";

export default function GameBoard() {
  const { room, you } = useStore();
  const r = room.round;
  if (!r) return null;

  const isHost = room.hostId === you;
  const me = room.players.find((p) => p.id === you);
  const starting = room.phase === PHASE.STARTING;
  const revealing = [PHASE.REVEAL, PHASE.SCORING, PHASE.ROUND_END].includes(room.phase);

  return (
    <div className="board">
      <div className="boardmain card">
        <div className="boardhead">
          <div className="character">
            <span className="cemoji">{r.character?.emoji}</span>
            <div>
              <div className="cname">{r.character?.name}</div>
              <div className="ctitle">{r.title}</div>
            </div>
          </div>
          <div className="roundpill">
            Round {r.index}/{r.totalRounds}
          </div>
        </div>

        <p className="intro">{r.intro}</p>

        <MaskedWord word={r.maskedWord} length={r.wordLength} />

        <Timer timeLeft={r.timeLeftSec} total={r.durationSec} />

        <ClueGrid clues={r.clues} total={r.totalClues} />

        {!revealing && (
          <GuessInput
            disabled={starting || me?.lastGuessCorrect}
            solved={me?.lastGuessCorrect}
            onGuess={actions.submitGuess}
          />
        )}
      </div>

      <div className="card sidebar">
        <PlayerList scoreboard />
        {isHost && revealing && (
          <button className="btn primary" onClick={actions.nextRound}>
            Next round →
          </button>
        )}
        <button className="btn ghost" onClick={actions.leave}>
          Leave
        </button>
      </div>

      {starting && <CountdownOverlay character={r.character} intro={r.intro} />}
      {revealing && <RevealOverlay room={room} />}
    </div>
  );
}

function CountdownOverlay({ character, intro }) {
  return (
    <div className="overlay">
      <div className="overlaycard">
        <div className="bigemoji">{character?.emoji}</div>
        <p className="introbig">{intro}</p>
        <div className="getready">Get ready…</div>
      </div>
    </div>
  );
}
