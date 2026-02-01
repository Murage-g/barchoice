// lib/api.ts
import axios from "axios";
import { getToken } from "@/utils/storage";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // 👈 dynamic backend URL
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
