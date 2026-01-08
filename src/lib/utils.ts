import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format AMC ID for display
 * Uses amc_number if available, otherwise formats UUID with AMC- prefix
 */
export function formatAmcId(amcNumber?: string | null, amcFormId?: string | null): string {
  if (amcNumber) {
    // If already has AMC- prefix, return as is
    if (amcNumber.startsWith('AMC-')) {
      return amcNumber;
    }
    return `AMC-${amcNumber.substring(0, 8).toUpperCase()}`;
  }
  if (amcFormId) {
    return `AMC-${amcFormId.substring(0, 8).toUpperCase()}`;
  }
  return 'N/A';
}
