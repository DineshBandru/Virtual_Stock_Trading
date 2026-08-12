const GlassPanel = ({ children, className = "", ...props }) => {
  return (
    <div
      {...props}
      className={`glass-panel rounded-lg border p-5 transition-colors duration-200 ${className}`}
    >
      {children}
    </div>
  );
};

export default GlassPanel;
