import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";

const Admin = () => {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Admin Control"
        subtitle="Manage users, transactions, competitions, and platform stats."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel>
          <div className="rounded-2xl border border-dashed border-borderGlow/60 p-10 text-center text-xs text-slate-400">
            Admin stats render here.
          </div>
        </GlassPanel>
        <GlassPanel>
          <div className="rounded-2xl border border-dashed border-borderGlow/60 p-10 text-center text-xs text-slate-400">
            User management table renders here.
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default Admin;
