import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "src/components/ui/command";
import { cn } from "src/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Optional icon rendered before the label */
  icon?: React.ReactNode;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Extra classes applied to the trigger button */
  className?: string;
  disabled?: boolean;
}

/**
 * A searchable dropdown that replaces plain `<Select>` components.
 * Built on Popover + Command (cmdk) so every list is filterable.
 */
export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  className,
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            /* base */
            "flex h-9 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs",
            /* colours */
            "border-sky-900/40 bg-slate-950/60 text-slate-200",
            /* hover / focus */
            "hover:border-sky-700/50 hover:bg-slate-900/70 transition-all duration-150",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-0",
            /* disabled */
            "disabled:cursor-not-allowed disabled:opacity-50",
            /* no selection */
            !selectedOption && "text-slate-500",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            {selectedOption?.icon && (
              <span className="shrink-0">{selectedOption.icon}</span>
            )}
            <span className="truncate">
              {selectedOption?.label ?? placeholder}
            </span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] min-w-[10rem] p-0 bg-slate-900 border border-sky-900/50 shadow-2xl shadow-black/50 rounded-xl"
      >
        <Command className="bg-transparent text-white">
          {/* ── Search input ── */}
          <div className="border-b border-sky-900/40">
            <CommandInput
              placeholder={searchPlaceholder}
              className="h-9 text-xs text-white placeholder:text-slate-500 bg-transparent"
            />
          </div>

          <CommandEmpty className="py-4 text-center text-xs text-slate-500">
            {emptyText}
          </CommandEmpty>

          <CommandGroup className="max-h-52 overflow-y-auto p-1">
            {options.map((option) => {
              const isSelected = value === option.value;
              return (
                <CommandItem
                  key={option.value}
                  /* cmdk matches against `value` prop — use label so search works */
                  value={option.label}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs",
                    "text-slate-300 transition-colors",
                    "aria-selected:bg-sky-950/70 aria-selected:text-sky-100",
                    "hover:bg-sky-950/50 hover:text-slate-100",
                    isSelected && "bg-sky-950/40 text-sky-100",
                  )}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  {/* selection indicator */}
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-sky-400",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                  />

                  {/* optional icon */}
                  {option.icon && (
                    <span className="shrink-0">{option.icon}</span>
                  )}

                  <span className="truncate">{option.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
