import { createContext, useCallback, useMemo, useState } from "react";

export const ToastContext = createContext(null);

const buildToast = (message, tone = "info", key) => ({
  id: key || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  key: key || `${tone}:${message}`,
  message,
  tone
});

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((message, tone = "info", options = {}) => {
    const toast = buildToast(message, tone, options.id);
    setToasts((prev) => {
      if (prev.some((item) => item.key === toast.key)) {
        return prev;
      }
      return [toast, ...prev].slice(0, 4);
    });
    setTimeout(() => remove(toast.id), 4000);
  }, [remove]);

  const value = useMemo(() => ({ toasts, push, pushToast: push, remove }), [toasts, push, remove]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};
