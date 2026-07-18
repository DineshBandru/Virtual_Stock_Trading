import useToast from "../hooks/useToast";

const toneStyles = {
  success: "border-cyan/60 text-cyan",
  error: "border-red-400/60 text-red-300",
  info: "border-borderGlow/60 text-slate-200"
};

const ToastContainer = () => {
  const { toasts, remove } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-6 top-6 z-50 flex w-[280px] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-2xl border bg-panel/90 px-4 py-3 text-xs shadow-glow ${
            toneStyles[toast.tone] || toneStyles.info
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => remove(toast.id)}
              className="text-[10px] uppercase tracking-[0.3em] text-slate-400"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
