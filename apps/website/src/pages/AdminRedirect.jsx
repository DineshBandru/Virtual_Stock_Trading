import { useEffect } from "react";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";

const adminAppUrl = import.meta.env.VITE_ADMIN_URL || "http://localhost:3001";

const AdminRedirect = () => {
  useEffect(() => {
    if (import.meta.env.DEV) {
      window.location.replace(adminAppUrl);
    }
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Admin Panel"
        subtitle="Admin panel is available in the Admin app."
      />

      <GlassPanel>
        <div className="rounded-2xl border border-borderGlow/60 bg-base/60 px-6 py-10 text-center">
          <p className="text-sm text-slate-300">Admin panel is available in the Admin app.</p>
          <a
            href={adminAppUrl}
            className="mt-6 inline-flex rounded-xl border border-cyan/60 bg-cyan/10 px-5 py-3 text-sm font-semibold text-cyan transition hover:bg-cyan/20"
          >
            Open Admin App
          </a>
        </div>
      </GlassPanel>
    </div>
  );
};

export default AdminRedirect;
