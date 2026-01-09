import { createRoot } from "react-dom/client";
import App from "./App";
import AMCApp from "./AMCApp";
import "./index.css";

const hostname = window.location.hostname;

let CustomerApp=false;

if (hostname.startsWith("customer.")) CustomerApp = true;

const AppToRender = CustomerApp ? <AMCApp /> : <App />;

createRoot(document.getElementById("root")!).render(AppToRender);
