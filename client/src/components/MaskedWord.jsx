// Renders the masked target like )@lf_+%, one tile per character.
export default function MaskedWord({ word, length }) {
  const chars = [...(word || "")];
  return (
    <div className="maskedword" aria-label="masked word">
      {chars.map((c, i) => {
        const isLetter = /[a-z0-9]/i.test(c);
        return (
          <span key={i} className={`tile ${isLetter ? "revealed" : "hidden"}`}>
            {c === " " ? "\u00A0" : c}
          </span>
        );
      })}
      {length ? <span className="wordlen">{length} chars</span> : null}
    </div>
  );
}
