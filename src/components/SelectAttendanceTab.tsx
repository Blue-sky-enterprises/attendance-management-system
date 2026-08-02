import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Sun,
  Moon,
  Lock,
  Building2,
  Search,
  Check,
  Users,
  CheckCircle2,
} from "lucide-react";
import type { Client, Employee, DailyAttendance } from "@/types";

interface SelectAttendanceTabProps {
  clients: Client[];
  employees: Employee[];
  record: DailyAttendance;
  onAssign: (
    clientId: string,
    employeeIds: string[],
    shift: "day" | "night"
  ) => void;
  onRemoveAssignment: (
    clientId: string,
    employeeId: string,
    shift: "day" | "night" | "half"
  ) => void;
}

export function SelectAttendanceTab({
  clients,
  employees,
  record,
  onAssign,
  onRemoveAssignment,
}: SelectAttendanceTabProps) {
  const { t } = useTranslation();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [shift, setShift] = useState<"day" | "night">("day");
  const [clientSearch, setClientSearch] = useState("");
  const [empSearch, setEmpSearch] = useState("");
  const [flyingEmpId, setFlyingEmpId] = useState<string | null>(null);
  const [flyingDir, setFlyingDir] = useState<"in" | "out">("in");
  // Set of client ids that the user has marked as "completed"
  const [completedClients, setCompletedClients] = useState<Set<string>>(new Set());
  // Flash effect on client card
  const [flashClientId, setFlashClientId] = useState<string | null>(null);

  const clientRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ─── Derived: assignment lookup ──────────────────────────────────────────
  const assignmentMap = useMemo(() => {
    const map: Record<string, Set<"day" | "night">> = {};
    for (const cl of record.clients) {
      for (const emp of cl.employees) {
        if (!map[emp.employeeId]) map[emp.employeeId] = new Set();
        map[emp.employeeId].add(emp.shift as "day" | "night");
      }
    }
    return map;
  }, [record]);

  // ─── Client stats ────────────────────────────────────────────────────────
  const clientStats = useMemo(() => {
    const stats: Record<string, { total: number; day: number; night: number }> = {};
    for (const cl of record.clients) {
      const day = cl.employees.filter((e) => e.shift === "day").length;
      const night = cl.employees.filter((e) => e.shift === "night").length;
      stats[cl.clientId] = { total: cl.employees.length, day, night };
    }
    return stats;
  }, [record]);

  // ─── Sorted clients: incomplete first, completed last ────────────────────
  const sortedClients = useMemo(() => {
    const filtered = clients.filter((c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      const aDone = completedClients.has(a.id);
      const bDone = completedClients.has(b.id);
      if (!aDone && bDone) return -1;
      if (aDone && !bDone) return 1;
      return 0;
    });
  }, [clients, clientSearch, completedClients]);

  // ─── Filtered employees ──────────────────────────────────────────────────
  const filteredEmployees = useMemo(() => {
    return employees
      .filter((emp) => !record.absentees.includes(emp.id))
      .filter((emp) => emp.name.toLowerCase().includes(empSearch.toLowerCase()));
  }, [employees, record, empSearch]);

  // ─── Is employee locked (assigned same shift on a DIFFERENT client) ───────
  const isEmpLocked = useCallback(
    (empId: string): boolean => {
      if (!selectedClientId) return false;
      return record.clients.some(
        (c) =>
          c.clientId !== selectedClientId &&
          c.employees.some((e) => e.employeeId === empId && e.shift === shift)
      );
    },
    [selectedClientId, shift, record]
  );

  // ─── Is employee currently assigned to the SELECTED client for this shift ─
  const isEmpAssignedHere = useCallback(
    (empId: string): boolean => {
      if (!selectedClientId) return false;
      const clientRec = record.clients.find((c) => c.clientId === selectedClientId);
      return (
        clientRec?.employees.some(
          (e) => e.employeeId === empId && e.shift === shift
        ) ?? false
      );
    },
    [selectedClientId, shift, record]
  );

  // ─── Get locked-at client name ────────────────────────────────────────────
  const getLockedClientName = useCallback(
    (empId: string): string | null => {
      for (const cl of record.clients) {
        if (cl.clientId === selectedClientId) continue;
        for (const e of cl.employees) {
          if (e.employeeId === empId && e.shift === shift) {
            return clients.find((c) => c.id === cl.clientId)?.name ?? "Unknown";
          }
        }
      }
      return null;
    },
    [record, selectedClientId, shift, clients]
  );

  // ─── Toggle: instant assign / remove ─────────────────────────────────────
  const toggleEmployee = useCallback(
    (empId: string) => {
      if (!selectedClientId || isEmpLocked(empId)) return;

      const alreadyAssigned = isEmpAssignedHere(empId);

      // Trigger fly animation
      setFlyingDir(alreadyAssigned ? "out" : "in");
      setFlyingEmpId(empId);

      setTimeout(() => {
        if (alreadyAssigned) {
          onRemoveAssignment(selectedClientId, empId, shift);
        } else {
          onAssign(selectedClientId, [empId], shift);
        }
        // Flash client card
        setFlashClientId(selectedClientId);
        setTimeout(() => setFlashClientId(null), 900);
        setFlyingEmpId(null);
      }, 350);
    },
    [selectedClientId, isEmpLocked, isEmpAssignedHere, shift, onAssign, onRemoveAssignment]
  );

  // ─── Mark as completed / undo completed ──────────────────────────────────
  const toggleCompleted = useCallback(() => {
    if (!selectedClientId) return;
    if (completedClients.has(selectedClientId)) {
      // Undo completed
      setCompletedClients((prev) => {
        const next = new Set(prev);
        next.delete(selectedClientId);
        return next;
      });
    } else {
      // Mark done, jump to next incomplete
      setCompletedClients((prev) => {
        const next = new Set(prev);
        next.add(selectedClientId);
        return next;
      });
      const nextClient = sortedClients.find(
        (c) => c.id !== selectedClientId && !completedClients.has(c.id)
      );
      setSelectedClientId(nextClient?.id ?? null);
    }
  }, [selectedClientId, completedClients, sortedClients]);

  // ─── Reset shift to day when switching client ─────────────────────────────
  useEffect(() => {
    setShift("day");
  }, [selectedClientId]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const isCompleted = selectedClientId ? completedClients.has(selectedClientId) : false;

  // Current client's allocations count
  const currentStats = selectedClientId ? clientStats[selectedClientId] : null;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ─── Left Sidebar: Client List ───────────────────────────────── */}
      <div className="w-[260px] min-w-[260px] border-r border-slate-200 bg-slate-100/60 dark:border-sky-900/50 dark:bg-slate-950/30 flex flex-col">
        <div className="p-3 border-b border-slate-200 dark:border-sky-900/30">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4" style={{ color: "var(--accent-400)" }} />
            <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              {t("manage_modal.clients")} ({clients.length})
            </span>
          </div>
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            />
            <Input
              placeholder={t("manage_modal.search_clients")}
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="h-8 text-xs pl-8 bg-white border-slate-200 dark:bg-slate-900/50 dark:border-sky-900/50"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 flex flex-col gap-1.5">
            <AnimatePresence mode="popLayout">
              {sortedClients.map((client) => {
                const stats = clientStats[client.id];
                const isSelected = selectedClientId === client.id;
                const isFlashing = flashClientId === client.id;
                const isDone = completedClients.has(client.id);

                return (
                  <motion.div
                    key={client.id}
                    ref={(el) => { clientRefs.current[client.id] = el; }}
                    layout
                    layoutId={`client-${client.id}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: isDone ? 0.55 : 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{
                      layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
                      opacity: { duration: 0.2 },
                    }}
                    className={`select-client-card ${isSelected ? "select-client-card--selected" : ""} ${isFlashing ? "select-client-card--flash" : ""} ${isDone ? "opacity-60" : ""}`}
                    onClick={() => setSelectedClientId(client.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: isDone ? "var(--text-muted)" : "var(--text-primary)" }}
                      >
                        {client.name}
                      </span>
                      {isDone ? (
                        <CheckCircle2
                          className="w-4 h-4 shrink-0"
                          style={{ color: "var(--accent-400)" }}
                        />
                      ) : isSelected ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{
                            background:
                              "linear-gradient(135deg, var(--accent-500), var(--accent-600))",
                          }}
                        >
                          <Check className="w-3 h-3 text-white" />
                        </motion.div>
                      ) : null}
                    </div>

                    {stats && stats.total > 0 && (
                      <motion.div
                        className="flex items-center gap-1.5 mt-1.5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <span className="client-badge client-badge--total">
                          <Users className="w-2.5 h-2.5" />
                          {stats.total}
                        </span>
                        {stats.day > 0 && (
                          <motion.span
                            className="client-badge client-badge--day"
                            key={`day-${stats.day}`}
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                          >
                            <Sun className="w-2.5 h-2.5" />
                            {stats.day}
                          </motion.span>
                        )}
                        {stats.night > 0 && (
                          <motion.span
                            className="client-badge client-badge--night"
                            key={`night-${stats.night}`}
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                          >
                            <Moon className="w-2.5 h-2.5" />
                            {stats.night}
                          </motion.span>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {sortedClients.length === 0 && (
              <div
                className="text-center text-xs py-6"
                style={{ color: "var(--text-muted)" }}
              >
                {t("manage_modal.no_clients_found")}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ─── Right Panel: Employee Selection ─────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900/50">
        {!selectedClientId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--accent-glow)" }}
            >
              <Building2
                className="w-8 h-8"
                style={{ color: "var(--accent-500)", opacity: 0.5 }}
              />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              {t("manage_modal.select_client_prompt")}
            </p>
          </div>
        ) : (
          <>
            {/* Controls Bar */}
            <div className="p-3 border-b border-slate-200 dark:border-sky-900/30 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                {/* Client name + current assignment counts */}
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" style={{ color: "var(--accent-400)" }} />
                  <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    {t("manage_modal.assigning_to")}{" "}
                    <span style={{ color: "var(--accent-400)" }}>{selectedClient?.name}</span>
                  </span>
                  {currentStats && currentStats.total > 0 && (
                    <div className="flex items-center gap-1 ml-1">
                      {currentStats.day > 0 && (
                        <span className="client-badge client-badge--day text-[10px]">
                          <Sun className="w-2.5 h-2.5" /> {currentStats.day}
                        </span>
                      )}
                      {currentStats.night > 0 && (
                        <span className="client-badge client-badge--night text-[10px]">
                          <Moon className="w-2.5 h-2.5" /> {currentStats.night}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Mark as Completed / Undo button */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer hover:opacity-90"
                  style={
                    isCompleted
                      ? {
                          background: "rgba(75,86,148,0.12)",
                          color: "var(--accent-500)",
                          border: "1px dashed var(--accent-500)",
                        }
                      : {
                          background:
                            "linear-gradient(135deg, var(--accent-500), var(--accent-600))",
                          color: "#fff",
                          border: "none",
                        }
                  }
                  onClick={toggleCompleted}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isCompleted ? "Undo Completed" : "Mark as Completed"}
                </motion.button>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search
                    className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <Input
                    placeholder={t("manage_modal.search_employees")}
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    className="h-8 text-xs pl-8 bg-white border-slate-200 dark:bg-slate-900/50 dark:border-sky-900/50"
                  />
                </div>

                {/* Shift Toggle */}
                <div className="shift-toggle">
                  <button
                    className={`shift-toggle__btn ${shift === "day" ? "shift-toggle__btn--day" : ""}`}
                    onClick={() => setShift("day")}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    {t("manage_modal.day")}
                  </button>
                  <button
                    className={`shift-toggle__btn ${shift === "night" ? "shift-toggle__btn--night" : ""}`}
                    onClick={() => setShift("night")}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    {t("manage_modal.night")}
                  </button>
                </div>
              </div>

              {/* Assignment summary row */}
              {currentStats && currentStats.total > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {(() => {
                    const clientRec = record.clients.find(c => c.clientId === selectedClientId);
                    const dayEmps = clientRec?.employees.filter(e => e.shift === "day") ?? [];
                    const nightEmps = clientRec?.employees.filter(e => e.shift === "night") ?? [];
                    return (
                      <>
                        <div className="flex items-start gap-2 flex-wrap">
                          {/* Total badge */}
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 shrink-0"
                            style={{
                              background: "var(--accent-glow)",
                              color: "var(--accent-400)",
                              border: "1px solid var(--border-accent)",
                            }}
                          >
                            <Users className="w-2.5 h-2.5" />
                            {currentStats.total} total
                          </span>

                          {/* Day shift employees */}
                          {dayEmps.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <Sun className="w-3 h-3 text-amber-400 shrink-0" />
                              {dayEmps.map(e => {
                                const name = employees.find(emp => emp.id === e.employeeId)?.name ?? e.employeeId;
                                return (
                                  <span
                                    key={e.employeeId}
                                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                    style={{
                                      background: "rgba(245,158,11,0.1)",
                                      color: "#d97706",
                                      border: "1px solid rgba(245,158,11,0.25)",
                                    }}
                                  >
                                    {name}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Night shift employees */}
                          {nightEmps.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <Moon className="w-3 h-3 text-indigo-400 shrink-0" />
                              {nightEmps.map(e => {
                                const name = employees.find(emp => emp.id === e.employeeId)?.name ?? e.employeeId;
                                return (
                                  <span
                                    key={e.employeeId}
                                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                    style={{
                                      background: "rgba(99,102,241,0.1)",
                                      color: "#818cf8",
                                      border: "1px solid rgba(99,102,241,0.25)",
                                    }}
                                  >
                                    {name}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  No employees assigned yet
                </span>
              )}
            </div>

            {/* Employee Grid */}
            <ScrollArea className="flex-1">
              <div className="p-3 grid grid-cols-2 xl:grid-cols-3 gap-2">
                <AnimatePresence>
                  {filteredEmployees.map((emp) => {
                    const locked = isEmpLocked(emp.id);
                    const assignedHere = isEmpAssignedHere(emp.id);
                    const lockedAt = locked ? getLockedClientName(emp.id) : null;
                    const isAnimating = flyingEmpId === emp.id;

                    // Show other-shift indicator badges
                    const empShifts = assignmentMap[emp.id];
                    const hasDay = empShifts?.has("day") ?? false;
                    const hasNight = empShifts?.has("night") ?? false;

                    return (
                      <motion.div
                        key={emp.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={
                          isAnimating
                            ? flyingDir === "in"
                              ? { opacity: 0, scale: 0.3, y: -50, transition: { duration: 0.35, ease: "easeIn" } }
                              : { opacity: 0, scale: 0.3, y: 50, transition: { duration: 0.35, ease: "easeIn" } }
                            : { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } }
                        }
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileHover={!locked && !isAnimating ? { scale: 1.02, y: -1 } : undefined}
                        whileTap={!locked && !isAnimating ? { scale: 0.97 } : undefined}
                        className={`select-emp-card ${assignedHere ? "select-emp-card--selected" : ""} ${locked ? "select-emp-card--disabled" : ""}`}
                        onClick={() => toggleEmployee(emp.id)}
                      >
                        {/* Checkbox */}
                        <div className={`select-emp-card__checkbox ${assignedHere ? "select-emp-card__checkbox--checked" : ""}`}>
                          {assignedHere && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 25 }}
                              className="flex items-center justify-center"
                            >
                              {shift === "day" ? (
                                <Sun className="w-3 h-3 text-amber-300" />
                              ) : (
                                <Moon className="w-3 h-3 text-indigo-300" />
                              )}
                            </motion.div>
                          )}
                        </div>

                        {/* Name */}
                        <span
                          className="flex-1 text-sm font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {emp.name}
                        </span>

                        {/* Status badges */}
                        <div className="flex items-center gap-1 shrink-0">
                          {assignedHere && (
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                shift === "day"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                              }`}
                            >
                              {shift === "day" ? <Sun className="w-2.5 h-2.5" /> : <Moon className="w-2.5 h-2.5" />}
                              {shift === "day" ? t("manage_modal.day") : t("manage_modal.night")}
                            </span>
                          )}
                          {locked && (
                            <span className="select-emp-card__badge select-emp-card__badge--locked">
                              <Lock className="w-2.5 h-2.5" />
                              {lockedAt ?? (shift === "day" ? "Day" : "Night")}
                            </span>
                          )}
                          {!locked && !assignedHere && hasDay && shift !== "day" && (
                            <span className="select-emp-card__badge select-emp-card__badge--day">
                              <Sun className="w-2.5 h-2.5" />
                            </span>
                          )}
                          {!locked && !assignedHere && hasNight && shift !== "night" && (
                            <span className="select-emp-card__badge select-emp-card__badge--night">
                              <Moon className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {filteredEmployees.length === 0 && (
                  <div
                    className="col-span-full text-center text-xs py-8"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {empSearch
                      ? t("manage_modal.no_employees_match")
                      : t("manage_modal.no_employees_available")}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      {/* Flying animation overlay */}
      <AnimatePresence>
        {flyingEmpId && selectedClientId && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background:
                  shift === "day"
                    ? "linear-gradient(135deg, #f59e0b, #d97706)"
                    : "linear-gradient(135deg, #6366f1, #4f46e5)",
                boxShadow:
                  shift === "day"
                    ? "0 0 20px rgba(245,158,11,0.6)"
                    : "0 0 20px rgba(99,102,241,0.6)",
                left: "55%",
                top: "45%",
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={
                flyingDir === "in"
                  ? {
                      scale: [0, 1.3, 1, 0.5],
                      opacity: [0, 1, 1, 0],
                      x: [0, 0, -180, -260],
                      y: [0, -15, -30, 0],
                    }
                  : {
                      scale: [0, 1.3, 1, 0.5],
                      opacity: [0, 1, 1, 0],
                      x: [0, 0, 60, 120],
                      y: [0, 10, 30, 60],
                    }
              }
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], times: [0, 0.25, 0.6, 1] }}
            >
              {shift === "day" ? (
                <Sun className="w-4 h-4 text-white" />
              ) : (
                <Moon className="w-4 h-4 text-white" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
