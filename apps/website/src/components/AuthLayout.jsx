const AuthLayout = ({ children }) => {
  return (
    <div className="auth-shell flex min-h-screen items-center justify-center px-6 py-12">
      <div className="auth-card glass-panel w-full max-w-md rounded-2xl border border-white/10 p-8 shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
