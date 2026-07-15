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
        /* Base */
        "flex h-9 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-all duration-150",

        /* Theme */
        "bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-primary)]",

        /* Hover / Focus */
        "hover:bg-[var(--surface-1)] hover:border-[var(--border-hover)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] focus-visible:ring-offset-0",

        /* Disabled */
        "disabled:cursor-not-allowed disabled:opacity-50",

        /* Placeholder */
        !selectedOption && "text-[var(--text-muted)]",

        className
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

      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" />
    </button>
  </PopoverTrigger>

  <PopoverContent
    align="start"
    sideOffset={4}
    className="
      w-[var(--radix-popover-trigger-width)]
      min-w-[10rem]
      p-0
      rounded-xl
      bg-[var(--surface-card)]
      backdrop-blur-md
      border
      border-[var(--border-default)]
      shadow-xl
    "
  >
    <Command className="bg-transparent text-[var(--text-primary)]">
      {/* Search */}
      <div className="border-b border-[var(--border-default)]">
        <CommandInput
          placeholder={searchPlaceholder}
          className="
            h-9
            text-xs
            bg-transparent
            text-[var(--text-primary)]
            placeholder:text-[var(--text-muted)]
          "
        />
      </div>

      <CommandEmpty className="py-4 text-center text-xs text-[var(--text-muted)]">
        {emptyText}
      </CommandEmpty>

      <CommandGroup className="max-h-52 overflow-y-auto p-1">
        {options.map((option) => {
          const isSelected = value === option.value;

          return (
            <CommandItem
              key={option.value}
              value={option.label}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",

                "text-[var(--text-primary)]",

                "hover:bg-[var(--accent-glow)] hover:text-[var(--text-heading)]",

                "aria-selected:bg-[var(--accent-glow)] aria-selected:text-[var(--text-heading)]",

                isSelected &&
                  "bg-[var(--accent-glow)] text-[var(--accent-500)] font-medium"
              )}
              onSelect={() => {
                onValueChange(option.value);
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-[var(--accent-500)]",
                  isSelected ? "opacity-100" : "opacity-0"
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
