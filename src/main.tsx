import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { registerSW } from "virtual:pwa-register";

// Register service worker using VitePWA's virtual module
// This enables automatic updates and proper background notification support
registerSW({
  onNeedRefresh() {
    // Optional: prompt user to refresh for new version
    console.log("New content available, refresh to update.");
  },
  onOfflineReady() {
    console.log("App ready to work offline.");
  },
  onRegistered(registration: ServiceWorkerRegistration | undefined) {
    console.log("Service Worker registered:", registration);
  },
  onRegisterError(error: Error) {
    console.error("Service Worker registration error:", error);
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
