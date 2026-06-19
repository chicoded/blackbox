import { useState } from "react";

export default function GuessInput({ onGuess, disabled, solved }) {
  const [text, setText] = useState("");

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onGuess(t);
    setText("");
  };

  if (solved) {
    return <div className="guesssolved">✅ You got it! Sit tight for the reveal.</div>;
  }

  return (
    <div className="guessrow">
      <input
        className="guessinput"
        value={text}
        disabled={disabled}
        placeholder={disabled ? "Waiting…" : "Type your guess…"}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        autoFocus
      />
      <button className="btn primary" disabled={disabled || !text.trim()} onClick={submit}>
        Guess
      </button>
    </div>
  );
}
