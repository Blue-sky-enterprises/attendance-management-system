// ─── Toast Component ──────────────────────────────────────────────────────────

import type { ToastMessage } from "@/types";
import { AlertTriangle, CheckCircle2, ClipboardList, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.92, x: 40 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, x: 60, scale: 0.88, transition: { duration: 0.22 } }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border ${
              t.type === "success"
                ? "bg-emerald-950 border-emerald-700 text-emerald-200"
                : t.type === "error"
                  ? "bg-red-950 border-red-700 text-red-200"
                  : "bg-slate-800 border-slate-600 text-slate-200"
            }`}
          >
            {t.type === "success" && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            {t.type === "error" && (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            {t.type === "info" && (
              <ClipboardList className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{t.message}</span>
            <motion.button
              whileHover={{ scale: 1.2, opacity: 1 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => onRemove(t.id)}
              className="ml-2 opacity-60"
            >
              <X className="w-3 h-3" />
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}