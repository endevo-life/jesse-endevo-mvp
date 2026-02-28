// Guard: if the env var is missing the protocol (e.g. set without https://)
// the browser treats it as a relative path — always enforce absolute URL.
const raw = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_BASE_URL = raw.startsWith("http") ? raw : `https://${raw}`;

export const API_ENDPOINTS = {
  assess: `${API_BASE_URL}/api/assess`,
};
