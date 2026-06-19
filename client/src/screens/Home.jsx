import { useState } from "react";
import { actions, useStore } from "../net/store.js";

export default function Home() {
  const { error, connected } = useStore();
  const [name, setName] = useState(() => localStorage.getItem("bb_name") || "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const saveName = (n) => {
    setName(n);
    localStorage.setItem("bb_name", n);
  };

  const create = async () => {
    setBusy(true);
    await actions.createRoom(name || "Host");
    setBusy(false);
  };

  const join = async () => {
    if (code.trim().length < 4) return;
    setBusy(true);
    await actions.joinRoom(code.trim().toUpperCase(), name || "Player");
    setBusy(false);
  };

  return (
    <div className="home card">
      <h1 className="title">
        🕳️ BLACK BOX
      </h1>
      <p className="subtitle">
        Crack the masked word. Read the clues. Out-guess the room.
      </p>

      <label className="field">
        <span>Your name</span>
        <input
          value={name}
          maxLength={16}
          placeholder="e.g. Neo"
          onChange={(e) => saveName(e.target.value)}
        />
      </label>

      <button className="btn primary big" disabled={busy || !connected} onClick={create}>
        Create a Room
      </button>

      <div className="divider"><span>or join one</span></div>

      <div className="joinrow">
        <input
          className="codeinput"
          value={code}
          placeholder="CODE"
          maxLength={4}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && join()}
        />
        <button className="btn" disabled={busy || !connected || code.length < 4} onClick={join}>
          Join
        </button>
      </div>

      {error && <div className="error">{error}</div>}
    </div>
  );
}
