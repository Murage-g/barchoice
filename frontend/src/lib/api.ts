// lib/api.ts
import axios from "axios";
import { getToken } from "@/utils/storage";

const BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "https://barpos-backend-l4w0.onrender.com")
    .replace(/\/$/, ""); // remove trailing slash


const api = axios.create({
  baseURL: BASE_URL,
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
