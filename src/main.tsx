import { createRoot } from "react-dom/client";
import App from "./App";
import AMCApp from "./AMCApp";
import "./index.css";

const hostname = window.location.hostname;
const searchParams = new URLSearchParams(window.location.search);

/**
 * Subdomain-based routing:
 * - customer.flsmartech.com → Customer Portal (AMCApp) - order creation and management
 * - portal.flsmartech.com → Staff/Admin Panel (App)
 * - localhost with ?portal=customer → Customer Portal (for testing)
 * - localhost with ?portal=staff or default → Staff Panel (for testing)
 */
const isCustomerPortal = 
  hostname.includes('customer.flsmartech.com') || 
  hostname.startsWith('customer.') ||
  searchParams.get('portal') === 'customer';

// Staff portal as default, customer portal for customer subdomain
const AppToRender = isCustomerPortal ? <AMCApp /> : <App />;

createRoot(document.getElementById("root")!).render(AppToRender);
