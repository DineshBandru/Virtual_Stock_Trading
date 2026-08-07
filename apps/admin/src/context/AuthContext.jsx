import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";

export const AuthContext = createContext(null);

let restoreSessionPromise = null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      if (!restoreSessionPromise) {
        restoreSessionPromise = api.get("/api/auth/me").finally(() => {
          restoreSessionPromise = null;
        });
      }
      const response = await restoreSessionPromise;
      setUser(response.data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setLoading(false);
    };

    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, []);

  const login = async (payload) => {
    const response = await api.post("/api/auth/login", payload);
    setUser(response.data);
    return response.data;
  };

  const register = async (payload) => {
    const response = await api.post("/api/auth/register", payload);
    setUser(response.data);
    return response.data;
  };

  const logout = async () => {
    await api.post("/api/auth/logout", null, { skipAuthRefresh: true }).catch(() => {});
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh: fetchMe }),
    [user, loading, fetchMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
