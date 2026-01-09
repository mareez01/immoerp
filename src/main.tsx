import { createRoot } from "react-dom/client";
import App from "./App";
import AMCApp from "./AMCApp";
import "./index.css";

const hostname = window.location.hostname;

let CustomerApp;

if (hostname.startsWith("customer.")) CustomerApp = true

const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error("Root element not found");
}

createRoot(rootEl).render(<RootApp />);
