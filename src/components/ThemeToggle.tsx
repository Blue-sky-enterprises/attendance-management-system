import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <motion.div
      role="group"
      aria-label="Theme"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 22 }}
      className={[
        "flex items-center gap-0.5 p-[3px] rounded-full border",
        "transition-colors duration-200",
        isDark
          ? "bg-slate-800 border-slate-700"
          : "bg-slate-100 border-slate-200",
      ].join(" ")}
    >
      {[
        { mode: "light", Icon: Sun, label: "Light mode" },
        { mode: "dark", Icon: Moon, label: "Dark mode" },
      ].map(({ mode, Icon, label }) => {
        const active = theme === mode;
        return (
          <motion.button
            key={mode}
            onClick={() => setTheme(mode as "light" | "dark")}
            aria-label={label}
            aria-pressed={active}
            whileHover={{ scale: active ? 1 : 1.12 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={[
              "flex items-center justify-center",
              "w-[30px] h-[30px] rounded-full border",
              "cursor-pointer transition-all duration-200",
              "focus-visible:outline-none",
              "focus-visible:ring-2 focus-visible:ring-[var(--accent-500)]",
              active
                ? "bg-[var(--accent-500)] text-white border-[var(--accent-500)] shadow-md shadow-[var(--accent-glow)]"
                : "bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[var(--surface-2)] hover:text-[var(--accent-500)] hover:border-[var(--border-default)]",
            ].join(" ")}
          >
            <motion.span
              initial={false}
              animate={{ rotate: active ? 0 : 15, scale: active ? 1 : 0.85 }}
              transition={{ type: "spring", stiffness: 350, damping: 18 }}
            >
              <Icon size={16} strokeWidth={1.75} />
            </motion.span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
