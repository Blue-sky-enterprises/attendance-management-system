import { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  Building2,
  Sun,
  Moon,
  Plus,
  Trash2,
  Edit2,
  Search,
  Trophy,
  CalendarDays,
  BarChart3,
  Settings,
  UserX,
  AlertTriangle,
  X,
  Briefcase,
  Download,
  Info,
  ChevronDown,
  Copy,
  Lock,
  LockOpen,
} from "lucide-react";
import type { Client, DailyAttendance, Employee, ToastMessage } from "@/types";
import { useLocalStorage } from "@/hooks";
import { formatDate, generateId, getDaysInMonth, parseDateLabel } from "@/utilities";
import { ToastContainer } from "@/components/toast";


export default function AttendanceManager() {
  const now = new Date();
  const selectedMonth = now.getMonth();
  const selectedYear = now.getFullYear();
  const todayStr = formatDate(now.getFullYear(), now.getMonth(), now.getDate());
  const [lockedDates, setLockedDates] = useState<Record<string, boolean>>({});




  const [clients, setClients] = useLocalStorage<Client[]>("att_clients", []);
  const [employees, setEmployees] = useLocalStorage<Employee[]>(
    "att_employees",
    [],
  );
  const [attendanceRecords, setAttendanceRecords] = useLocalStorage<
    DailyAttendance[]
  >("att_records", []);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [expandedLeaders, setExpandedLeaders] = useState<string[]>([]);

  // Dialog states
  const [clientDialog, setClientDialog] = useState<{
    open: boolean;
    editing: Client | null;
  }>({ open: false, editing: null });
  const [employeeDialog, setEmployeeDialog] = useState<{
    open: boolean;
    editing: Employee | null;
  }>({ open: false, editing: null });
  const [deleteClientDialog, setDeleteClientDialog] = useState<Client | null>(
    null,
  );
  const [deleteEmployeeDialog, setDeleteEmployeeDialog] =
    useState<Employee | null>(null);
  const [clearDialog, setClearDialog] = useState<string | null>(null);

  const [addAttendanceDialog, setAddAttendanceDialog] = useState<{
    open: boolean;
    date: string;
  } | null>(null);
  const [addAbsenteeDialog, setAddAbsenteeDialog] = useState<{
    open: boolean;
    date: string;
  } | null>(null);

  // Form states
  const [clientName, setClientName] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [attClientId, setAttClientId] = useState("");
  const [attEmployeeId, setAttEmployeeId] = useState("");
  const [attShift, setAttShift] = useState<"day" | "night">("day");
  const [absenteeId, setAbsenteeId] = useState("");

  // Search/filter
  const [searchEmployee, setSearchEmployee] = useState("");
  const [searchClient, setSearchClient] = useState("");
  const [filterClient, setFilterClient] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterShift, setFilterShift] = useState("all");

  const addToast = useCallback(
    (message: string, type: ToastMessage["type"] = "success") => {
      const id = generateId();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        3500,
      );
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Generate all dates for selected month
  const monthDates = useMemo(() => {
    const days = getDaysInMonth(selectedYear, selectedMonth);
    return Array.from({ length: days }, (_, i) =>
      formatDate(selectedYear, selectedMonth, i + 1),
    );
  }, [selectedYear, selectedMonth]);

  const toggleLock = (date: string) => {
    setLockedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  // Ensure all month dates exist in records
  useEffect(() => {
    setAttendanceRecords((prev) => {
      const existing = new Set(prev.map((r) => r.date));
      const missing = monthDates.filter((d) => !existing.has(d));
      if (missing.length === 0) return prev;
      return [
        ...prev,
        ...missing.map((date) => ({ date, clients: [], absentees: [] })),
      ];
    });
  }, [monthDates, setAttendanceRecords]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const initialLocks: Record<string, boolean> = {};

    attendanceRecords.forEach((rec) => {
      const recordDate = new Date(rec.date);
      recordDate.setHours(0, 0, 0, 0);

      initialLocks[rec.date] = recordDate < today;
    });

    setLockedDates(initialLocks);
  }, []);

  const getRecord = useCallback(
    (date: string): DailyAttendance =>
      attendanceRecords.find((r) => r.date === date) ?? {
        date,
        clients: [],
        absentees: [],
      },
    [attendanceRecords],
  );

  const updateRecord = useCallback(
    (date: string, updater: (r: DailyAttendance) => DailyAttendance) => {
      setAttendanceRecords((prev) => {
        const idx = prev.findIndex((r) => r.date === date);
        if (idx === -1) {
          return [...prev, updater({ date, clients: [], absentees: [] })];
        }
        const updated = [...prev];
        updated[idx] = updater(updated[idx]);
        return updated;
      });
    },
    [setAttendanceRecords],
  );

  // ── Statistics ──────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const dutyMap: Record<string, number> = {};
    let totalDuties = 0;
    let totalAbsentees = 0;

    for (const rec of attendanceRecords) {
      totalAbsentees += rec.absentees.length;
      for (const cl of rec.clients) {
        for (const emp of cl.employees) {
          dutyMap[emp.employeeId] =
            (dutyMap[emp.employeeId] ?? 0) + emp.dutyCount;
          totalDuties += emp.dutyCount;
        }
      }
    }

    const leaderboard = Object.entries(dutyMap)
      .map(([id, count]) => {
        const clientDuties: Record<string, number> = {};
        for (const rec of attendanceRecords) {
          for (const cl of rec.clients) {
            for (const emp of cl.employees) {
              if (emp.employeeId === id) {
                clientDuties[cl.clientId] = (clientDuties[cl.clientId] ?? 0) + emp.dutyCount;
              }
            }
          }
        }
        const clientDistribution = Object.entries(clientDuties)
          .map(([clientId, cCount]) => ({
            clientId,
            clientName: clients.find((c) => c.id === clientId)?.name ?? "Unknown Client",
            count: cCount,
          }))
          .sort((a, b) => b.count - a.count);

        return {
          id,
          name: employees.find((e) => e.id === id)?.name ?? "Unknown",
          count,
          clientDistribution,
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      totalClients: clients.length,
      totalEmployees: employees.length,
      totalDuties,
      totalAbsentees,
      leaderboard,
      topEmployee: leaderboard[0] ?? null,
    };
  }, [attendanceRecords, clients, employees]);

  // ── Client CRUD ─────────────────────────────────────────────────────────────

  const openAddClient = () => {
    setClientName("");
    setClientDialog({ open: true, editing: null });
  };
  const openEditClient = (c: Client) => {
    setClientName(c.name);
    setClientDialog({ open: true, editing: c });
  };

  const saveClient = () => {
    const trimmed = clientName.trim();
    if (!trimmed) return;
    if (
      clients.some(
        (c) =>
          c.name.toLowerCase() === trimmed.toLowerCase() &&
          c.id !== clientDialog.editing?.id,
      )
    ) {
      addToast("Client name already exists", "error");
      return;
    }
    if (clientDialog.editing) {
      setClients((prev) =>
        prev.map((c) =>
          c.id === clientDialog.editing!.id ? { ...c, name: trimmed } : c,
        ),
      );
      addToast("Client updated");
    } else {
      setClients((prev) => [...prev, { id: generateId(), name: trimmed }]);
      addToast("Client added");
    }
    setClientDialog({ open: false, editing: null });
  };

  const deleteClient = (c: Client) => {
    setClients((prev) => prev.filter((x) => x.id !== c.id));
    setAttendanceRecords((prev) =>
      prev.map((r) => ({
        ...r,
        clients: r.clients.filter((cl) => cl.clientId !== c.id),
      })),
    );
    addToast(`Client "${c.name}" deleted`, "info");
    setDeleteClientDialog(null);
  };

  // ── Employee CRUD ───────────────────────────────────────────────────────────

  const openAddEmployee = () => {
    setEmployeeName("");
    setEmployeeDialog({ open: true, editing: null });
  };
  const openEditEmployee = (e: Employee) => {
    setEmployeeName(e.name);
    setEmployeeDialog({ open: true, editing: e });
  };

  const saveEmployee = () => {
    const trimmed = employeeName.trim();
    if (!trimmed) return;
    if (
      employees.some(
        (e) =>
          e.name.toLowerCase() === trimmed.toLowerCase() &&
          e.id !== employeeDialog.editing?.id,
      )
    ) {
      addToast("Employee name already exists", "error");
      return;
    }
    if (employeeDialog.editing) {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === employeeDialog.editing!.id ? { ...e, name: trimmed } : e,
        ),
      );
      addToast("Employee updated");
    } else {
      setEmployees((prev) => [...prev, { id: generateId(), name: trimmed }]);
      addToast("Employee added");
    }
    setEmployeeDialog({ open: false, editing: null });
  };

  const deleteEmployee = (e: Employee) => {
    setEmployees((prev) => prev.filter((x) => x.id !== e.id));
    setAttendanceRecords((prev) =>
      prev.map((r) => ({
        ...r,
        clients: r.clients.map((cl) => ({
          ...cl,
          employees: cl.employees.filter((a) => a.employeeId !== e.id),
        })),
        absentees: r.absentees.filter((id) => id !== e.id),
      })),
    );
    addToast(`Employee "${e.name}" deleted`, "info");
    setDeleteEmployeeDialog(null);
  };

  // ── Attendance ──────────────────────────────────────────────────────────────

  const addAttendance = () => {
    if (!addAttendanceDialog || !attClientId || !attEmployeeId) return;
    const { date } = addAttendanceDialog;
    if (date > todayStr) {
      addToast("Cannot record attendance for future dates", "error");
      return;
    }
    const rec = getRecord(date);
    if (rec.absentees.includes(attEmployeeId)) {
      addToast("Employee is marked absent on this day", "error");
      return;
    }
    updateRecord(date, (r) => {
      const clientIdx = r.clients.findIndex((c) => c.clientId === attClientId);
      if (clientIdx === -1) {
        return {
          ...r,
          clients: [
            ...r.clients,
            {
              clientId: attClientId,
              employees: [
                { employeeId: attEmployeeId, shift: attShift, dutyCount: 1 },
              ],
            },
          ],
        };
      }
      const empIdx = r.clients[clientIdx].employees.findIndex(
        (e) => e.employeeId === attEmployeeId && e.shift === attShift,
      );
      const updatedClients = [...r.clients];
      if (empIdx === -1) {
        updatedClients[clientIdx] = {
          ...updatedClients[clientIdx],
          employees: [
            ...updatedClients[clientIdx].employees,
            { employeeId: attEmployeeId, shift: attShift, dutyCount: 1 },
          ],
        };
      } else {
        const emps = [...updatedClients[clientIdx].employees];
        emps[empIdx] = {
          ...emps[empIdx],
          dutyCount: emps[empIdx].dutyCount + 1,
        };
        updatedClients[clientIdx] = {
          ...updatedClients[clientIdx],
          employees: emps,
        };
      }
      return { ...r, clients: updatedClients };
    });
    addToast("Attendance recorded");
    setAddAttendanceDialog(null);
  };

  const removeAssignment = (
    date: string,
    clientId: string,
    employeeId: string,
    shift: "day" | "night",
  ) => {
    if (date > todayStr) {
      addToast("Cannot modify attendance for future dates", "error");
      return;
    }
    updateRecord(date, (r) => {
      const updatedClients = r.clients
        .map((cl) => {
          if (cl.clientId !== clientId) return cl;
          const empIdx = cl.employees.findIndex(
            (e) => e.employeeId === employeeId && e.shift === shift,
          );
          if (empIdx === -1) return cl;
          const emps = [...cl.employees];
          if (emps[empIdx].dutyCount > 1) {
            emps[empIdx] = {
              ...emps[empIdx],
              dutyCount: emps[empIdx].dutyCount - 1,
            };
          } else {
            emps.splice(empIdx, 1);
          }
          return { ...cl, employees: emps };
        })
        .filter((cl) => cl.employees.length > 0);
      return { ...r, clients: updatedClients };
    });
  };

  // ── Absentees ───────────────────────────────────────────────────────────────

  const addAbsentee = () => {
    if (!addAbsenteeDialog || !absenteeId) return;
    const { date } = addAbsenteeDialog;
    if (date > todayStr) {
      addToast("Cannot record absentees for future dates", "error");
      return;
    }
    const rec = getRecord(date);
    if (rec.absentees.includes(absenteeId)) {
      addToast("Already marked absent", "error");
      return;
    }
    const isPresent = rec.clients.some((cl) =>
      cl.employees.some((emp) => emp.employeeId === absenteeId)
    );
    if (isPresent) {
      addToast("Employee is already assigned (present) on this day", "error");
      return;
    }
    updateRecord(date, (r) => ({
      ...r,
      absentees: [...r.absentees, absenteeId],
    }));
    addToast("Absentee marked");
    setAddAbsenteeDialog(null);
  };

  const removeAbsentee = (date: string, employeeId: string) => {
    if (date > todayStr) {
      addToast("Cannot modify attendance for future dates", "error");
      return;
    }
    updateRecord(date, (r) => ({
      ...r,
      absentees: r.absentees.filter((id) => id !== employeeId),
    }));
  };

  // ── Clear Data ──────────────────────────────────────────────────────────────

  const clearData = (type: string) => {
    if (type === "all") {
      setClients([]);
      setEmployees([]);
      setAttendanceRecords([]);
    } else if (type === "clients") {
      setClients([]);
      setAttendanceRecords((prev) => prev.map((r) => ({ ...r, clients: [] })));
    } else if (type === "employees") {
      setEmployees([]);
      setAttendanceRecords((prev) =>
        prev.map((r) => ({
          ...r,
          clients: r.clients.map((c) => ({ ...c, employees: [] })),
          absentees: [],
        })),
      );
    } else if (type === "attendance") {
      setAttendanceRecords([]);
    }
    addToast("Data cleared", "info");
    setClearDialog(null);
  };

  const copyAttendanceMessage = async (record: DailyAttendance) => {
    const date = new Date(record.date);

    const formattedDate = date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let message = `📅 *${formattedDate}*\n\n`;

    record.clients.forEach((clientRecord) => {
      const clientName =
        clients.find((c) => c.id === clientRecord.clientId)?.name ??
        "Unknown Client";

      message += `*🏢 ${clientName}:*\n`;

      clientRecord.employees.forEach((emp) => {
        const empName =
          employees.find((e) => e.id === emp.employeeId)?.name ??
          "Unknown Employee";

        const shiftLabel = emp.shift === "night" ? " (N)" : " (D)";

        if (emp.dutyCount > 1) {
          for (let i = 0; i < emp.dutyCount; i++) {
            message += `• ${empName}${shiftLabel}\n`;
          }
        } else {
          message += `• ${empName}${shiftLabel}\n`;
        }
      });

      message += "\n";
    });

    if (record.absentees.length > 0) {
      message += `*❌ Absentees:*\n`;

      record.absentees.forEach((empId) => {
        const empName =
          employees.find((e) => e.id === empId)?.name ?? "Unknown Employee";

        message += `• ${empName}\n`;
      });

      message += "\n";
    }

    try {
      await navigator.clipboard.writeText(message);
      addToast("Attendance copied to clipboard");
    } catch {
      addToast("Failed to copy attendance", "error");
    }
  };

  const downloadAnalyticsReport = () => {
    const reportDateStr = `${monthName} ${selectedYear}`;
    const timestamp = new Date().toLocaleString();

    let report = `==================================================\n`;
    report += `BLUE SKY ENTERPRISES - ATTENDANCE MONITOR REPORT\n`;
    report += `==================================================\n`;
    report += `Report Month : ${reportDateStr}\n`;
    report += `Generated On : ${timestamp}\n\n`;

    report += `--------------------------------------------------\n`;
    report += `1. EXECUTIVE SUMMARY\n`;
    report += `--------------------------------------------------\n`;
    report += `- Total Clients   : ${stats.totalClients}\n`;
    report += `- Total Employees : ${stats.totalEmployees}\n`;
    report += `- Total Duties    : ${stats.totalDuties}\n`;
    report += `- Total Absentees : ${stats.totalAbsentees}\n`;
    if (stats.topEmployee) {
      report += `- Top Performer   : ${stats.topEmployee.name} (${stats.topEmployee.count} duties)\n`;
    }
    report += `\n`;

    report += `--------------------------------------------------\n`;
    report += `2. DUTY LEADERBOARD (EMPLOYEE SUMMARY)\n`;
    report += `--------------------------------------------------\n`;
    if (stats.leaderboard.length === 0) {
      report += `No employee duties recorded in this month.\n`;
    } else {
      report += `Rank  | ${"Employee Name".padEnd(30)} | Total Duties\n`;
      report += `------|--------------------------------|--------------\n`;
      stats.leaderboard.forEach((l, idx) => {
        const rankStr = String(idx + 1).padEnd(5);
        const nameStr = l.name.padEnd(30);
        report += `${rankStr} | ${nameStr} | ${l.count} duties\n`;
      });
    }
    report += `\n`;

    report += `--------------------------------------------------\n`;
    report += `3. CLIENT-WISE DUTY DISTRIBUTION\n`;
    report += `--------------------------------------------------\n`;
    if (clients.length === 0) {
      report += `No clients registered.\n`;
    } else {
      clients.forEach((c) => {
        report += `Client: ${c.name}\n`;
        let clientDuties = 0;
        const clientEmpDuties: Record<string, { day: number; night: number }> = {};

        attendanceRecords.forEach((rec) => {
          const recClient = rec.clients.find((rc) => rc.clientId === c.id);
          if (recClient) {
            recClient.employees.forEach((emp) => {
              clientDuties += emp.dutyCount;
              if (!clientEmpDuties[emp.employeeId]) {
                clientEmpDuties[emp.employeeId] = { day: 0, night: 0 };
              }
              if (emp.shift === "day") {
                clientEmpDuties[emp.employeeId].day += emp.dutyCount;
              } else {
                clientEmpDuties[emp.employeeId].night += emp.dutyCount;
              }
            });
          }
        });

        report += `- Total Assigned Duties: ${clientDuties}\n`;
        const empKeys = Object.keys(clientEmpDuties);
        if (empKeys.length === 0) {
          report += `- No assignments recorded.\n`;
        } else {
          report += `- Assigned Employees:\n`;
          empKeys.forEach((empId) => {
            const empName = employees.find((e) => e.id === empId)?.name ?? "Unknown Employee";
            const shiftCounts = clientEmpDuties[empId];
            const shiftDetails = [];
            if (shiftCounts.day > 0) shiftDetails.push(`${shiftCounts.day} Day`);
            if (shiftCounts.night > 0) shiftDetails.push(`${shiftCounts.night} Night`);
            report += `  * ${empName} (${shiftDetails.join(", ")} shift duties)\n`;
          });
        }
        report += `\n`;
      });
    }

    report += `--------------------------------------------------\n`;
    report += `4. DAILY LOGS DETAIL\n`;
    report += `--------------------------------------------------\n`;

    const sortedRecords = [...attendanceRecords].sort((a, b) => a.date.localeCompare(b.date));

    if (sortedRecords.length === 0) {
      report += `No daily attendance logs found.\n`;
    } else {
      sortedRecords.forEach((rec) => {
        report += `Date: ${parseDateLabel(rec.date)} (${rec.date})\n`;

        if (rec.clients.length === 0) {
          report += `  - Duties: None assigned\n`;
        } else {
          report += `  - Duties:\n`;
          rec.clients.forEach((rc) => {
            const clientName = clients.find((c) => c.id === rc.clientId)?.name ?? "Unknown Client";
            const empAssignments = rc.employees.map((emp) => {
              const empName = employees.find((e) => e.id === emp.employeeId)?.name ?? "Unknown Employee";
              const shiftLabel = emp.shift === "day" ? "Day" : "Night";
              const countLabel = emp.dutyCount > 1 ? ` (x${emp.dutyCount})` : "";
              return `${empName} - ${shiftLabel}${countLabel}`;
            });
            report += `    * [${clientName}] ${empAssignments.join(", ")}\n`;
          });
        }

        if (rec.absentees.length === 0) {
          report += `  - Absentees: None\n`;
        } else {
          const absNames = rec.absentees.map((id) => employees.find((e) => e.id === id)?.name ?? "Unknown Employee");
          report += `  - Absentees: ${absNames.join(", ")}\n`;
        }
        report += `\n`;
      });
    }

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_report_${selectedYear}_${(selectedMonth + 1).toString().padStart(2, "0")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("Analytics report downloaded successfully!");
  };

  
  const downloadAnalyticsExcel = () => {
    const reportDateStr = `${monthName} ${selectedYear}`;
    const timestamp = new Date().toLocaleString();

    let csvContent = "";

    const escapeCSV = (val: string | number) => {
      const str = String(val);
      if (
        str.includes(",") ||
        str.includes('"') ||
        str.includes("\n") ||
        str.includes("\r")
      ) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const addRow = (cells: (string | number)[]) => {
      csvContent += cells.map(escapeCSV).join(",") + "\n";
    };

    addRow(["BLUE SKY ENTERPRISES - ATTENDANCE REPORT"]);
    addRow(["Report Month", reportDateStr]);
    addRow(["Generated On", timestamp]);
    addRow([]);

    addRow(["EXECUTIVE SUMMARY"]);
    addRow(["Total Clients", stats.totalClients]);
    addRow(["Total Employees", stats.totalEmployees]);
    addRow(["Total Duties", stats.totalDuties]);
    addRow(["Total Absentees", stats.totalAbsentees]);
    if (stats.topEmployee) {
      addRow([
        "Top Performer",
        stats.topEmployee.name,
        `${stats.topEmployee.count} duties`,
      ]);
    }
    addRow([]);

    addRow(["EMPLOYEE DUTY DISTRIBUTION BY CLIENT"]);
    addRow([
      "Rank",
      "Employee Name",
      "Total Duties",
      "Client Name",
      "Client Duties",
    ]);

    if (stats.leaderboard.length === 0) {
      addRow(["No employee duties recorded."]);
    } else {
      stats.leaderboard.forEach((l, idx) => {
        if (l.clientDistribution.length === 0) {
          addRow([idx + 1, l.name, l.count, "No client assignments", 0]);
        } else {
          l.clientDistribution.forEach((cd, cIdx) => {
            if (cIdx === 0) {
              addRow([idx + 1, l.name, l.count, cd.clientName, cd.count]);
            } else {
              addRow(["", "", "", cd.clientName, cd.count]);
            }
          });
        }
      });
    }
    addRow([]);

    addRow(["DAILY ATTENDANCE LOG"]);
    addRow(["Date", "Status / Client", "Employees Assigned / Absentees"]);

    const sortedRecords = [...attendanceRecords].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    if (sortedRecords.length === 0) {
      addRow(["No daily attendance logs found."]);
    } else {
      sortedRecords.forEach((rec) => {
        const dateLabel = `${parseDateLabel(rec.date)} (${rec.date})`;
        let hasRows = false;

        if (rec.clients.length > 0) {
          rec.clients.forEach((rc, cIdx) => {
            const clientName =
              clients.find((c) => c.id === rc.clientId)?.name ??
              "Unknown Client";
            const empAssignments = rc.employees
              .map((emp) => {
                const empName =
                  employees.find((e) => e.id === emp.employeeId)?.name ??
                  "Unknown Employee";
                const shiftLabel = emp.shift === "day" ? "Day" : "Night";
                const countLabel =
                  emp.dutyCount > 1 ? ` (x${emp.dutyCount})` : "";
                return `${empName} (${shiftLabel}${countLabel})`;
              })
              .join("; ");

            if (cIdx === 0) {
              addRow([dateLabel, `Present - ${clientName}`, empAssignments]);
            } else {
              addRow(["", `Present - ${clientName}`, empAssignments]);
            }
            hasRows = true;
          });
        }

        if (rec.absentees.length > 0) {
          const absNames = rec.absentees
            .map(
              (id) =>
                employees.find((e) => e.id === id)?.name ?? "Unknown Employee",
            )
            .join("; ");
          if (hasRows) {
            addRow(["", "Absent", absNames]);
          } else {
            addRow([dateLabel, "Absent", absNames]);
          }
          hasRows = true;
        }

        if (!hasRows) {
          addRow([dateLabel, "No records", ""]);
        }
      });
    }

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_report_${selectedYear}_${(selectedMonth + 1).toString().padStart(2, "0")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("Excel report downloaded successfully!");
  };

  // ── Filtered attendance ─────────────────────────────────────────────────────

  const filteredRecords = useMemo(() => {
    return monthDates
      .map((date) => getRecord(date))
      .filter((rec) => {
        if (
          filterClient !== "all" &&
          !rec.clients.some((c) => c.clientId === filterClient)
        )
          return false;
        if (
          filterEmployee !== "all" &&
          !rec.clients.some((c) =>
            c.employees.some((e) => e.employeeId === filterEmployee),
          )
        )
          return false;
        if (
          filterShift !== "all" &&
          !rec.clients.some((c) =>
            c.employees.some((e) => e.shift === filterShift),
          )
        )
          return false;
        return true;
      });
  }, [monthDates, getRecord, filterClient, filterEmployee, filterShift]);

  const filteredClients = useMemo(
    () =>
      clients.filter((c) =>
        c.name.toLowerCase().includes(searchClient.toLowerCase()),
      ),
    [clients, searchClient],
  );

  const filteredEmployees = useMemo(
    () =>
      employees.filter((e) =>
        e.name.toLowerCase().includes(searchEmployee.toLowerCase()),
      ),
    [employees, searchEmployee],
  );

  const monthName = new Date(selectedYear, selectedMonth).toLocaleString(
    "default",
    { month: "long" },
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen w-full bg-gradient-to-br from-[#06101f] via-[#081428] to-[#0a1a36] text-slate-100 font-sans">
        {/* ── Header ── */}
        <header className="sticky top-0 z-40 border-b border-sky-900/30 bg-[#06101f]/85 backdrop-blur-xl">
          <div className="w-full px-4 sm:px-6 lg:px-10 h-12 flex items-center justify-between gap-4">
            {/* Left: Logo + Brand inline */}
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="/logo-no-bg.png"
                alt="Blue Sky Enterprises"
                className="w-7 h-7 object-contain shrink-0 drop-shadow-[0_0_6px_rgba(56,189,248,0.4)]"
              />
              <span className="text-sm font-semibold tracking-tight text-white truncate">
                Blue Sky Enterprises
              </span>
              <span className="hidden sm:inline text-slate-600">·</span>
              <span className="hidden sm:inline text-[11px] text-slate-400 font-medium truncate">
                Attendance Monitor
              </span>
            </div>

            {/* Right: Greeting + Month + Theme */}
            <div className="flex items-center gap-2 shrink-0">
              {(() => {
                const h = new Date().getHours();
                const { greet, emoji, sub } =
                  h < 12
                    ? {
                        greet: "Good Morning",
                        emoji: "☀️",
                        sub: "Have a productive day",
                      }
                    : h < 17
                      ? {
                          greet: "Good Afternoon",
                          emoji: "🌤️",
                          sub: "Keep the momentum going",
                        }
                      : h < 21
                        ? {
                            greet: "Good Evening",
                            emoji: "🌆",
                            sub: "Wrapping up strong",
                          }
                        : {
                            greet: "Good Night",
                            emoji: "🌙",
                            sub: "Burning the midnight oil",
                          };
                return (
                  <div
                    className="flex items-center gap-2 px-2.5 h-8 rounded-lg bg-gradient-to-r from-sky-500/10 to-blue-500/10 border border-sky-500/20"
                    title={sub}
                  >
                    <span className="text-sm leading-none">{emoji}</span>
                    <span className="text-[11px] font-semibold text-sky-200 leading-none">
                      {greet}
                    </span>
                  </div>
                );
              })()}
              <span className="hidden md:inline text-[11px] text-slate-300 font-medium tabular-nums px-2 h-8 leading-8 rounded-md bg-sky-950/40 border border-sky-900/40">
                {monthName} {selectedYear}
              </span>

              {/* Theme Toggle */}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled
                      aria-label="Toggle theme"
                      className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-950/40 border border-sky-900/40 text-sky-200 hover:text-amber-300 hover:border-sky-500/40 hover:bg-sky-500/10 transition-all duration-200 group disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Sun className="w-4 h-4 absolute transition-all duration-300" />
                      <Moon className="w-4 h-4 absolute transition-all duration-300 opacity-0" />
                    </button>
                  </TooltipTrigger>

                  <TooltipContent>
                    <p>🚧 Theme switcher coming soon. Work in progress.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="w-full px-4 sm:px-6 lg:px-10 py-6">
          <Tabs defaultValue="attendance" className="w-full">
            <TabsList className="bg-slate-950/60 border border-sky-900/40 mb-6 flex-wrap h-auto gap-1 p-1 w-full sm:w-auto justify-start rounded-xl">
              {[
                {
                  value: "attendance",
                  icon: <CalendarDays className="w-3.5 h-3.5" />,
                  label: "Attendance",
                },
                {
                  value: "clients",
                  icon: <Building2 className="w-3.5 h-3.5" />,
                  label: "Clients",
                },
                {
                  value: "employees",
                  icon: <Users className="w-3.5 h-3.5" />,
                  label: "Employees",
                },
                {
                  value: "analytics",
                  icon: <BarChart3 className="w-3.5 h-3.5" />,
                  label: "Analytics",
                },
                {
                  value: "settings",
                  icon: <Settings className="w-3.5 h-3.5" />,
                  label: "Settings",
                },
              ].map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-sky-500 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-900/40 text-slate-400 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                >
                  {t.icon}
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ══ ATTENDANCE TAB ══ */}
            <TabsContent value="attendance">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-5">
                <SearchableSelect
                  value={filterClient}
                  onValueChange={setFilterClient}
                  options={[
                    { value: "all", label: "All Clients" },
                    ...clients.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  placeholder="All Clients"
                  searchPlaceholder="Search clients…"
                  emptyText="No clients found."
                  className="w-full sm:w-44"
                />
                <SearchableSelect
                  value={filterEmployee}
                  onValueChange={setFilterEmployee}
                  options={[
                    { value: "all", label: "All Employees" },
                    ...employees.map((e) => ({ value: e.id, label: e.name })),
                  ]}
                  placeholder="All Employees"
                  searchPlaceholder="Search employees…"
                  emptyText="No employees found."
                  className="w-full sm:w-48"
                />
                <SearchableSelect
                  value={filterShift}
                  onValueChange={setFilterShift}
                  options={[
                    { value: "all", label: "All Shifts" },
                    { value: "day", label: "Day", icon: <Sun className="w-3 h-3 text-amber-400" /> },
                    { value: "night", label: "Night", icon: <Moon className="w-3 h-3 text-indigo-400" /> },
                  ]}
                  placeholder="All Shifts"
                  searchPlaceholder="Search shifts…"
                  emptyText="No shifts found."
                  className="w-full sm:w-36"
                />
                {(filterClient !== "all" ||
                  filterEmployee !== "all" ||
                  filterShift !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs text-slate-400 hover:text-white hover:bg-sky-900/40"
                    onClick={() => {
                      setFilterClient("all");
                      setFilterEmployee("all");
                      setFilterShift("all");
                    }}
                  >
                    <X className="w-3 h-3 mr-1" /> Clear
                  </Button>
                )}
              </div>

              {filteredRecords.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No attendance records match the filters.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {filteredRecords.map((rec) => {
                    const clientsToShow =
                      filterClient !== "all"
                        ? rec.clients.filter((c) => c.clientId === filterClient)
                        : rec.clients;
                    return (
                       <Card
                          key={rec.date}
                          className={`group/card relative border transition-all duration-300 rounded-2xl overflow-hidden backdrop-blur-sm ${
                            lockedDates[rec.date]
                              ? "bg-gradient-to-br from-amber-950/40 via-slate-950/80 to-slate-950/90 border-amber-800/40 hover:border-amber-600/60 shadow-lg shadow-amber-950/20"
                              : "bg-gradient-to-br from-slate-900/80 via-slate-950/70 to-slate-950/90 border-sky-900/40 hover:border-sky-500/60 hover:shadow-xl hover:shadow-sky-950/40 hover:-translate-y-0.5"
                          }`}
                        >
                          {/* Accent top border */}
                          <div
                            className={`absolute top-0 left-0 right-0 h-[2px] ${
                              lockedDates[rec.date]
                                ? "bg-gradient-to-r from-transparent via-amber-600/60 to-transparent"
                                : "bg-gradient-to-r from-transparent via-sky-500/60 to-transparent"
                            }`}
                          />

                          <CardHeader
                            className={`relative group pb-2.5 px-3.5 pt-3 flex flex-row items-center justify-between gap-2 border-b ${
                              lockedDates[rec.date]
                                ? "bg-gradient-to-r from-amber-950/40 via-amber-950/10 to-transparent border-amber-900/30"
                                : "bg-gradient-to-r from-sky-950/50 via-sky-950/10 to-transparent border-sky-900/30"
                            }`}
                          >
                            {/* Left: Lock + Date + Locked pill */}
                            <div className="flex items-center gap-2 min-w-0">
                              {!lockedDates[rec.date] && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 rounded-lg shrink-0 text-slate-500 hover:text-amber-400 hover:bg-amber-950/50 transition-all duration-200 hover:scale-110"
                                      onClick={() => toggleLock(rec.date)}
                                    >
                                      <LockOpen className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-800 text-slate-200 text-xs border-sky-900/50">
                                    Lock this date
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              <div className="flex items-baseline gap-1.5">
                                <CardTitle
                                  className={`text-2xl font-bold font-mono leading-none tracking-tight ${
                                    lockedDates[rec.date]
                                      ? "text-amber-400/80"
                                      : "bg-gradient-to-br from-sky-200 to-sky-400 bg-clip-text text-transparent"
                                  }`}
                                >
                                  {rec.date.split("-")[2]}
                                </CardTitle>
                                {lockedDates[rec.date] && 
                                <span
                                  className={`text-[10px] uppercase tracking-widest font-semibold ${
                                    lockedDates[rec.date] ? "text-amber-700/60" : "text-sky-700/70"
                                  }`}
                                >
                                  {rec.date.split("-")[1]}
                                </span>
                                }
                              </div>
                            </div>

                            {/* Right: Actions (hidden when locked) + Copy */}
                            <div className="flex items-center gap-0.5 shrink-0">
                              {!lockedDates[rec.date] && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs px-2.5 rounded-lg transition-all text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/60 hover:shadow-sm hover:shadow-emerald-950/50 font-medium"
                                    onClick={() => {
                                      if (rec.date > todayStr) {
                                        addToast("Cannot record attendance for future dates", "error");
                                        return;
                                      }
                                      setAttClientId("");
                                      setAttEmployeeId("");
                                      setAttShift("day");
                                      setAddAttendanceDialog({ open: true, date: rec.date });
                                    }}
                                  >
                                    <Plus className="w-3 h-3 mr-0.5" /> Assign
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs px-2.5 rounded-lg transition-all text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 hover:shadow-sm hover:shadow-rose-950/50 font-medium"
                                    onClick={() => {
                                      if (rec.date > todayStr) {
                                        addToast("Cannot mark absentees for future dates", "error");
                                        return;
                                      }
                                      setAbsenteeId("");
                                      setAddAbsenteeDialog({ open: true, date: rec.date });
                                    }}
                                  >
                                    <UserX className="w-3 h-3 mr-0.5" /> Absent
                                  </Button>

                                  <div className="w-px h-5 bg-gradient-to-b from-transparent via-sky-800/50 to-transparent mx-1" />
                                </>
                              )}

                              {/* Copy — revealed on hover */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 text-sky-400 hover:text-sky-200 hover:bg-sky-950/60 hover:scale-110"
                                    onClick={() => copyAttendanceMessage(rec)}
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-800 text-slate-200 text-xs border-sky-900/50">
                                  Copy attendance message
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </CardHeader>

                          {/* Body — collapsed when locked, shows suitcase lock UI */}
                          {lockedDates[rec.date] ? (
                            <CardContent className="pt-5 pb-5 flex flex-col items-center justify-center gap-3.5">
                              {/* Suitcase lock visual */}
                              <div className="flex flex-col items-center gap-2.5">
                                <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-950/70 to-amber-950/30 border border-amber-800/50 shadow-inner shadow-amber-950/50">
                                  {/* Lock shackle (top arc) */}
                                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-3.5 rounded-t-full border-[2.5px] border-amber-700/70 border-b-0" />
                                  {/* Lock body icon */}
                                  <Lock className="w-6 h-6 text-amber-500/90 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
                                  {/* Subtle glow */}
                                  <div className="absolute inset-0 rounded-2xl bg-amber-500/5 blur-md -z-10" />
                                </div>
                                <p className="text-[11px] text-amber-600/80 font-semibold tracking-wider uppercase">
                                  Date is locked
                                </p>
                              </div>

                              {/* Unlock button */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 text-xs px-3.5 rounded-lg border border-amber-800/50 bg-gradient-to-b from-amber-950/40 to-amber-950/20 text-amber-300 hover:text-amber-100 hover:bg-amber-900/50 hover:border-amber-600/70 hover:shadow-md hover:shadow-amber-950/40 transition-all gap-1.5 font-medium"
                                    onClick={() => toggleLock(rec.date)}
                                  >
                                    <LockOpen className="w-3.5 h-3.5" />
                                    Unlock to edit
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-800 text-slate-200 text-xs border-sky-900/50">
                                  Unlock this date to make changes
                                </TooltipContent>
                              </Tooltip>
                            </CardContent>
                          ) : (
                            <CardContent className="space-y-3 pt-3.5 px-3.5 pb-3.5">
                              {clientsToShow.length === 0 && rec.absentees.length === 0 ? (
                                <div className="flex items-center justify-center py-4">
                                  <p className="text-xs text-slate-600 italic">No records for this day</p>
                                </div>
                              ) : (
                                <>
                                  {clientsToShow.map((cl) => {
                                    const clientName =
                                      clients.find((c) => c.id === cl.clientId)?.name ?? "Unknown";
                                    const empsToShow =
                                      filterEmployee !== "all"
                                        ? cl.employees.filter((e) => e.employeeId === filterEmployee)
                                        : cl.employees;
                                    const shiftFiltered =
                                      filterShift !== "all"
                                        ? empsToShow.filter((e) => e.shift === filterShift)
                                        : empsToShow;
                                    if (shiftFiltered.length === 0) return null;
                                    return (
                                      <div key={cl.clientId} className="rounded-lg bg-slate-900/40 border border-sky-900/20 p-2 hover:border-sky-800/40 transition-colors">
                                        <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 mb-2">
                                          <div className="p-0.5 rounded bg-sky-950/60">
                                            <Building2 className="w-3 h-3 text-sky-400" />
                                          </div>
                                          <span className="truncate">{clientName}</span>
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {shiftFiltered.map((emp) => {
                                            const empName =
                                              employees.find((e) => e.id === emp.employeeId)?.name ?? "Unknown";
                                            return (
                                              <Tooltip key={`${emp.employeeId}-${emp.shift}`}>
                                                <TooltipTrigger asChild>
                                                  <Badge
                                                    className={`text-xs cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded-md transition-all hover:scale-105 hover:shadow-md ${
                                                      emp.shift === "night"
                                                        ? "bg-gradient-to-br from-indigo-950 to-indigo-900/80 text-indigo-200 hover:from-indigo-900 hover:to-indigo-800 border border-indigo-700/60 hover:shadow-indigo-950/50"
                                                        : "bg-gradient-to-br from-amber-950 to-amber-900/80 text-amber-200 hover:from-amber-900 hover:to-amber-800 border border-amber-700/60 hover:shadow-amber-950/50"
                                                    }`}
                                                    onClick={() => {
                                                      if (rec.date > todayStr) {
                                                        addToast("Cannot modify attendance for future dates", "error");
                                                        return;
                                                      }
                                                      removeAssignment(rec.date, cl.clientId, emp.employeeId, emp.shift);
                                                    }}
                                                  >
                                                    {emp.shift === "night" ? (
                                                      <Moon className="w-2.5 h-2.5" />
                                                    ) : (
                                                      <Sun className="w-2.5 h-2.5" />
                                                    )}
                                                    <span className="font-medium">{empName}</span>
                                                    {emp.dutyCount > 1 && (
                                                      <span className="ml-0.5 px-1 rounded-sm bg-black/30 text-[10px] font-bold">
                                                        ×{emp.dutyCount}
                                                      </span>
                                                    )}
                                                    <X className="w-2.5 h-2.5 opacity-40 hover:opacity-100 transition-opacity" />
                                                  </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-slate-800 text-slate-200 text-xs border-sky-900/50">
                                                  Click to remove one duty
                                                </TooltipContent>
                                              </Tooltip>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {rec.absentees.length > 0 && (
                                    <div className="rounded-lg bg-rose-950/10 border border-rose-900/20 p-2">
                                      <p className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 mb-2">
                                        <div className="p-0.5 rounded bg-rose-950/60">
                                          <UserX className="w-3 h-3" />
                                        </div>
                                        Absentees
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {rec.absentees.map((empId) => {
                                          const empName =
                                            employees.find((e) => e.id === empId)?.name ?? "Unknown";
                                          return (
                                            <Badge
                                              key={empId}
                                              className="text-xs px-2 py-0.5 rounded-md bg-gradient-to-br from-rose-950 to-rose-900/80 text-rose-200 border border-rose-800/60 cursor-pointer hover:from-rose-900 hover:to-rose-800 hover:scale-105 hover:shadow-md hover:shadow-rose-950/50 transition-all font-medium"
                                              onClick={() => removeAbsentee(rec.date, empId)}
                                            >
                                              {empName}
                                              <X className="w-2.5 h-2.5 ml-1 opacity-50" />
                                            </Badge>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </CardContent>
                          )}
                        </Card>

                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ══ CLIENTS TAB ══ */}
            <TabsContent value="clients">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
                <div className="relative flex-1 sm:max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    className="pl-8 bg-slate-950/60 border-sky-900/40 text-sm h-9 rounded-lg"
                    placeholder="Search clients…"
                    value={searchClient}
                    onChange={(e) => setSearchClient(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-sky-500 to-blue-700 hover:from-sky-400 hover:to-blue-600 text-white h-9 shadow-md shadow-blue-950/40 rounded-lg"
                  onClick={openAddClient}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Client
                </Button>
              </div>
              {filteredClients.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No clients yet.</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredClients.map((c) => (
                    <Card
                      key={c.id}
                      className="bg-slate-950/60 border-sky-900/40 hover:border-sky-600/60 flex flex-row items-center justify-between px-4 py-3 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-700 to-blue-900 flex items-center justify-center text-sky-100 text-xs font-bold shrink-0 shadow-inner">
                          {c.name[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-200 truncate">
                          {c.name}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-white hover:bg-sky-900/40"
                          onClick={() => openEditClient(c)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40"
                          onClick={() => setDeleteClientDialog(c)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ══ EMPLOYEES TAB ══ */}
            <TabsContent value="employees">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
                <div className="relative flex-1 sm:max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    className="pl-8 bg-slate-950/60 border-sky-900/40 text-sm h-9 rounded-lg"
                    placeholder="Search employees…"
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-sky-500 to-blue-700 hover:from-sky-400 hover:to-blue-600 text-white h-9 shadow-md shadow-blue-950/40 rounded-lg"
                  onClick={openAddEmployee}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Employee
                </Button>
              </div>
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No employees yet.</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredEmployees.map((e) => {
                    const duties =
                      stats.leaderboard.find((l) => l.id === e.id)?.count ?? 0;
                    return (
                      <Card
                        key={e.id}
                        className="bg-slate-950/60 border-sky-900/40 hover:border-sky-600/60 flex flex-row items-center justify-between px-4 py-3 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-sky-800 flex items-center justify-center text-sky-100 text-xs font-bold shrink-0 shadow-inner">
                            {e.name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">
                              {e.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {duties} {duties === 1 ? "duty" : "duties"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-500 hover:text-white hover:bg-sky-900/40"
                            onClick={() => openEditEmployee(e)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40"
                            onClick={() => setDeleteEmployeeDialog(e)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ══ ANALYTICS TAB ══ */}
            <TabsContent value="analytics">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-base font-semibold text-slate-200">
                    Monthly Analytics
                  </h2>
                  <p className="text-xs text-slate-500">
                    Summary stats and performance leaderboard
                  </p>
                </div>
                <TooltipProvider>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            disabled={!stats.leaderboard.length}
                            onClick={downloadAnalyticsReport}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs px-3.5 py-2 h-9 rounded-xl flex items-center gap-1.5 border border-sky-900/40 shadow-md cursor-pointer"
                          >
                            <Download className="w-4 h-4 text-sky-400" />
                            Download TXT
                          </Button>
                        </span>
                      </TooltipTrigger>

                      {!stats.leaderboard.length && (
                        <TooltipContent>
                          <p>Add attendance records to enable export.</p>
                        </TooltipContent>
                      )}
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            disabled={!stats.leaderboard.length}
                            onClick={downloadAnalyticsExcel}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-2 h-9 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 border border-emerald-500/20 cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                            Download Excel
                          </Button>
                        </span>
                      </TooltipTrigger>

                      {!stats.leaderboard.length && (
                        <TooltipContent>
                          <p>Add attendance records to enable export.</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
                {[
                  {
                    label: "Total Clients",
                    value: stats.totalClients,
                    icon: <Building2 className="w-5 h-5" />,
                    color: "text-sky-400",
                    glow: "from-sky-500/10",
                  },
                  {
                    label: "Total Employees",
                    value: stats.totalEmployees,
                    icon: <Users className="w-5 h-5" />,
                    color: "text-blue-400",
                    glow: "from-blue-500/10",
                  },
                  {
                    label: "Total Duties",
                    value: stats.totalDuties,
                    icon: <Briefcase className="w-5 h-5" />,
                    color: "text-emerald-400",
                    glow: "from-emerald-500/10",
                  },
                  {
                    label: "Total Absentees",
                    value: stats.totalAbsentees,
                    icon: <UserX className="w-5 h-5" />,
                    color: "text-rose-400",
                    glow: "from-rose-500/10",
                  },
                ].map((s) => (
                  <Card
                    key={s.label}
                    className={`bg-gradient-to-br ${s.glow} to-slate-950/60 border-sky-900/40 px-5 py-4 rounded-xl hover:border-sky-600/60 transition-colors`}
                  >
                    <div className={`${s.color} mb-2`}>{s.icon}</div>
                    <p className="text-3xl font-bold text-white tabular-nums">
                      {s.value}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  </Card>
                ))}
              </div>

              {stats.topEmployee && (
                <Card className="bg-gradient-to-br from-amber-950/60 via-amber-900/20 to-transparent border-amber-800/60 mb-6 px-5 py-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-900/40 border border-amber-700/50 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-amber-500 uppercase tracking-[0.18em] font-semibold">
                        Top Performer
                      </p>
                      <p className="text-xl font-bold text-amber-100">
                        {stats.topEmployee.name}
                      </p>
                      <p className="text-sm text-amber-400">
                        {stats.topEmployee.count} duties
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="bg-slate-950/60 border-sky-900/40 rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Duty Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.leaderboard.length === 0 ? (
                    <p className="text-sm text-slate-600">
                      No duties assigned yet.
                    </p>
                  ) : (
                    <ScrollArea className="h-[28rem]">
                      <div className="space-y-2 pr-3">
                        {stats.leaderboard.map((l, i) => {
                          const rankStyles =
                            i === 0
                              ? "from-amber-500/20 to-amber-900/5 border-amber-500/40 text-amber-300"
                              : i === 1
                                ? "from-slate-400/15 to-slate-700/5 border-slate-400/30 text-slate-200"
                                : i === 2
                                  ? "from-orange-500/15 to-orange-900/5 border-orange-500/30 text-orange-300"
                                  : "from-sky-950/40 to-sky-950/10 border-sky-900/40 text-slate-400";
                          const medal =
                            i === 0
                              ? "🥇"
                              : i === 1
                                ? "🥈"
                                : i === 2
                                  ? "🥉"
                                  : null;

                          const isExpanded = expandedLeaders.includes(l.id);
                          const hasClients = l.clientDistribution.length > 0;

                          return (
                            <div
                              key={l.id}
                              className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${rankStyles} transition-all hover:shadow-lg hover:shadow-sky-900/20`}
                            >
                              {/* subtle glow for top 3 */}
                              {i < 3 && (
                                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-current opacity-10 blur-2xl" />
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedLeaders((prev) =>
                                    prev.includes(l.id)
                                      ? prev.filter((id) => id !== l.id)
                                      : [...prev, l.id],
                                  )
                                }
                                className="w-full flex items-center gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 rounded-2xl"
                              >
                                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#06101f]/70 border border-white/5 font-bold tabular-nums">
                                  {medal ? (
                                    <span className="text-lg">{medal}</span>
                                  ) : (
                                    <span className="text-sm text-slate-500">
                                      #{i + 1}
                                    </span>
                                  )}
                                </div>

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-800 text-sm font-bold text-white shadow-md shadow-sky-900/40 ring-1 ring-sky-400/30">
                                  {l.name[0]?.toUpperCase()}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-slate-100">
                                    {l.name}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {l.clientDistribution.length} client
                                    {l.clientDistribution.length === 1
                                      ? ""
                                      : "s"}
                                  </p>
                                </div>

                                <div className="flex flex-col items-end">
                                  <span className="text-lg font-bold tabular-nums text-sky-300 leading-none">
                                    {l.count}
                                  </span>
                                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                                    duties
                                  </span>
                                </div>

                                <ChevronDown
                                  className={`h-4 w-4 text-slate-500 shrink-0 transition-transform duration-300 ${
                                    isExpanded ? "rotate-180 text-sky-400" : ""
                                  }`}
                                />
                              </button>

                              {/* Expandable details */}
                              <div
                                className={`grid transition-all duration-300 ease-in-out ${
                                  isExpanded
                                    ? "grid-rows-[1fr] opacity-100"
                                    : "grid-rows-[0fr] opacity-0"
                                }`}
                              >
                                <div className="overflow-hidden">
                                  <div className="px-4 pb-3 pt-1 border-t border-white/5">
                                    {hasClients ? (
                                      <div className="mt-3 flex flex-wrap gap-1.5">
                                        {l.clientDistribution.map((cd) => (
                                          <div
                                            key={cd.clientId}
                                            className="flex items-center gap-1.5 rounded-lg border border-sky-900/40 bg-sky-950/40 px-2 py-1 text-[11px] text-slate-300 hover:border-sky-700/60 transition-colors"
                                          >
                                            <Building2 className="h-3 w-3 text-sky-500/70" />
                                            <span className="truncate max-w-[120px]">
                                              {cd.clientName}
                                            </span>
                                            <span className="rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-sky-300">
                                              {cd.count}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="mt-2 text-[11px] italic text-slate-600 flex items-center gap-1.5">
                                        <Info className="h-3 w-3" />
                                        No client assignments
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══ SETTINGS TAB ══ */}
            <TabsContent value="settings">
              <Card className="bg-slate-950/60 border-rose-900/40 max-w-2xl rounded-xl">
                <CardHeader>
                  <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Danger Zone — Clear Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    {
                      key: "all",
                      label: "Clear All Data",
                      desc: "Removes clients, employees & all attendance",
                    },
                    {
                      key: "clients",
                      label: "Clear Clients Only",
                      desc: "Removes all clients and their attendance",
                    },
                    {
                      key: "employees",
                      label: "Clear Employees Only",
                      desc: "Removes all employees and related records",
                    },
                    {
                      key: "attendance",
                      label: "Clear Attendance Only",
                      desc: "Removes all daily attendance records",
                    },
                  ].map((opt) => (
                    <div
                      key={opt.key}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-b border-slate-800 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          {opt.label}
                        </p>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs bg-rose-900/60 hover:bg-rose-700 text-rose-100 border border-rose-800 self-start sm:self-auto"
                        onClick={() => setClearDialog(opt.key)}
                      >
                        Clear
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        {/* ══ DIALOGS ══ */}

        {/* Add/Edit Client */}
        <Dialog
          open={clientDialog.open}
          onOpenChange={(o) =>
            !o && setClientDialog({ open: false, editing: null })
          }
        >
          <DialogContent className="bg-slate-900 border-sky-900/50 text-slate-100 max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle>
                {clientDialog.editing ? "Edit Client" : "Add Client"}
              </DialogTitle>
            </DialogHeader>
            <Input
              className="bg-slate-950/60 border-sky-900/40 text-slate-100 mt-2"
              placeholder="Client name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveClient()}
              autoFocus
            />
            <DialogFooter className="mt-4">
              <Button
                variant="ghost"
                className="text-slate-400"
                onClick={() => setClientDialog({ open: false, editing: null })}
              >
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-sky-500 to-blue-700 hover:from-sky-400 hover:to-blue-600 text-white"
                onClick={saveClient}
              >
                {clientDialog.editing ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Employee */}
        <Dialog
          open={employeeDialog.open}
          onOpenChange={(o) =>
            !o && setEmployeeDialog({ open: false, editing: null })
          }
        >
          <DialogContent className="bg-slate-900 border-sky-900/50 text-slate-100 max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle>
                {employeeDialog.editing ? "Edit Employee" : "Add Employee"}
              </DialogTitle>
            </DialogHeader>
            <Input
              className="bg-slate-950/60 border-sky-900/40 text-slate-100 mt-2"
              placeholder="Employee name"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveEmployee()}
              autoFocus
            />
            <DialogFooter className="mt-4">
              <Button
                variant="ghost"
                className="text-slate-400"
                onClick={() =>
                  setEmployeeDialog({ open: false, editing: null })
                }
              >
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-sky-500 to-blue-700 hover:from-sky-400 hover:to-blue-600 text-white"
                onClick={saveEmployee}
              >
                {employeeDialog.editing ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Client */}
        <AlertDialog
          open={!!deleteClientDialog}
          onOpenChange={(o) => !o && setDeleteClientDialog(null)}
        >
          <AlertDialogContent className="bg-slate-900 border-sky-900/50 text-slate-100 rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Client</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Remove{" "}
                <strong className="text-slate-200">
                  "{deleteClientDialog?.name}"
                </strong>
                ? This will also delete their attendance assignments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-800 border-sky-900/40 text-slate-300 hover:bg-slate-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-700 hover:bg-rose-600"
                onClick={() =>
                  deleteClientDialog && deleteClient(deleteClientDialog)
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Employee */}
        <AlertDialog
          open={!!deleteEmployeeDialog}
          onOpenChange={(o) => !o && setDeleteEmployeeDialog(null)}
        >
          <AlertDialogContent className="bg-slate-900 border-sky-900/50 text-slate-100 rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Employee</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Remove{" "}
                <strong className="text-slate-200">
                  "{deleteEmployeeDialog?.name}"
                </strong>
                ? All their records will be erased.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-800 border-sky-900/40 text-slate-300 hover:bg-slate-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-700 hover:bg-rose-600"
                onClick={() =>
                  deleteEmployeeDialog && deleteEmployee(deleteEmployeeDialog)
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Attendance */}
        <Dialog
          open={!!addAttendanceDialog}
          onOpenChange={(o) => !o && setAddAttendanceDialog(null)}
        >
          <DialogContent className="bg-slate-900 border-sky-900/50 text-slate-100 max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle>Add Attendance</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <SearchableSelect
                value={attClientId}
                onValueChange={setAttClientId}
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Select Client"
                searchPlaceholder="Search client…"
                emptyText="No client found."
              />
              <SearchableSelect
                value={attEmployeeId}
                onValueChange={setAttEmployeeId}
                options={employees
                  .filter(
                    (e) =>
                      !getRecord(
                        addAttendanceDialog?.date ?? "",
                      ).absentees.includes(e.id),
                  )
                  .map((e) => ({ value: e.id, label: e.name }))}
                placeholder="Select Employee"
                searchPlaceholder="Search employee…"
                emptyText="No employee found."
              />
              <SearchableSelect
                value={attShift}
                onValueChange={(v) => setAttShift(v as "day" | "night")}
                options={[
                  { value: "day", label: "Day Shift", icon: <Sun className="w-3.5 h-3.5 text-amber-400" /> },
                  { value: "night", label: "Night Shift", icon: <Moon className="w-3.5 h-3.5 text-indigo-400" /> },
                ]}
                placeholder="Select Shift"
                searchPlaceholder="Search shift…"
              />
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="ghost"
                className="text-slate-400"
                onClick={() => setAddAttendanceDialog(null)}
              >
                Cancel
              </Button>
              <Button
                className="bg-emerald-700 hover:bg-emerald-600 text-white"
                disabled={!attClientId || !attEmployeeId}
                onClick={addAttendance}
              >
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Absentee */}
        <Dialog
          open={!!addAbsenteeDialog}
          onOpenChange={(o) => !o && setAddAbsenteeDialog(null)}
        >
          <DialogContent className="bg-slate-900 border-sky-900/50 text-slate-100 max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle>
                Mark Absent —{" "}
                {addAbsenteeDialog && parseDateLabel(addAbsenteeDialog.date)}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              <SearchableSelect
                value={absenteeId}
                onValueChange={setAbsenteeId}
                options={employees
                  .filter((e) => {
                    const record = getRecord(addAbsenteeDialog?.date ?? "");
                    const isAbsent = record.absentees.includes(e.id);
                    const isPresent = record.clients.some((cl) =>
                      cl.employees.some((emp) => emp.employeeId === e.id),
                    );
                    return !isAbsent && !isPresent;
                  })
                  .map((e) => ({ value: e.id, label: e.name }))}
                placeholder="Select Employee"
                searchPlaceholder="Search employee…"
                emptyText="No employee found."
              />
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="ghost"
                className="text-slate-400"
                onClick={() => setAddAbsenteeDialog(null)}
              >
                Cancel
              </Button>
              <Button
                className="bg-rose-700 hover:bg-rose-600 text-white"
                disabled={!absenteeId}
                onClick={addAbsentee}
              >
                Mark Absent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clear Confirmation */}
        <AlertDialog
          open={!!clearDialog}
          onOpenChange={(o) => !o && setClearDialog(null)}
        >
          <AlertDialogContent className="bg-slate-900 border-sky-900/50 text-slate-100 rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Clear</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                This action is irreversible. All selected data will be
                permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-800 border-sky-900/40 text-slate-300 hover:bg-slate-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-700 hover:bg-rose-600"
                onClick={() => clearDialog && clearData(clearDialog)}
              >
                Yes, Clear
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </TooltipProvider>
  );
}
