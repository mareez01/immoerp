import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import AMCApp from "./AMCApp.tsx";

// Determine which app to load based on hostname
const hostname = window.location.hostname;
// const isAMCForm = hostname.includes('amc-form') || hostname === 'localhost:5173'; // localhost for testing
const isAMCForm = false;

const AppToRender = isAMCForm ? <AMCApp />:<App />;

createRoot(document.getElementById("root")!).render(AppToRender);
