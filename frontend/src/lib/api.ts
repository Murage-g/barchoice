// lib/api.ts
import axios from "axios";
import { getToken } from "@/utils/storage";

const api = axios.create({ baseURL: "/api", // 👈 hard-coded backend URL 
withCredentials: true, });


api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
