// ─── Section Preview Card ─────────────────────────────────────────────────────

import { useState } from "react";
import {
  CalendarDays,
  Users,
  Building2,
  Wallet,
  Palette,
  ChevronDown,
  ChevronUp,
  Maximize2,
} from "lucide-react";
import type { SectionKey } from "@/backup/backupTypes";
import { SECTION_LABEL } from "@/backup/backupTypes";
import type { BackupSections } from "@/backup/backupTypes";
import type { Client, Employee, DailyAttendance, BorrowingRecord } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ─── Section icon map ─────────────────────────────────────────────────────────

const SECTION_ICON: Record<SectionKey, React.ReactNode> = {
  attendance: <CalendarDays className="w-4 h-4" />,
  clients: <Building2 className="w-4 h-4" />,
  employees: <Users className="w-4 h-4" />,
  borrowings: <Wallet className="w-4 h-4" />,
  theme: <Palette className="w-4 h-4" />,
};

// ─── Section-specific preview renderers ──────────────────────────────────────

function AttendancePreview({
  records,
  allClients,
  allEmployees,
  isModal,
}: {
  records: DailyAttendance[];
  allClients: Client[];
  allEmployees: Employee[];
  isModal?: boolean;
}) {
  // Sort records by date descending
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className={`section-preview__table-wrap ${isModal ? "max-h-[60vh]" : "max-h-80"} overflow-y-auto`}>
      <table className="section-preview__table">
        <thead>
          <tr>
            <th className="w-24">Date</th>
            <th>Clients & Assignments</th>
            <th>Absentees</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const hasData = r.clients.some((c) => c.employees.length > 0) || r.absentees.length > 0;
            if (!hasData) return null; // skip empty days in preview

            return (
              <tr key={r.date} className="align-top">
                <td className="font-semibold text-slate-200 py-2">{r.date}</td>
                <td className="py-2">
                  <div className="space-y-1">
                    {r.clients
                      .filter((c) => c.employees.length > 0)
                      .map((cl) => {
                        const clientName =
                          allClients.find((c) => c.id === cl.clientId)?.name ??
                          "Unknown Client";
                        return (
                          <div key={cl.clientId} className="text-xs">
                            <span className="font-medium text-sky-400">
                              {clientName}:
                            </span>{" "}
                            <span className="text-slate-300">
                              {cl.employees
                                .map((emp) => {
                                  const empName =
                                    allEmployees.find((e) => e.id === emp.employeeId)?.name ??
                                    "Unknown";
                                  const shiftStr =
                                    emp.shift === "day" ? "Day" : "Night";
                                  return `${empName} (${shiftStr})`;
                                })
                                .join(", ")}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </td>
                <td className="py-2">
                  {r.absentees.length > 0 ? (
                    <div className="text-xs text-rose-400">
                      {r.absentees
                        .map((id) => {
                          return (
                            allEmployees.find((e) => e.id === id)?.name ??
                            "Unknown"
                          );
                        })
                        .join(", ")}
                    </div>
                  ) : (
                    <span className="text-slate-600 font-normal">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ClientsPreview({ clients, isModal }: { clients: Client[]; isModal?: boolean }) {
  return (
    <div className={`section-preview__pills ${isModal ? "max-h-[60vh]" : "max-h-48"} overflow-y-auto p-1`}>
      {clients.map((c) => (
        <span key={c.id} className="section-preview__pill">
          <Building2 className="w-3 h-3" />
          {c.name}
        </span>
      ))}
    </div>
  );
}

function EmployeesPreview({ employees, isModal }: { employees: Employee[]; isModal?: boolean }) {
  return (
    <div className={`section-preview__pills ${isModal ? "max-h-[60vh]" : "max-h-48"} overflow-y-auto p-1`}>
      {employees.map((e) => (
        <span key={e.id} className="section-preview__pill">
          <Users className="w-3 h-3" />
          {e.name}
        </span>
      ))}
    </div>
  );
}

function BorrowingsPreview({ borrowings, isModal }: { borrowings: BorrowingRecord[]; isModal?: boolean }) {
  const sorted = [...borrowings].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className={`section-preview__table-wrap ${isModal ? "max-h-[60vh]" : "max-h-48"} overflow-y-auto`}>
      {sorted.length === 0 ? (
        <p className="text-xs text-slate-500 italic p-1">No records</p>
      ) : (
        <table className="section-preview__table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => (
              <tr key={b.id}>
                <td>{b.date}</td>
                <td className="capitalize">{b.type}</td>
                <td>₹{b.amount.toLocaleString()}</td>
                <td>
                  <span
                    className={`section-preview__badge ${b.settled ? "section-preview__badge--success" : "section-preview__badge--pending"}`}
                  >
                    {b.settled ? "Settled" : "Pending"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ThemePreview({ theme }: { theme: string }) {
  return (
    <div className="section-preview__pills">
      <span className="section-preview__pill">
        <Palette className="w-3 h-3" />
        {theme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}
      </span>
    </div>
  );
}

// ─── SectionPreviewCard ───────────────────────────────────────────────────────

interface SectionPreviewCardProps {
  sectionKey: SectionKey;
  sections: BackupSections;
  approved: boolean;
  onToggle: () => void;
}

export function SectionPreviewCard({
  sectionKey,
  sections,
  approved,
  onToggle,
}: SectionPreviewCardProps) {
  const [expanded, setExpanded] = useState(false);

  const recordCount = (() => {
    const v = sections[sectionKey];
    if (Array.isArray(v)) return v.length;
    return null;
  })();

  const renderPreview = (isModal?: boolean) => {
    switch (sectionKey) {
      case "attendance":
        return (
          <AttendancePreview
            records={sections.attendance}
            allClients={sections.clients}
            allEmployees={sections.employees}
            isModal={isModal}
          />
        );
      case "clients":
        return <ClientsPreview clients={sections.clients} isModal={isModal} />;
      case "employees":
        return <EmployeesPreview employees={sections.employees} isModal={isModal} />;
      case "borrowings":
        return <BorrowingsPreview borrowings={sections.borrowings} isModal={isModal} />;
      case "theme":
        return <ThemePreview theme={sections.theme} />;
    }
  };

  return (
    <div
      className={`section-card ${approved ? "section-card--approved" : "section-card--skipped"}`}
    >
      {/* Card header */}
      <div className="section-card__header">
        <label className="section-card__label-wrap">
          {/* Checkbox */}
          <div className="section-card__checkbox-wrap">
            <input
              type="checkbox"
              checked={approved}
              onChange={onToggle}
              className="section-card__checkbox"
              id={`section-${sectionKey}`}
            />
            <div
              className={`section-card__checkbox-custom ${approved ? "section-card__checkbox-custom--checked" : ""}`}
            >
              {approved && (
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  className="w-3 h-3"
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Icon + name */}
          <div className="section-card__icon">{SECTION_ICON[sectionKey]}</div>
          <div className="section-card__info">
            <span className="section-card__name">
              {SECTION_LABEL[sectionKey]}
            </span>
            {recordCount !== null && (
              <span className="section-card__count">
                {recordCount} record{recordCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </label>

        <div className="flex items-center gap-1">
          {/* Modal Expand Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="section-card__expand-btn"
                aria-label="Expand in modal"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] bg-slate-900 border-sky-900/50 text-slate-100 rounded-xl overflow-hidden flex flex-col p-6">
              <DialogHeader className="mb-4">
                <DialogTitle className="flex items-center gap-2 text-slate-200">
                  {SECTION_ICON[sectionKey]}
                  {SECTION_LABEL[sectionKey]} Preview ({recordCount !== null ? `${recordCount} records` : "Theme Settings"})
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-1">
                {renderPreview(true)}
              </div>
            </DialogContent>
          </Dialog>

          {/* Inline Expand toggle */}
          <button
            type="button"
            className="section-card__expand-btn"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse inline" : "Expand inline"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded preview */}
      {expanded && (
        <div className="section-card__preview">{renderPreview()}</div>
      )}
    </div>
  );
}
