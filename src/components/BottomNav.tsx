import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ScanLine, History, Settings } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/history", icon: History, label: "History" },
  { path: "/scan", icon: ScanLine, label: "Scan", primary: true },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Backdrop blur effect */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl border-t border-slate-700/50" />

      <div className="relative max-w-lg mx-auto px-4 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            if (item.primary) {
              return (
                <NavLink key={item.path} to={item.path}>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative -mt-6"
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-emerald-500 to-cyan-500 rounded-full blur-lg opacity-50" />
                    <div className="relative bg-linear-to-r from-emerald-500 to-cyan-500 p-4 rounded-full shadow-lg">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </motion.div>
                </NavLink>
              );
            }

            return (
              <NavLink key={item.path} to={item.path}>
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-1 py-2 px-4"
                >
                  <motion.div
                    animate={{
                      scale: isActive ? 1.1 : 1,
                    }}
                    className={`p-2 rounded-xl transition-colors ${
                      isActive ? "bg-slate-700/80" : "bg-transparent"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        isActive ? "text-emerald-400" : "text-slate-400"
                      }`}
                    />
                  </motion.div>
                  <span
                    className={`text-xs font-medium transition-colors ${
                      isActive ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
