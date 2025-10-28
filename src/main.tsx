import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { connectRealtime } from "./lib/realtime";

// Connexion au serveur WebSocket local au démarrage
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
console.log(`🔌 Initialisation connexion WebSocket: ${WS_URL}`);
connectRealtime(WS_URL);

createRoot(document.getElementById("root")!).render(<App />);
