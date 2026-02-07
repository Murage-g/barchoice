// utils/api.ts

// Decide backend URL based on environment (Render vs local)
export const API_BASE_URL =
  typeof window !== "undefined" &&
  window.location.hostname.includes("onrender.com")
    ? "https://barpos-backend-sur2.onrender.com"
    : "http://localhost:5000";

// Normalize endpoint + base URL and make request
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Ensure we don’t end up with double slashes
  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Invalid JSON response from ${url}: ${text || "Empty response"}`
    );
  }
};
