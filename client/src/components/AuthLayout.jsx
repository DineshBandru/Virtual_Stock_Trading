const AuthLayout = ({ children }) => {
  return (
    <div className="auth-shell flex min-h-screen items-center justify-center px-6 py-12">
      <div className="auth-card w-full max-w-md rounded-3xl border border-borderGlow/70 bg-panel/70 p-8 shadow-glow">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
