import axios from "axios";

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) return "http://localhost:5500";
  throw new Error("VITE_API_URL must be configured for production builds");
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true
});

let refreshPromise = null;

const isAuthEndpoint = (url = "") =>
  url.includes("/api/auth/login") ||
  url.includes("/api/auth/logout") ||
  url.includes("/api/auth/refresh");

const notifySessionExpired = () => {
  window.dispatchEvent(new CustomEvent("auth:session-expired"));
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.skipAuthRefresh ||
      isAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = api
          .post("/api/auth/refresh", null, { skipAuthRefresh: true })
          .finally(() => {
            refreshPromise = null;
          });
      }

      await refreshPromise;
      return api(originalRequest);
    } catch (refreshError) {
      notifySessionExpired();
      return Promise.reject(refreshError);
    }
  }
);

export default api;
