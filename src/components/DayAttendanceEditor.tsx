import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, UserX, Plus } from "lucide-react";
import type { Client, Employee, DailyAttendance } from "@/types";
import { SearchableSelect } from "./ui/searchable-select";
import { MultiSelect } from "./ui/multi-select";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface DayAttendanceEditorProps {
  open: boolean;
  date: string;
  clients: Client[];
  employees: Employee[];
  record: DailyAttendance;
  onClose: () => void;
  onAssign: (clientId: string, employeeIds: string[], shift: "day" | "night" | "half") => void;
  onRemoveAssignment: (clientId: string, employeeId: string, shift: "day" | "night" | "half") => void;
  onMarkAbsent: (employeeId: string) => void;
  onRemoveAbsentee: (employeeId: string) => void;
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
  onClose,
  onAssign,
  onRemoveAssignment,
  onMarkAbsent,
  onRemoveAbsentee,
}: DayAttendanceEditorProps) {
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
        const shiftLabelMl = dropShift === "day" ? "പകൽ" : dropShift === "night" ? "രാത്രി" : "ഹാഫ് ഡേ";
        showError(`${empName} ഇന്ന് ${existingClientName}-ൽ ${shiftLabelMl} ഷിഫ്റ്റിൽ ഉണ്ട്. മറ്റൊരു ഷിഫ്റ്റ് തിരഞ്ഞെടുക്കുക.`);
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl w-full h-[85vh] flex flex-col bg-slate-900 border-sky-900/50 text-slate-100 p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-sky-900/50 bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-4">
            <DialogTitle className="text-xl">
              Manage Attendance for {dateInfo.dayStr}
            </DialogTitle>
            <div className="text-lg font-medium text-slate-300 bg-sky-950/40 px-3 py-1 rounded-lg border border-sky-900/40">
              {dateInfo.weekday}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <span className="text-sm text-slate-400">Default shift for drag & drop:</span>
            <SearchableSelect
              value={dropShift}
              onValueChange={(v) => setDropShift(v as "day" | "night" | "half")}
              options={[
                { value: "day", label: "Day Shift", icon: <Sun className="w-3.5 h-3.5 text-amber-400" /> },
                { value: "night", label: "Night Shift", icon: <Moon className="w-3.5 h-3.5 text-indigo-400" /> },
                { value: "half", label: "Half Day", icon: <Sun className="w-3.5 h-3.5 text-amber-600 opacity-75" /> },
              ]}
              className="w-40"
            />
          </div>
        </DialogHeader>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mx-4 mb-0 mt-2 flex items-center gap-2 rounded-lg border border-rose-800/50 bg-rose-950/40 px-3 py-2 text-xs text-rose-300 animate-in fade-in slide-in-from-top-1 duration-200 shrink-0">
            <span className="text-rose-400 text-base leading-none">⚠</span>
            {errorMsg}
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel: Employees */}
          <div className="w-1/4 border-r border-sky-900/50 bg-slate-950/30 flex flex-col">
            <div className="p-3 border-b border-sky-900/30 font-medium text-slate-300 text-sm">
              Employees ({filteredEmployees.length})
            </div>
            <div className="p-2 border-b border-sky-900/30">
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs bg-slate-900/50 border-sky-900/50"
              />
            </div>
            <ScrollArea className="flex-1 p-3">
              <div className="flex flex-col gap-2">
                {filteredEmployees.map((emp) => {
                  const isAssigned = assignedEmployeeIds.has(emp.id);
                  return (
                  <div
                    key={emp.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, emp.id)}
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
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isAssigned
                        ? "rgba(64,138,113,0.22)"
                        : "var(--surface-card-hover)";
                      e.currentTarget.style.borderColor = "var(--border-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isAssigned
                        ? "var(--accent-glow)"
                        : "var(--surface-1)";
                      e.currentTarget.style.borderColor = isAssigned
                        ? "var(--border-accent)"
                        : "var(--border-default)";
                    }}
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
                  </div>
                  );
                })}
                {filteredEmployees.length === 0 && (
                  <div className="text-center text-xs text-slate-500 py-4">
                    {searchQuery ? "No matches found." : "All employees are assigned or absent."}
                  </div>
                )}
              </div>
            </ScrollArea>
            {assignedEmployeeIds.size > 0 && (
              <div className="p-2 border-t border-sky-900/30 text-[10px] text-slate-500 flex items-center gap-1.5">
                <span className="text-sky-400">●</span> Already assigned — drag again for another shift
              </div>
            )}
          </div>

          {/* Right Panel: Clients & Absent */}
          <div className="w-3/4 flex flex-col bg-slate-900/50 overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Absent Bucket */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDropOnAbsent}
                  className={`p-4 rounded-xl border-2 border-dashed transition-colors col-span-2 sm:col-span-1 ${
                    draggedEmpId ? "border-rose-700/50 bg-rose-950/20" : "border-slate-800 bg-slate-900"
                  }`}
                >
                  <h3 className="font-medium text-rose-400 mb-3 flex items-center gap-2">
                    <UserX className="w-4 h-4" /> Absentees ({record.absentees.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {record.absentees.map((id) => {
                      const empName = employees.find((e) => e.id === id)?.name;
                      return (
                        <Badge
                          key={id}
                          variant="outline"
                          className="bg-rose-950/30 text-rose-300 border-rose-800/50 cursor-pointer hover:bg-rose-900/50"
                          onClick={() => onRemoveAbsentee(id)}
                        >
                          {empName} &times;
                        </Badge>
                      );
                    })}
                    {record.absentees.length === 0 && (
                      <span className="text-xs text-slate-500">Drag employees here to mark absent</span>
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
                          {assignedCount} duties
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
                            Drag employees here to assign
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
      </DialogContent>
    </Dialog>
  );
}
