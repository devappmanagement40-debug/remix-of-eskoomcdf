import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error handlers to prevent silent crashes
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
  // Prevent the error from bubbling and crashing the page
  event.preventDefault();
});
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  // Prevent unhandled promise rejections from crashing the app
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);
