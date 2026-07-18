import { createContext, useCallback, useMemo, useState } from "react";

export const ToastContext = createContext(null);

const buildToast = (message, tone = "info") => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  message,
  tone
});

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((message, tone) => {
    const toast = buildToast(message, tone);
    setToasts((prev) => [toast, ...prev]);
    setTimeout(() => remove(toast.id), 4000);
  }, [remove]);

  const value = useMemo(() => ({ toasts, push, pushToast: push, remove }), [toasts, push, remove]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};
