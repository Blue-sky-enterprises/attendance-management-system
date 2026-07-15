import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface MultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  className,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOptions = options.filter((opt) => value.includes(opt.value));
  const displayText =
    selectedOptions.length > 0
      ? selectedOptions.length === 1
        ? selectedOptions[0].label
        : `${selectedOptions.length} selected`
      : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs",
            "border-sky-900/40 bg-slate-950/60 text-slate-200",
            "hover:border-sky-700/50 hover:bg-slate-900/70 transition-all duration-150",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-0",
            "disabled:cursor-not-allowed disabled:opacity-50",
            selectedOptions.length === 0 && "text-slate-500",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            {selectedOptions.length === 1 && selectedOptions[0].icon && (
              <span className="shrink-0">{selectedOptions[0].icon}</span>
            )}
            <span className="truncate">{displayText}</span>
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
              const isSelected = value.includes(option.value);
              return (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs",
                    "text-slate-300 transition-colors",
                    "hover:bg-sky-950/50 hover:text-slate-100",
                    isSelected && "bg-sky-950/40 text-sky-100 font-medium",
                  )}
                  onSelect={() => {
                    if (isSelected) {
                      onValueChange(value.filter((v) => v !== option.value));
                    } else {
                      onValueChange([...value, option.value]);
                    }
                  }}
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-sky-400",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                  />

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
