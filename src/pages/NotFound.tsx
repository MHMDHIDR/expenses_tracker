import { motion } from "framer-motion";
import { Home, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col items-center justify-center px-6 pb-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <AlertTriangle className="w-20 h-20 text-amber-400 mx-auto mb-6" />
        </motion.div>

        <h1 className="text-4xl font-bold mb-2">404</h1>
        <h2 className="text-xl text-slate-400 mb-6">Page Not Found</h2>

        <p className="text-slate-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Link to="/">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-linear-to-r from-emerald-500 to-cyan-500 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto"
          >
            <Home className="w-5 h-5" />
            Go Home
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
