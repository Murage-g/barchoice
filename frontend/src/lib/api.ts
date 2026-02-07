// lib/api.ts
import axios from "axios";
import { getToken } from "@/utils/storage";

const API_BASE_URL =
  typeof window !== "undefined" &&
  window.location.hostname.includes("onrender.com")
    ? "https://barpos-backend-l4w0.onrender.com"
    : "http://localhost:5000";


const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});


api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
