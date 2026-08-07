const GlassPanel = ({ children, className = "" }) => {
  return (
    <div
      className={`glass-panel rounded-xl border border-borderGlow bg-panel p-5 ${className}`}
    >
      {children}
    </div>
  );
};

export default GlassPanel;
