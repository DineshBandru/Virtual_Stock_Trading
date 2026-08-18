import { motion } from "framer-motion";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

const AppShell = ({ children }) => {
  return (
    <div className="app-shell min-h-dvh bg-[var(--bg-page)] text-[var(--text-primary)]">
      <MobileNav />
      <div className="min-h-[calc(100dvh-4rem)] w-full min-w-0 flex-1 lg:min-h-dvh">
        <Sidebar />
        <main className="main-content min-w-0 px-4 py-5 md:px-6 lg:px-8 xl:px-10">
          <div className="flex w-full flex-col gap-6">
            <motion.div
              className="w-full flex-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
