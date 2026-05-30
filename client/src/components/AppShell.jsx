import { motion } from "framer-motion";
import Sidebar from "./Sidebar";
import TopTicker from "./TopTicker";
import RightPanel from "./RightPanel";
import MobileNav from "./MobileNav";

const AppShell = ({ children }) => {
  return (
    <div className="min-h-screen bg-white text-base dark:bg-base dark:text-white pb-16 lg:pb-0">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        <Sidebar />
        <main className="flex min-h-screen flex-col gap-6 px-4 py-6 md:gap-8 md:px-6 md:py-8 lg:px-10">
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
      <MobileNav />
    </div>
  );
};

export default AppShell;
