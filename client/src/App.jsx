import { useStore } from "./net/store.js";
import { PHASE } from "./net/protocol.js";
import Home from "./screens/Home.jsx";
import Lobby from "./screens/Lobby.jsx";
import GameBoard from "./screens/GameBoard.jsx";
import Results from "./screens/Results.jsx";
import Toast from "./components/Toast.jsx";

export default function App() {
  const { room, connected } = useStore();

  let screen;
  if (!room) {
    screen = <Home />;
  } else if (room.phase === PHASE.LOBBY) {
    screen = <Lobby />;
  } else if (room.phase === PHASE.GAME_OVER) {
    screen = <Results />;
  } else {
    screen = <GameBoard />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          BLACK<span>BOX</span>
        </div>
        <div className={`conn ${connected ? "on" : "off"}`}>
          {connected ? "online" : "connecting…"}
        </div>
      </header>
      <main className="stage">{screen}</main>
      <Toast />
    </div>
  );
}
