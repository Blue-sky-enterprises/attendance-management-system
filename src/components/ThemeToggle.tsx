import { Sun, Moon, SunIcon, MoonIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
   <div
      role="group"
      aria-label="Theme"
      className={[
        "flex items-center gap-0.5 p-[3px] rounded-full border",
        "transition-colors duration-200",
        isDark
          ? "bg-slate-800 border-slate-700"
          : "bg-slate-100 border-slate-200",
      ].join(" ")}
    >
      {[
        { mode: "light", Icon: Sun,  label: "Light mode" },
        { mode: "dark",  Icon: Moon, label: "Dark mode"  },
      ].map(({ mode, Icon, label }) => {
        const active = theme === mode;
        return (
          <button
            key={mode}
            onClick={toggleTheme}
            aria-label={label}
            aria-pressed={active}
            className={[
              "flex items-center justify-center",
              "w-[30px] h-[30px] rounded-full border-none",
              "cursor-pointer transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              active
                ? isDark
                  ? "bg-slate-600 text-slate-100 shadow-sm"
                  : "bg-white text-sky-600 shadow-sm"
                : isDark
                  ? "bg-transparent text-slate-500 hover:text-slate-300"
                  : "bg-transparent text-slate-400 hover:text-slate-600",
            ].join(" ")}
          >
            <Icon size={16} strokeWidth={1.75} />
          </button>
        );
      })}
    </div>
  );
}
