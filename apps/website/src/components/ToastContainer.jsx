import useToast from "../hooks/useToast";

const toneStyles = {
  success: "border-emerald-500/40 text-emerald-300",
  error: "border-red-500/50 text-red-300",
  info: "border-white/10 text-[#E7E9F3]"
};

const ToastContainer = () => {
  const { toasts, remove } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed left-4 right-4 top-20 z-50 flex flex-col gap-3 sm:left-auto sm:w-[280px] lg:right-6 lg:top-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-2xl border bg-[#161725]/95 px-4 py-3 text-xs shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur ${
            toneStyles[toast.tone] || toneStyles.info
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => remove(toast.id)}
              className="text-xs font-medium text-[#A1A1B5]"
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
