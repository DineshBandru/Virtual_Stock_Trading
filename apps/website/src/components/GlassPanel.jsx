const GlassPanel = ({ children, className = "" }) => {
  return (
    <div
      className={`glass-panel rounded-2xl border border-borderGlow/60 bg-panel/70 p-5 shadow-glow ${className}`}
    >
      {children}
    </div>
  );
};

export default GlassPanel;
