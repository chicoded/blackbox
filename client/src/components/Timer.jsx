export default function Timer({ timeLeft = 0, total = 60 }) {
  const pct = Math.max(0, Math.min(100, (timeLeft / total) * 100));
  const danger = timeLeft <= 10;
  return (
    <div className="timer">
      <div className="timerbar">
        <div
          className={`timerfill ${danger ? "danger" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`timernum ${danger ? "danger" : ""}`}>{timeLeft}s</div>
    </div>
  );
}
