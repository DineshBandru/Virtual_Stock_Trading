const GlassPanel = ({ children, className = "", ...props }) => {
  return (
    <div
      {...props}
      className={`glass-panel rounded-2xl border p-5 transition-colors duration-200 ${className}`}
    >
      {children}
    </div>
  );
};

export default GlassPanel;
