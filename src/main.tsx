import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import AMCApp from "./AMCApp.tsx";

// Determine which app to load based on hostname
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


const isStaffPortal = 
  hostname.includes('portal.flsmartech.com') || 
  hostname.startsWith('portal.') ||
  searchParams.get('portal') === 'staff' ||
  (!isCustomerPortal && hostname === 'localhost'); // Default localhost to staff

// Staff portal as default, customer portal for customer subdomain
const AppToRender = isCustomerPortal ? <AMCApp /> : <App />;

createRoot(document.getElementById("root")!).render(AppToRender);
