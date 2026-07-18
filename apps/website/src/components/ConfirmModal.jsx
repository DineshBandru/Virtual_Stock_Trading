import GlassPanel from "./GlassPanel";

const ConfirmModal = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <GlassPanel className="w-full max-w-md">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-3 text-sm text-slate-300">{description}</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            className="flex-1 rounded-xl border border-borderGlow/60 px-4 py-2 text-sm text-slate-300"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl border border-cyan/80 bg-cyan/10 px-4 py-2 text-sm font-semibold text-cyan shadow-glow"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </GlassPanel>
    </div>
  );
};

export default ConfirmModal;
