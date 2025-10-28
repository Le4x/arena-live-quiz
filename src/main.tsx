import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// WebSocket connection will be initialized by individual pages with appropriate roles
const WS_URL = import.meta.env.VITE_WS_URL;
if (WS_URL) {
  console.log(`🔌 WebSocket URL configured: ${WS_URL}`);
}

createRoot(document.getElementById("root")!).render(<App />);
