import { motion } from "framer-motion";
import Sidebar from "./Sidebar";
import TopTicker from "./TopTicker";
import RightPanel from "./RightPanel";

const AppShell = ({ children }) => {
  return (
    <div className="min-h-screen bg-base text-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        <Sidebar />
        <main className="flex min-h-screen flex-col gap-8 px-6 py-8 lg:px-10">
          <TopTicker />
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </main>
        <RightPanel />
      </div>
    </div>
  );
};

export default AppShell;
