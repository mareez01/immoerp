import { createRoot } from "react-dom/client";
import App from "./App";
import AMCApp from "./AMCApp";
import "./index.css";

const hostname = window.location.hostname;

let RootApp;

if (hostname.startsWith("customer.")) {
  RootApp = AMCApp;
} else if (hostname.startsWith("portal.")) {
  RootApp = App;
} else {
  // fallback (localhost / unknown)
  RootApp = App;
}

const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error("Root element not found");
}

createRoot(rootEl).render(<RootApp />);
