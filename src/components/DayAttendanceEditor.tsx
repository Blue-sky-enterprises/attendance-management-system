import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, UserX, Plus, GripVertical, MousePointerClick, Trash2 } from "lucide-react";
import type { Client, Employee, DailyAttendance } from "@/types";
import { SearchableSelect } from "./ui/searchable-select";
import { MultiSelect } from "./ui/multi-select";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { SelectAttendanceTab } from "./SelectAttendanceTab";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DayAttendanceEditorProps {
  open: boolean;
  date: string;
  clients: Client[];
  employees: Employee[];
  record: DailyAttendance;
  isLocked?: boolean;
  onClose: () => void;
  onAssign: (clientId: string, employeeIds: string[], shift: "day" | "night" | "half") => void;
  onRemoveAssignment: (clientId: string, employeeId: string, shift: "day" | "night" | "half") => void;
  onMarkAbsent: (employeeId: string) => void;
  onRemoveAbsentee: (employeeId: string) => void;
  onClearDay: () => void;
}

function getTitleDateInfo(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  
  const getSuffix = (n: number) => {
    if (n >= 11 && n <= 13) return "th";
    switch (n % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };

  const day = dateObj.getDate();
  const month = dateObj.toLocaleString("en-US", { month: "long" });
  const weekday = dateObj.toLocaleString("en-US", { weekday: "long" });

  return {
    dayStr: `${day}${getSuffix(day)} ${month}`,
    weekday
  };
}

export function DayAttendanceEditor({
  open,
  date,
  clients,
  employees,
  record,
  isLocked = false,
  onClose,
  onAssign,
  onRemoveAssignment,
  onMarkAbsent,
  onRemoveAbsentee,
  onClearDay,
}: DayAttendanceEditorProps) {
  // Mode: "drag" or "select"
  const [mode, setMode] = useState<"drag" | "select">("select");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { t } = useTranslation();

  // Drag state
  const [draggedEmpId, setDraggedEmpId] = useState<string | null>(null);

  // Shift selection for drop
  const [dropShift, setDropShift] = useState<"day" | "night" | "half">("day");
  
  // Search query for employees
  const [searchQuery, setSearchQuery] = useState("");

  // Local error message
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 3500);
  };

  const handleDragStart = (e: React.DragEvent, empId: string) => {
    e.dataTransfer.setData("empId", empId);
    setDraggedEmpId(empId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDropOnClient = (e: React.DragEvent, clientId: string) => {
    e.preventDefault();
    const empId = e.dataTransfer.getData("empId");
    if (empId) {
      // Check: does this employee already have the SAME shift anywhere today?
      const alreadyHasShift = record.clients.some((c) =>
        c.employees.some((a) => a.employeeId === empId && a.shift === dropShift)
      );

      if (alreadyHasShift) {
        const empName = employees.find((e) => e.id === empId)?.name ?? "Employee";
        // Find which client already has this employee on this shift
        const existingClient = record.clients.find((c) =>
          c.employees.some((a) => a.employeeId === empId && a.shift === dropShift)
        );
        const existingClientName = existingClient
          ? (clients.find((c) => c.id === existingClient.clientId)?.name ?? "another client")
          : "another client";
        const shiftLabel = dropShift === "day" ? t('manage_modal.day_shift') : dropShift === "night" ? t('manage_modal.night_shift') : t('manage_modal.half_day');
        showError(t('manage_modal.already_on_shift', { employee: empName, client: existingClientName, shift: shiftLabel }));
        setDraggedEmpId(null);
        return;
      }

      onAssign(clientId, [empId], dropShift);
    }
    setDraggedEmpId(null);
  };

  const handleDropOnAbsent = (e: React.DragEvent) => {
    e.preventDefault();
    const empId = e.dataTransfer.getData("empId");
    if (empId) {
      onMarkAbsent(empId);
    }
    setDraggedEmpId(null);
  };

  // All employees except those marked absent — assigned ones remain visible
  // since an employee can work multiple shifts (e.g., day at one client, night at another)
  const availableEmployees = employees.filter(
    (emp) => !record.absentees.includes(emp.id)
  );

  const filteredEmployees = availableEmployees.filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Employees already assigned somewhere (for visual indicator)
  const assignedEmployeeIds = new Set(
    record.clients.flatMap((c) => c.employees.map((e) => e.employeeId))
  );

  const dateInfo = getTitleDateInfo(date);
  const hasData = record.clients.some((c) => c.employees.length > 0) || record.absentees.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-7xl w-full h-[90vh] flex flex-col bg-slate-50 text-slate-900 border-slate-200 dark:bg-slate-900 dark:border-sky-900/50 dark:text-slate-100 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 border-b border-slate-200 bg-slate-100/80 dark:border-sky-900/50 dark:bg-slate-950/50 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-xl">
                {t('manage_modal.title')} {dateInfo.dayStr}
              </DialogTitle>
              <div className="text-sm font-medium text-slate-700 bg-slate-200/80 px-3 py-1 rounded-lg border border-slate-300 dark:text-slate-300 dark:bg-sky-950/40 dark:border-sky-900/40">
                {dateInfo.weekday}
              </div>

              {/* Mode Toggle */}
              <div className="mode-toggle">
                {(["drag", "select"] as const).map((m) => (
                  <motion.button
                    key={m}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    className={`mode-toggle__btn ${mode === m ? "mode-toggle__btn--active" : ""}`}
                    onClick={() => setMode(m)}
                  >
                    {m === "drag"
                      ? <><GripVertical className="w-3.5 h-3.5" />{t('manage_modal.drag')}</>
                      : <><MousePointerClick className="w-3.5 h-3.5" />{t('manage_modal.select')}</>
                    }
                  </motion.button>
                ))}
              </div>
            </div>

            {hasData && (
              <Button
                variant="destructive"
                size="sm"
                className="mr-8 flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 dark:border dark:border-rose-800/50 shadow-sm transition-colors"
                disabled={isLocked}
                onClick={() => setShowClearConfirm(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('manage_modal.clear_attendance')}
              </Button>
            )}
          </div>
          {mode === "drag" && (
            <div className="flex items-center gap-4 mt-3">
              <span className="text-sm text-slate-400">{t('manage_modal.default_shift')}</span>
              <SearchableSelect
                value={dropShift}
                onValueChange={(v) => setDropShift(v as "day" | "night" | "half")}
                options={[
                  { value: "day", label: t('manage_modal.day_shift'), icon: <Sun className="w-3.5 h-3.5 text-amber-400" /> },
                  { value: "night", label: t('manage_modal.night_shift'), icon: <Moon className="w-3.5 h-3.5 text-indigo-400" /> },
                  { value: "half", label: t('manage_modal.half_day'), icon: <Sun className="w-3.5 h-3.5 text-amber-600 opacity-75" /> },
                ]}
                className="w-40"
              />
            </div>
          )}
        </DialogHeader>

        {/* Error Banner */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.22 }}
              className="mx-4 mb-0 mt-2 flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300 shrink-0 overflow-hidden"
            >
              <span className="text-rose-500 dark:text-rose-400 text-base leading-none">⚠</span>
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {mode === "select" ? (
          <SelectAttendanceTab
            clients={clients}
            employees={employees}
            record={record}
            onAssign={onAssign}
            onRemoveAssignment={onRemoveAssignment}
          />
        ) : (
        <>
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel: Employees */}
          <div className="w-1/4 border-r border-slate-200 bg-slate-100/60 dark:border-sky-900/50 dark:bg-slate-950/30 flex flex-col">
            <div className="p-3 border-b border-slate-200 text-slate-700 dark:border-sky-900/30 dark:text-slate-300 font-medium text-sm">
              {t('manage_modal.employees')} ({filteredEmployees.length})
            </div>
            <div className="p-2 border-b border-slate-200 dark:border-sky-900/30">
              <Input
                placeholder={t('manage_modal.search_employees')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs bg-white border-slate-200 dark:bg-slate-900/50 dark:border-sky-900/50"
              />
            </div>
            <ScrollArea className="flex-1 p-3">
              <div className="flex flex-col gap-2">
                {filteredEmployees.map((emp, i) => {
                  const isAssigned = assignedEmployeeIds.has(emp.id);
                  return (
                  <motion.div
                    key={emp.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 24 }}
                    draggable
                    onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, emp.id)}
                    onDragEnd={() => setDraggedEmpId(null)}
                    className="p-2 rounded border cursor-grab active:cursor-grabbing transition-all text-sm flex items-center gap-2"
                    style={{
                      background: isAssigned
                        ? "var(--accent-glow)"
                        : "var(--surface-1)",
                      borderColor: isAssigned
                        ? "var(--border-accent)"
                        : "var(--border-default)",
                      color: "var(--text-primary)",
                    }}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                      transition: { duration: 0.15 },
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div
                      className="w-1.5 h-4 rounded-full shrink-0"
                      style={{
                        background: isAssigned
                          ? "var(--accent-400)"
                          : "var(--text-muted)",
                      }}
                    />

                    <span
                      className="truncate flex-1"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {emp.name}
                    </span>

                    {isAssigned && (
                      <span
                        className="text-[10px] font-semibold shrink-0"
                        style={{ color: "var(--accent-400)" }}
                      >
                        ●
                      </span>
                    )}
                  </motion.div>
                  );
                })}
                {filteredEmployees.length === 0 && (
                  <div className="text-center text-xs text-slate-500 py-4">
                    {searchQuery ? t('manage_modal.no_matches') : t('manage_modal.all_assigned_absent')}
                  </div>
                )}
              </div>
            </ScrollArea>
            {assignedEmployeeIds.size > 0 && (
              <div className="p-2 border-t border-slate-200 text-slate-500 dark:border-sky-900/30 dark:text-slate-500 text-[10px] flex items-center gap-1.5">
                <span className="text-sky-500 dark:text-sky-400">●</span> {t('manage_modal.already_assigned_hint')}
              </div>
            )}
          </div>

          {/* Right Panel: Clients & Absent */}
          <div className="w-3/4 flex flex-col bg-white dark:bg-slate-900/50 overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Absent Bucket */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDropOnAbsent}
                  className={`p-4 rounded-xl border-2 border-dashed transition-colors col-span-2 sm:col-span-1 ${
                    draggedEmpId
                      ? "border-rose-400 bg-rose-100/60 dark:border-rose-700/50 dark:bg-rose-950/20"
                      : "border-rose-200 bg-rose-50/50 dark:border-slate-800 dark:bg-slate-900"
                  }`}
                >
                  <h3 className="font-medium text-rose-600 dark:text-rose-400 mb-3 flex items-center gap-2">
                    <UserX className="w-4 h-4" /> {t('manage_modal.absentees')} ({record.absentees.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {record.absentees.map((id) => {
                      const empName = employees.find((e) => e.id === id)?.name;
                      return (
                        <Badge
                          key={id}
                          variant="outline"
                          className="bg-rose-100 text-rose-700 border-rose-300 cursor-pointer hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50 dark:hover:bg-rose-900/50 transition-colors"
                          onClick={() => onRemoveAbsentee(id)}
                        >
                          {empName} &times;
                        </Badge>
                      );
                    })}
                    {record.absentees.length === 0 && (
                      <span className="text-xs text-rose-400/80 dark:text-slate-500">{t('manage_modal.drag_absent')}</span>
                    )}
                  </div>
                </div>

                {/* Client Buckets */}
                {clients.map((client) => {
                  const clientRecord = record.clients.find((c) => c.clientId === client.id);
                  const assignedCount = clientRecord?.employees.reduce((acc, e) => acc + e.dutyCount, 0) || 0;

                  return (
                   <div
                      key={client.id}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnClient(e, client.id)}
                      className="p-4 rounded-xl border-2 border-dashed transition-all col-span-2 sm:col-span-1"
                      style={{
                        background: draggedEmpId
                          ? "var(--accent-glow)"
                          : "var(--surface-1)",
                        borderColor: draggedEmpId
                          ? "var(--border-hover)"
                          : "var(--border-default)",
                      }}
                    >
                      <h3
                        className="font-medium mb-3 flex items-center justify-between"
                        style={{ color: "var(--accent-400)" }}
                      >
                        <span className="truncate">{client.name}</span>

                        <span
                          className="text-xs px-2 py-0.5 rounded shrink-0"
                          style={{
                            background: "var(--accent-glow)",
                            color: "var(--accent-400)",
                            border: "1px solid var(--border-accent)",
                          }}
                        >
                          {assignedCount} {t('manage_modal.duties')}
                        </span>
                      </h3>

                      <div className="flex flex-wrap gap-2">
                        {clientRecord?.employees.map((emp) => {
                          const empName = employees.find((e) => e.id === emp.employeeId)?.name;

                          const shiftStyle =
                            emp.shift === "night"
                              ? {
                                  background: "rgba(99,102,241,.12)",
                                  color: "#818cf8",
                                  border: "1px solid rgba(99,102,241,.35)",
                                }
                              : emp.shift === "half"
                              ? {
                                  background: "rgba(245,158,11,.12)",
                                  color: "#fbbf24",
                                  border: "1px solid rgba(245,158,11,.35)",
                                }
                              : {
                                  background: "rgba(64,138,113,.12)",
                                  color: "var(--accent-400)",
                                  border: "1px solid var(--border-accent)",
                                };

                          return (
                            <Badge
                              key={`${emp.employeeId}-${emp.shift}`}
                              variant="outline"
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                              style={shiftStyle}
                              onClick={() =>
                                onRemoveAssignment(client.id, emp.employeeId, emp.shift)
                              }
                            >
                              {empName}

                              {emp.shift === "night" && (
                                <Moon className="w-3 h-3 ml-1 inline" />
                              )}

                              {emp.shift === "half" && (
                                <Sun className="w-3 h-3 ml-1 inline opacity-75" />
                              )}

                              {emp.shift === "day" && (
                                <Sun className="w-3 h-3 ml-1 inline" />
                              )}

                              {emp.dutyCount > 1 && (
                                <span className="ml-1 opacity-70">
                                  x{emp.dutyCount}
                                </span>
                              )}

                              <span className="ml-1 font-bold">&times;</span>
                            </Badge>
                          );
                        })}

                        {(!clientRecord || clientRecord.employees.length === 0) && (
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {t('manage_modal.drag_assign')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
        </>
        )}
      </DialogContent>

      {/* Clear Confirmation AlertDialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent className="bg-white border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-sky-900/50 dark:text-slate-100 rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('manage_modal.clear_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              {t('manage_modal.clear_confirm_desc', { date: dateInfo.dayStr })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:border-sky-900/30">
              {t('manage_modal.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => {
                onClearDay();
                setShowClearConfirm(false);
              }}
            >
              {t('manage_modal.yes_clear')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
