import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

console.log("🚀 React app starting...");

const container = document.getElementById("root");
console.log("Root container:", container);

if (!container) {
  console.error("❌ Could not find root element!");
} else {
  const root = createRoot(container);
  console.log("✅ Root created");

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("✅ App rendered");
}
