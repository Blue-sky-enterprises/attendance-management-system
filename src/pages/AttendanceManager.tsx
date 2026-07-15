import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { MultiSelect } from "@/components/ui/multi-select";
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
  Wallet,
  IndianRupee,
  CheckCircle2,
  Circle,
  Receipt,
  TrendingDown,
  DatabaseBackup,
} from "lucide-react";
import type { BorrowingRecord, Client, DailyAttendance, Employee, ToastMessage } from "@/types";
import { useLocalStorage, useTheme } from "@/hooks";
import { formatDate, generateId, getDaysInMonth, parseDateLabel } from "@/utilities";
import { ToastContainer } from "@/components/toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExportPanel } from "@/components/backup/ExportPanel";
import { ImportPanel } from "@/components/backup/ImportPanel";
import { DayAttendanceEditor } from "@/components/DayAttendanceEditor";



export default function AttendanceManager() {
  const { t, i18n } = useTranslation();
  const { setTheme } = useTheme();
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
  const [borrowings, setBorrowings] = useLocalStorage<BorrowingRecord[]>("att_borrowings", []);

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


  const [editDayDialog, setEditDayDialog] = useState<string | null>(null);

  // Borrowing/Fine dialog states
  const [borrowingDialog, setBorrowingDialog] = useState<{
    open: boolean;
    editing: BorrowingRecord | null;
  }>({ open: false, editing: null });
  const [deleteBorrowingDialog, setDeleteBorrowingDialog] = useState<BorrowingRecord | null>(null);

  const [downloadClientDialog, setDownloadClientDialog] = useState<boolean>(false);
  const [downloadClientId, setDownloadClientId] = useState<string>("all");

  // Form states
  const [clientName, setClientName] = useState("");
  const [employeeName, setEmployeeName] = useState("");

  // Borrowing/Fine form states
  const [bEmployeeId, setBEmployeeId] = useState("");
  const [bAmount, setBAmount] = useState("");
  const [bDate, setBDate] = useState(todayStr);
  const [bNote, setBNote] = useState("");
  const [bType, setBType] = useState<"borrowing" | "fine">("borrowing");

  // Search/filter
  const [searchEmployee, setSearchEmployee] = useState("");
  const [searchClient, setSearchClient] = useState("");
  const [filterClient, setFilterClient] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterShift, setFilterShift] = useState("all");

  // Borrowing/Fine filters
  const [filterBEmployee, setFilterBEmployee] = useState("all");
  const [filterBType, setFilterBType] = useState("all");
  const [filterBSettled, setFilterBSettled] = useState("all");


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

  const outdatedRecord = useMemo(() => {
    const currentMonthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
    return attendanceRecords.find((rec) => {
      const isNotThisMonth = !rec.date.startsWith(currentMonthPrefix);
      const hasAssignments = rec.clients.some((c) => c.employees && c.employees.length > 0);
      const hasAbsentees = rec.absentees && rec.absentees.length > 0;
      return isNotThisMonth && (hasAssignments || hasAbsentees);
    });
  }, [attendanceRecords, selectedMonth, selectedYear]);

  // Generate all dates for selected month
  const monthDates = useMemo(() => {
    let year = selectedYear;
    let month = selectedMonth;

    if (outdatedRecord) {
      const parts = outdatedRecord.date.split("-");
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
    }

    const days = getDaysInMonth(year, month);
    return Array.from({ length: days }, (_, i) =>
      formatDate(year, month, i + 1),
    );
  }, [selectedYear, selectedMonth, outdatedRecord]);

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
    // Also remove their borrowing/fine records
    setBorrowings((prev) => prev.filter((b) => b.employeeId !== e.id));
    addToast(`Employee "${e.name}" deleted`, "info");
    setDeleteEmployeeDialog(null);
  };

  // ── Attendance ──────────────────────────────────────────────────────────────


  const handleAssign = (date: string, clientId: string, employeeIds: string[], shift: "day" | "night" | "half") => {
    updateRecord(date, (r) => {
      let updatedClients = [...r.clients];
      const clientIdx = updatedClients.findIndex((c) => c.clientId === clientId);
      
      let clientRec = clientIdx === -1 
        ? { clientId, employees: [] as typeof updatedClients[0]['employees'] }
        : { ...updatedClients[clientIdx], employees: [...updatedClients[clientIdx].employees] };

      employeeIds.forEach(empId => {
        const empIdx = clientRec.employees.findIndex(
          (e) => e.employeeId === empId && e.shift === shift,
        );

        if (empIdx === -1) {
          clientRec.employees.push({ employeeId: empId, shift, dutyCount: 1 });
        } else {
          clientRec.employees[empIdx] = {
            ...clientRec.employees[empIdx],
            dutyCount: clientRec.employees[empIdx].dutyCount + 1,
          };
        }
      });

      if (clientIdx === -1) {
        updatedClients.push(clientRec);
      } else {
        updatedClients[clientIdx] = clientRec;
      }

      return { ...r, clients: updatedClients };
    });
  };

  const removeAssignment = (
    date: string,
    clientId: string,
    employeeId: string,
    shift: "day" | "night" | "half",
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

  // const addAbsentee = () => {
  //   if (!addAbsenteeDialog || !absenteeId) return;
  //   const { date } = addAbsenteeDialog;
  //   if (date > todayStr) {
  //     addToast("Cannot record absentees for future dates", "error");
  //     return;
  //   }
  //   const rec = getRecord(date);
  //   if (rec.absentees.includes(absenteeId)) {
  //     addToast("Already marked absent", "error");
  //     return;
  //   }
  //   const isPresent = rec.clients.some((cl) =>
  //     cl.employees.some((emp) => emp.employeeId === absenteeId)
  //   );
  //   if (isPresent) {
  //     addToast("Employee is already assigned (present) on this day", "error");
  //     return;
  //   }
  //   updateRecord(date, (r) => ({
  //     ...r,
  //     absentees: [...r.absentees, absenteeId],
  //   }));
  //   addToast("Absentee marked");
  //   setAddAbsenteeDialog(null);
  // };

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
      setBorrowings([]);
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
      setBorrowings([]);
    } else if (type === "attendance") {
      setAttendanceRecords([]);
    } else if (type === "borrowings") {
      setBorrowings([]);
    }
    addToast("Data cleared", "info");
    setClearDialog(null);
  };

  // ── Borrowings / Fines CRUD ─────────────────────────────────────────────────

  const openAddBorrowing = () => {
    setBEmployeeId("");
    setBAmount("");
    setBDate(todayStr);
    setBNote("");
    setBType("borrowing");
    setBorrowingDialog({ open: true, editing: null });
  };

  const openEditBorrowing = (b: BorrowingRecord) => {
    setBEmployeeId(b.employeeId);
    setBAmount(String(b.amount));
    setBDate(b.date);
    setBNote(b.note);
    setBType(b.type);
    setBorrowingDialog({ open: true, editing: b });
  };

  const saveBorrowing = () => {
    const amt = parseFloat(bAmount);
    if (!bEmployeeId || isNaN(amt) || amt <= 0) {
      addToast("Please fill all required fields with valid values", "error");
      return;
    }
    if (borrowingDialog.editing) {
      setBorrowings((prev) =>
        prev.map((b) =>
          b.id === borrowingDialog.editing!.id
            ? { ...b, employeeId: bEmployeeId, amount: amt, date: bDate, note: bNote.trim(), type: bType }
            : b
        )
      );
      addToast("Record updated");
    } else {
      setBorrowings((prev) => [
        ...prev,
        { id: generateId(), employeeId: bEmployeeId, amount: amt, date: bDate, note: bNote.trim(), type: bType, settled: false },
      ]);
      addToast(bType === "fine" ? "Fine recorded" : "Borrowing recorded");
    }
    setBorrowingDialog({ open: false, editing: null });
  };

  const deleteBorrowing = (b: BorrowingRecord) => {
    setBorrowings((prev) => prev.filter((x) => x.id !== b.id));
    addToast("Record deleted", "info");
    setDeleteBorrowingDialog(null);
  };

  const toggleSettled = (id: string) => {
    setBorrowings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, settled: !b.settled } : b))
    );
  };

  // ── Borrowing Stats ─────────────────────────────────────────────────────────

  const borrowingStats = useMemo(() => {
    let totalBorrowed = 0;
    let totalFines = 0;
    let settledBorrowed = 0;
    let settledFines = 0;

    for (const b of borrowings) {
      if (b.type === "borrowing") {
        totalBorrowed += b.amount;
        if (b.settled) settledBorrowed += b.amount;
      } else {
        totalFines += b.amount;
        if (b.settled) settledFines += b.amount;
      }
    }

    const outstandingBorrowed = totalBorrowed - settledBorrowed;
    const outstandingFines = totalFines - settledFines;
    const totalOutstanding = outstandingBorrowed + outstandingFines;
    const totalSettled = settledBorrowed + settledFines;

    // Per-employee breakdown
    const empMap: Record<string, { borrowed: number; fines: number; settled: number }> = {};
    for (const b of borrowings) {
      if (!empMap[b.employeeId]) empMap[b.employeeId] = { borrowed: 0, fines: 0, settled: 0 };
      if (b.type === "borrowing") empMap[b.employeeId].borrowed += b.amount;
      else empMap[b.employeeId].fines += b.amount;
      if (b.settled) empMap[b.employeeId].settled += b.amount;
    }

    const perEmployee = Object.entries(empMap).map(([id, vals]) => ({
      id,
      name: employees.find((e) => e.id === id)?.name ?? "Unknown",
      ...vals,
      outstanding: vals.borrowed + vals.fines - vals.settled,
    })).sort((a, b) => b.outstanding - a.outstanding);

    return { totalBorrowed, totalFines, outstandingBorrowed, outstandingFines, totalOutstanding, totalSettled, perEmployee };
  }, [borrowings, employees]);

  const copyAttendanceMessage = async (record: DailyAttendance, shareWhatsApp = false) => {
    const date = new Date(record.date);

    const formattedDate = date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const calendarEmoji = String.fromCodePoint(0x1f4c5);
    const buildingEmoji = String.fromCodePoint(0x1f3e2);
    const crossEmoji = String.fromCodePoint(0x274c);

    let message = `${calendarEmoji} *${formattedDate}*\n\n`;

    record.clients.forEach((clientRecord) => {
      const clientName =
        clients.find((c) => c.id === clientRecord.clientId)?.name ??
        "Unknown Client";

      message += `*${buildingEmoji} ${clientName}:*\n`;

      clientRecord.employees.forEach((emp) => {
        const empName =
          employees.find((e) => e.id === emp.employeeId)?.name ??
          "Unknown Employee";

        const shiftLabel = emp.shift === "night" ? " (N)" : emp.shift === "half" ? " (H)" : " (D)";

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
      message += `*${crossEmoji} Absentees:*\n`;

      record.absentees.forEach((empId) => {
        const empName =
          employees.find((e) => e.id === empId)?.name ?? "Unknown Employee";

        message += `• ${empName}\n`;
      });

      message += "\n";
    }

    try {
      await navigator.clipboard.writeText(message);
      if (shareWhatsApp) {
        addToast("Copied & opening WhatsApp...");
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
      } else {
        addToast("Attendance copied to clipboard");
      }
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
        const clientEmpDuties: Record<string, { day: number; night: number; half: number }> = {};

        attendanceRecords.forEach((rec) => {
          const recClient = rec.clients.find((rc) => rc.clientId === c.id);
          if (recClient) {
            recClient.employees.forEach((emp) => {
              clientDuties += emp.dutyCount;
              if (!clientEmpDuties[emp.employeeId]) {
                clientEmpDuties[emp.employeeId] = { day: 0, night: 0, half: 0 };
              }
              if (emp.shift === "day") {
                clientEmpDuties[emp.employeeId].day += emp.dutyCount;
              } else if (emp.shift === "night") {
                clientEmpDuties[emp.employeeId].night += emp.dutyCount;
              } else {
                clientEmpDuties[emp.employeeId].half += emp.dutyCount;
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
            if (shiftCounts.half > 0) shiftDetails.push(`${shiftCounts.half} Half Day`);
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
              const shiftLabel = emp.shift === "day" ? "Day" : emp.shift === "night" ? "Night" : "Half Day";
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

    report += `--------------------------------------------------\n`;
    report += `5. FINES & BORROWINGS SUMMARY\n`;
    report += `--------------------------------------------------\n`;
    report += `- Total Borrowed    : Rs. ${borrowingStats.totalBorrowed.toLocaleString("en-IN")}\n`;
    report += `- Total Fines       : Rs. ${borrowingStats.totalFines.toLocaleString("en-IN")}\n`;
    report += `- Total Settled     : Rs. ${borrowingStats.totalSettled.toLocaleString("en-IN")}\n`;
    report += `- Total Outstanding : Rs. ${borrowingStats.totalOutstanding.toLocaleString("en-IN")}\n\n`;

    if (borrowingStats.perEmployee.length > 0) {
      report += `Per-Employee Outstanding:\n`;
      report += `${"-".repeat(60)}\n`;
      report += `${ "Employee Name".padEnd(28)} | ${ "Borrowed".padEnd(12)} | ${ "Fines".padEnd(12)} | Outstanding\n`;
      report += `${"-".repeat(28)}---${"---".repeat(14)}\n`;
      borrowingStats.perEmployee.forEach((ep) => {
        report += `${ep.name.padEnd(28)} | Rs.${String(ep.borrowed.toLocaleString("en-IN")).padEnd(10)} | Rs.${String(ep.fines.toLocaleString("en-IN")).padEnd(10)} | Rs.${ep.outstanding.toLocaleString("en-IN")}\n`;
      });
      report += `\n`;
    }

    if (borrowings.length > 0) {
      report += `Detailed Records:\n`;
      report += `${"-".repeat(60)}\n`;
      const sortedBorrowings = [...borrowings].sort((a, b) => a.date.localeCompare(b.date));
      sortedBorrowings.forEach((b) => {
        const empName = employees.find((e) => e.id === b.employeeId)?.name ?? "Unknown";
        const typeLabel = b.type === "fine" ? "Fine" : "Borrowing";
        const statusLabel = b.settled ? "Settled" : "Outstanding";
        report += `${b.date} | ${empName.padEnd(20)} | ${typeLabel.padEnd(10)} | Rs.${b.amount.toLocaleString("en-IN").padEnd(10)} | ${statusLabel} | ${b.note || "-"}\n`;
      });
    } else {
      report += `No fines or borrowing records found.\n`;
    }
    report += `\n`;

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
                const shiftLabel = emp.shift === "day" ? "Day" : emp.shift === "night" ? "Night" : "Half Day";
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

    // Fines & Borrowings section
    addRow([]);
    addRow(["FINES & BORROWINGS SUMMARY"]);
    addRow(["Total Borrowed", `Rs. ${borrowingStats.totalBorrowed.toLocaleString("en-IN")}`]);
    addRow(["Total Fines", `Rs. ${borrowingStats.totalFines.toLocaleString("en-IN")}`]);
    addRow(["Total Settled", `Rs. ${borrowingStats.totalSettled.toLocaleString("en-IN")}`]);
    addRow(["Total Outstanding", `Rs. ${borrowingStats.totalOutstanding.toLocaleString("en-IN")}`]);
    addRow([]);

    addRow(["PER-EMPLOYEE BREAKDOWN"]);
    addRow(["Employee", "Borrowed", "Fines", "Settled", "Outstanding"]);
    if (borrowingStats.perEmployee.length === 0) {
      addRow(["No records"]);
    } else {
      borrowingStats.perEmployee.forEach((ep) => {
        addRow([ep.name, `Rs. ${ep.borrowed.toLocaleString("en-IN")}`, `Rs. ${ep.fines.toLocaleString("en-IN")}`, `Rs. ${ep.settled.toLocaleString("en-IN")}`, `Rs. ${ep.outstanding.toLocaleString("en-IN")}`]);
      });
    }
    addRow([]);

    addRow(["DETAILED FINE & BORROWING RECORDS"]);
    addRow(["Date", "Employee", "Type", "Amount", "Status", "Note/Reason"]);
    if (borrowings.length === 0) {
      addRow(["No records found."]);
    } else {
      const sortedBorrowings = [...borrowings].sort((a, b) => a.date.localeCompare(b.date));
      sortedBorrowings.forEach((b) => {
        const empName = employees.find((e) => e.id === b.employeeId)?.name ?? "Unknown";
        addRow([b.date, empName, b.type === "fine" ? "Fine" : "Borrowing", `Rs. ${b.amount.toLocaleString("en-IN")}`, b.settled ? "Settled" : "Outstanding", b.note || "-"]);
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

  const downloadClientWiseExcel = () => {
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

    addRow(["BLUE SKY ENTERPRISES - CLIENT WISE ATTENDANCE REPORT"]);
    if (downloadClientId !== "all") {
      const selectedClient = clients.find(c => c.id === downloadClientId);
      addRow(["Client Name", selectedClient?.name || ""]);
    }
    addRow(["Report Month", reportDateStr]);
    addRow(["Generated On", timestamp]);
    addRow([]);

    const sortedRecords = [...attendanceRecords].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    const clientsToExport = downloadClientId === "all" ? clients : clients.filter(c => c.id === downloadClientId);

    if (clientsToExport.length === 0) {
      addRow(["No clients found."]);
    } else {
      clientsToExport.forEach((client) => {
        if (downloadClientId === "all") {
          addRow([`Client: ${client.name}`]);
        }
        addRow(["Date", "Employee Name", "Shift"]);
        
        let hasRecords = false;

        sortedRecords.forEach((rec) => {
          const clientRec = rec.clients.find((c) => c.clientId === client.id);
          if (clientRec) {
            clientRec.employees.forEach((emp) => {
              const empName =
                employees.find((e) => e.id === emp.employeeId)?.name ??
                "Unknown Employee";
              const shiftLabel = emp.shift === "day" ? "Day" : emp.shift === "night" ? "Night" : "Half Day";
              
              const [y, m, d] = rec.date.split("-");
              const formattedDate = `${d}/${m}/${y}`;
              
              addRow([
                formattedDate,
                empName,
                shiftLabel,
              ]);
              hasRecords = true;
            });
          }
        });

        if (!hasRecords) {
          addRow(["No assignments for this month", "", ""]);
        }
        addRow([]);
      });
    }

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    let filenameClientPart = "All_Clients";
    if (downloadClientId !== "all") {
      const selectedClient = clients.find(c => c.id === downloadClientId);
      if (selectedClient) {
        filenameClientPart = selectedClient.name.replace(/[^a-z0-9]/gi, '_');
      }
    }
    link.download = `${filenameClientPart}_Attendance_Report_${monthName}_${selectedYear}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("Client wise report downloaded successfully!");
    setDownloadClientDialog(false);
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
      <div className="app-shell min-h-screen w-full bg-gradient-to-br from-[#06101f] via-[#081428] to-[#0a1a36] text-slate-100 font-sans">
        {/* ── Header ── */}
       <header
  className="sticky top-0 z-40 backdrop-blur-xl"
  style={{
    background: "var(--surface-header)",
    borderBottom: "1px solid var(--border-default)",
  }}
>
  <div className="w-full px-4 sm:px-6 lg:px-10 h-12 flex items-center justify-between gap-4">
    {/* Left: Logo + Brand */}
    <div className="flex items-center gap-2 min-w-0">
      <img
        src="/logo-no-bg.png"
        alt="Blue Sky Enterprises"
        className="w-7 h-7 object-contain shrink-0"
        style={{
          filter: "drop-shadow(0 0 8px var(--accent-glow))",
        }}
      />

      <span
        className="text-sm font-semibold tracking-tight truncate"
        style={{ color: "var(--text-heading)" }}
      >
        Blue Sky Enterprises
      </span>

      <span
        className="hidden sm:inline"
        style={{ color: "var(--text-muted)" }}
      >
        ·
      </span>

      <span
        className="hidden sm:inline text-[11px] font-medium truncate"
        style={{ color: "var(--text-secondary)" }}
      >
        Attendance Monitor
      </span>
    </div>

    {/* Right */}
    <div className="flex items-center gap-2 shrink-0">
      {(() => {
        const h = new Date().getHours();

        const { greet, emoji, sub } =
          h < 12
            ? {
                greet: t("app.greet_morning"),
                emoji: "☀️",
                sub: t("app.greet_morning_sub"),
              }
            : h < 17
            ? {
                greet: t("app.greet_afternoon"),
                emoji: "🌤️",
                sub: t("app.greet_afternoon_sub"),
              }
            : h < 21
            ? {
                greet: t("app.greet_evening"),
                emoji: "🌆",
                sub: t("app.greet_evening_sub"),
              }
            : {
                greet: t("app.greet_night"),
                emoji: "🌙",
                sub: t("app.greet_night_sub"),
              };

        return (
          <div
            className="flex items-center gap-2 px-2.5 h-8 rounded-lg"
            title={sub}
            style={{
              background:
                "linear-gradient(135deg, var(--accent-glow), rgba(64,138,113,.15))",
              border: "1px solid var(--border-accent)",
            }}
          >
            <span className="text-sm leading-none">{emoji}</span>

            <span
              className="text-[11px] font-semibold leading-none"
              style={{ color: "var(--accent-400)" }}
            >
              {greet}
            </span>
          </div>
        );
      })()}

      <span
        className="hidden md:inline text-[11px] font-medium tabular-nums px-2 h-8 leading-8 rounded-md"
        style={{
          color: "var(--text-primary)",
          background: "var(--surface-2)",
          border: "1px solid var(--border-default)",
        }}
      >
        {monthName} {selectedYear}
      </span>

      {/* Language Switcher */}
      <div
        className="flex items-center gap-1 p-0.5 rounded-lg shrink-0"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border-default)",
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => i18n.changeLanguage("en")}
          className="h-7 px-2.5 text-[11px] font-semibold rounded-md transition-all"
          style={
            i18n.language.startsWith("en")
              ? {
                  background:
                    "linear-gradient(135deg,var(--accent-500),var(--accent-600))",
                  color: "#fff",
                  boxShadow: "0 4px 12px var(--accent-glow)",
                }
              : {
                  color: "var(--text-secondary)",
                }
          }
        >
          EN
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => i18n.changeLanguage("ml")}
          className="h-7 px-2.5 text-[11px] font-semibold rounded-md transition-all"
          style={
            i18n.language.startsWith("ml")
              ? {
                  background:
                    "linear-gradient(135deg,var(--accent-500),var(--accent-600))",
                  color: "#fff",
                  boxShadow: "0 4px 12px var(--accent-glow)",
                }
              : {
                  color: "var(--text-secondary)",
                }
          }
        >
          ML
        </Button>
      </div>

      {/* Theme Toggle */}
      <ThemeToggle />
    </div>
  </div>
</header>

        {/* ── Main Content ── */}
        <main className="w-full px-4 sm:px-6 lg:px-10 py-6">
          <Tabs defaultValue="attendance" className="w-full">
<TabsList
  className="
    mb-6
    flex-wrap
    h-auto
    gap-1
    p-1
    w-full
    sm:w-auto
    justify-start
    rounded-xl
    bg-[var(--surface-card)]
    backdrop-blur-md
    border
    border-[var(--border-default)]
    shadow-md
  "
>              {[
                {
                  value: "attendance",
                  icon: <CalendarDays className="w-3.5 h-3.5" />,
                  label: t('tabs.attendance'),
                },
                {
                  value: "clients",
                  icon: <Building2 className="w-3.5 h-3.5" />,
                  label: t('tabs.clients'),
                },
                {
                  value: "employees",
                  icon: <Users className="w-3.5 h-3.5" />,
                  label: t('tabs.employees'),
                },
                {
                  value: "borrowings",
                  icon: <Wallet className="w-3.5 h-3.5" />,
                  label: t('tabs.borrowings'),
                },
                {
                  value: "analytics",
                  icon: <BarChart3 className="w-3.5 h-3.5" />,
                  label: t('tabs.analytics'),
                },
                {
                  value: "backup",
                  icon: <DatabaseBackup className="w-3.5 h-3.5" />,
                  label: t('tabs.backup'),
                },
              ].map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="
                    flex items-center gap-1.5
                    text-xs px-3 py-1.5 rounded-lg transition-all
                    text-[var(--text-secondary)]
                    hover:text-[var(--text-primary)]
                    data-[state=active]:bg-gradient-to-br
                    data-[state=active]:from-[var(--accent-500)]
                    data-[state=active]:to-[var(--accent-600)]
                    data-[state=active]:text-white
                    data-[state=active]:shadow-md
                    data-[state=active]:shadow-[var(--accent-glow)]
                  "
                >
                  {t.icon}
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ══ ATTENDANCE TAB ══ */}
            <TabsContent value="attendance">
              {outdatedRecord && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 mb-5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-400 shrink-0" />
                    <span>
                      {t('attendance.outdated_warning').replace('{{date}}', parseDateLabel(outdatedRecord.date))}
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="bg-rose-900/60 hover:bg-rose-700 text-rose-100 border border-rose-800 shrink-0 text-[11px] h-7 px-3"
                    onClick={() => setClearDialog("attendance")}
                  >
                    {t('attendance.clear_attendance')}
                  </Button>
                </div>
              )}

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
                    { value: "half", label: "Half Day", icon: <Sun className="w-3 h-3 text-amber-600 opacity-75" /> },
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
                    const isLocked = lockedDates[rec.date] && !outdatedRecord;
                    const clientsToShow =
                      filterClient !== "all"
                        ? rec.clients.filter((c) => c.clientId === filterClient)
                        : rec.clients;
                    return (
                          <Card
                            key={rec.date}
                            className={`group/card relative border transition-all duration-300 rounded-2xl overflow-hidden ${
                              isLocked ? "attendance-card-locked" : "attendance-card"
                            }`}
                          >
                            {/* Accent top border */}
                            <div
                              className={`absolute top-0 left-0 right-0 h-[2px] ${
                                isLocked ? "attendance-card-locked-top-accent" : "attendance-card-top-accent"
                              }`}
                            />

                            <CardHeader
                              className={`relative group pb-2.5 px-3.5 pt-3 flex flex-row items-center justify-between gap-2 ${
                                isLocked ? "attendance-card-locked-header" : "attendance-card-header"
                              }`}
                            >
                            {/* Left: Lock + Date + Locked pill */}
                            <div className="flex items-center gap-2 min-w-0">
                              {!isLocked && !outdatedRecord && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 rounded-lg shrink-0 text-[var(--indigo-400)] hover:text-[var(--indigo-500)] hover:bg-[var(--accent-glow)] transition-all duration-200 hover:scale-110"
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
                                    isLocked
                                      ? "text-[var(--accent-500)]"
                                      : "text-[var(--indigo-500)]"
                                  }`}
                                >
                                  {rec.date.split("-")[2]}
                                </CardTitle>
                                {isLocked && 
                                <span
                                  className={`text-[10px] uppercase tracking-widest font-semibold text-[var(--accent-400)]`}
                                >
                                  {rec.date.split("-")[1]}
                                </span>
                                }
                              </div>
                            </div>

                            {/* Right: Actions (hidden when locked) + Copy */}
                            <div className="flex items-center gap-0.5 shrink-0">
                              {!isLocked && !outdatedRecord && (
                                <>

                                  <Button
  size="sm"
  variant="ghost"
  className="
    h-7
    px-2.5
    rounded-lg
    text-xs
    font-medium
    transition-all
    text-[var(--accent-500)]
    hover:bg-[var(--accent-glow)]
    hover:text-[var(--accent-400)]
    hover:border
    hover:border-[var(--border-accent)]
  "
  onClick={() => {
    if (rec.date > todayStr) {
      addToast("Cannot edit attendance for future dates", "error");
      return;
    }
    setEditDayDialog(rec.date);
  }}
>
  <Edit2 className="w-3 h-3 mr-0.5" />
  Manage
</Button>

                                  <div className="w-px h-5 bg-gradient-to-b from-transparent via-sky-800/50 to-transparent mx-1" />
                                </>
                              )}

                              {/* WhatsApp & Copy — revealed on hover */}

                              {(clientsToShow.length > 0 || (rec.absentees?.length ?? 0) > 0)  && (
  <>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 rounded-lg transition-all duration-300 text-[#25D366] hover:text-white hover:bg-[#25D366] hover:shadow-md hover:shadow-[#25D366]/30 hover:scale-110"
          onClick={() => copyAttendanceMessage(rec, true)}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
          </svg>
        </Button>
      </TooltipTrigger>
      <TooltipContent className="bg-slate-800 text-slate-200 text-xs border-sky-900/50">
        Share to WhatsApp
      </TooltipContent>
    </Tooltip>

    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 rounded-lg transition-all duration-300 text-sky-400 hover:text-sky-200 hover:bg-sky-950/60 hover:scale-110"
          onClick={() => copyAttendanceMessage(rec)}
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="bg-slate-800 text-slate-200 text-xs border-sky-900/50">
        Copy attendance message
      </TooltipContent>
    </Tooltip>
  </>
)}
                            </div>
                          </CardHeader>

                          {/* Body — collapsed when locked, shows suitcase lock UI */}
                          {isLocked ? (
                            <CardContent className="pt-5 pb-5 flex flex-col items-center justify-center gap-3.5">
                              {/* Suitcase lock visual */}
                              <div className="flex flex-col items-center gap-2.5">
                                <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl attendance-lock-icon">
                                  {/* Lock shackle (top arc) */}
                                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-3.5 rounded-t-full border-[2.5px] border-[var(--border-accent)] border-b-0" />
                                  {/* Lock body icon */}
                                  <Lock className="w-6 h-6 text-[var(--accent-500)] drop-shadow-md" />
                                </div>
                                <p className="text-[11px] text-[var(--text-secondary)] font-semibold tracking-wider uppercase">
                                  Date is locked
                                </p>
                              </div>

                              {/* Unlock button */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 text-xs px-3.5 rounded-lg attendance-unlock-btn transition-all gap-1.5 font-medium"
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
                                  <p className="text-xs text-[var(--text-muted)] italic">{t('attendance.no_records')}</p>
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
                                      <div key={cl.clientId} className="rounded-lg p-2 transition-colors attendance-client-card">
                                        <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 mb-2">
                                          <div className="p-0.5 rounded bg-[var(--surface-2)]">
                                            <Building2 className="w-3 h-3 text-[var(--indigo-500)]" />
                                          </div>
                                          <span className="truncate">{clientName}</span>
                                        </div>
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
                                                        ? "attendance-badge-night"
                                                        : emp.shift === "half"
                                                        ? "attendance-badge-half"
                                                        : "attendance-badge-day"
                                                    }`}
                                                    onClick={() => {
                                                      if (outdatedRecord) {
                                                        addToast("Clear the data first before modifying attendance.", "error");
                                                        return;
                                                      }
                                                      if (rec.date > todayStr) {
                                                        addToast("Cannot modify attendance for future dates", "error");
                                                        return;
                                                      }
                                                      removeAssignment(rec.date, cl.clientId, emp.employeeId, emp.shift);
                                                    }}
                                                  >
                                                    {emp.shift === "night" ? (
                                                      <Moon className="w-2.5 h-2.5" />
                                                    ) : emp.shift === "half" ? (
                                                      <Sun className="w-2.5 h-2.5 opacity-75" />
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
                                    <div className="rounded-lg p-2 attendance-absent-card">
                                      <div className="text-xs font-semibold text-[var(--error)] flex items-center gap-1.5 mb-2">
                                        <div className="p-0.5 rounded bg-[var(--error)]/10">
                                          <UserX className="w-3 h-3 text-[var(--error)]" />
                                        </div>
                                        Absentees
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {rec.absentees.map((empId) => {
                                          const empName =
                                            employees.find((e) => e.id === empId)?.name ?? "Unknown";
                                          return (
                                            <Badge
                                              key={empId}
                                              className="text-xs px-2 py-0.5 rounded-md cursor-pointer transition-all font-medium attendance-badge-absent hover:scale-105"
                                              onClick={() => {
                                                if (outdatedRecord) {
                                                  addToast("Clear the data first before modifying attendance.", "error");
                                                  return;
                                                }
                                                removeAbsentee(rec.date, empId);
                                              }}
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
                    className="pl-8 search-input text-sm h-9 rounded-lg"
                    placeholder="Search clients…"
                    value={searchClient}
                    onChange={(e) => setSearchClient(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  className="bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white h-9 shadow-md shadow-[var(--accent-glow)] rounded-lg"
                  onClick={openAddClient}
                >
                  <Plus className="w-4 h-4 mr-1" /> {t('clients.add_client')}
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
                      className="list-card flex flex-row items-center justify-between px-4 py-3 rounded-xl"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                       <div
  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border border-[var(--border-accent)] shadow-md shadow-[var(--accent-glow)]"
  style={{
    background:
      "linear-gradient(135deg, var(--accent-500) 0%, var(--accent-600) 100%)",
    color: "var(--primary-foreground)",
  }}
>
  {c.name[0]?.toUpperCase()}
</div>

                        <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {c.name}
                        </span>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 icon-button-ghost"
                          onClick={() => openEditClient(c)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 icon-button-ghost hover:text-[var(--error)]"
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
                    className="pl-8 search-input text-sm h-9 rounded-lg"
                    placeholder="Search employees…"
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  className="bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white h-9 shadow-md shadow-[var(--accent-glow)] rounded-lg"
                  onClick={openAddEmployee}
                >
                  <Plus className="w-4 h-4 mr-1" /> {t('employees.add_employee')}
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
                        className="list-card flex flex-row items-center justify-between px-4 py-3 rounded-xl"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                         <div
  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border border-[var(--border-accent)] shadow-md shadow-[var(--accent-glow)]"
  style={{
    background:
      "linear-gradient(135deg, var(--accent-500) 0%, var(--accent-600) 100%)",
    color: "var(--primary-foreground)",
  }}
>
  {e.name[0]?.toUpperCase()}
</div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {e.name}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {duties} {duties === 1 ? "duty" : "duties"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 icon-button-ghost"
                            onClick={() => openEditEmployee(e)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 icon-button-ghost hover:text-[var(--error)]"
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
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    {t('analytics.title')}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {t('analytics.subtitle')}
                  </p>
                </div>
                <TooltipProvider>
  <div className="flex gap-2 shrink-0 flex-wrap">
    {/* TXT */}
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            disabled={!stats.leaderboard.length}
            onClick={downloadAnalyticsReport}
            className="bg-[var(--surface-2)] hover:bg-[var(--surface-1)] text-[var(--text-primary)] text-xs px-3.5 py-2 h-9 rounded-lg flex items-center gap-1.5 border border-[var(--border-default)] shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 text-[var(--accent-500)]" />
            {t("analytics.download_txt")}
          </Button>
        </span>
      </TooltipTrigger>

      {!stats.leaderboard.length && (
        <TooltipContent>
          <p>{t("analytics.add_records_to_export")}</p>
        </TooltipContent>
      )}
    </Tooltip>

    {/* Download Excel */}
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            disabled={!stats.leaderboard.length}
            onClick={downloadAnalyticsExcel}
            className="bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white text-xs px-3.5 py-2 h-9 rounded-lg flex items-center gap-1.5 border border-[var(--accent-600)] shadow-md shadow-[var(--accent-glow)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {t("analytics.download_excel")}
          </Button>
        </span>
      </TooltipTrigger>

      {!stats.leaderboard.length && (
        <TooltipContent>
          <p>{t("analytics.add_records_to_export")}</p>
        </TooltipContent>
      )}
    </Tooltip>

    {/* Client Excel */}
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            disabled={!stats.leaderboard.length}
            onClick={() => setDownloadClientDialog(true)}
            className="bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white text-xs px-3.5 py-2 h-9 rounded-lg flex items-center gap-1.5 border border-[var(--accent-600)] shadow-md shadow-[var(--accent-glow)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {t("analytics.client_excel")}
          </Button>
        </span>
      </TooltipTrigger>

      {!stats.leaderboard.length && (
        <TooltipContent>
          <p>{t("analytics.add_records_to_export")}</p>
        </TooltipContent>
      )}
    </Tooltip>
  </div>
</TooltipProvider>
              </div>
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
                {[
                  {
                    label: t('analytics.total_clients'),
                    value: stats.totalClients,
                    icon: <Building2 className="w-5 h-5" />,
                    color: "text-[var(--accent-500)]",
                  },
                  {
                    label: t('analytics.total_employees'),
                    value: stats.totalEmployees,
                    icon: <Users className="w-5 h-5" />,
                    color: "text-[var(--indigo-500)]",
                  },
                  {
                    label: t('analytics.total_duties'),
                    value: stats.totalDuties,
                    icon: <Briefcase className="w-5 h-5" />,
                    color: "text-[var(--success)]",
                  },
                  {
                    label: t('analytics.total_absences'),
                    value: stats.totalAbsentees,
                    icon: <UserX className="w-5 h-5" />,
                    color: "text-[var(--error)]",
                  },
                ].map((s) => (
                  <Card
                    key={s.label}
                    className="stat-card px-5 py-4 rounded-xl transition-colors hover:border-[var(--border-hover)]"
                  >
                    <div className={`${s.color} mb-2`}>{s.icon}</div>
                    <p className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">
                      {s.value}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.label}</p>
                  </Card>
                ))}
              </div>

              {/* Fines & Borrowings quick summary in analytics */}
              {(borrowingStats.totalOutstanding > 0 || borrowingStats.totalFines > 0) && (
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-2 mb-6">
                  <Card className="warning-card px-5 py-4 rounded-xl">
                    <div className="text-[var(--warning)] mb-2"><TrendingDown className="w-5 h-5" /></div>
                    <p className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">₹{borrowingStats.totalOutstanding.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t('analytics.outstanding_balance')}</p>
                  </Card>
                  <Card className="warning-card px-5 py-4 rounded-xl border-[var(--error)]">
                    <div className="text-[var(--error)] mb-2"><Receipt className="w-5 h-5" /></div>
                    <p className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">₹{borrowingStats.totalFines.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t('analytics.total_fines')}</p>
                  </Card>
                </div>
              )}

              {stats.topEmployee && (
                <Card className="highlight-card mb-6 px-5 py-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border-accent)] flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-[var(--accent-500)]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--accent-600)] uppercase tracking-[0.18em] font-semibold">
                        {t('analytics.top_performer')}
                      </p>
                      <p className="text-xl font-bold text-[var(--text-primary)]">
                        {stats.topEmployee.name}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {stats.topEmployee.count} {t('analytics.duties')}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="dashboard-card rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-[var(--text-primary)] flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[var(--accent-500)]" />
                    {t('analytics.duty_leaderboard')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.leaderboard.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      {t('analytics.no_duties_yet')}
                    </p>
                  ) : (
                    <ScrollArea className="h-[28rem]">
                      <div className="space-y-2 pr-3">
                        {stats.leaderboard.map((l, i) => {
                          const rankStyles =
                            i === 0
                              ? "list-card border-[var(--accent-500)] bg-[var(--surface-2)] font-bold text-[var(--text-primary)]"
                              : "list-card text-[var(--text-secondary)]";
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
                              className={`group relative overflow-hidden rounded-2xl border transition-all hover:shadow-lg ${rankStyles}`}
                              style={{
                                background: "var(--surface-card)",
                                borderColor: "var(--border-default)",
                                boxShadow: i < 3 ? "0 8px 24px var(--accent-glow)" : undefined,
                              }}
                            >
                              {/* subtle glow for top 3 */}
                              {i < 3 && (
                                <div
                                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl"
                                  style={{
                                    background: "var(--accent-500)",
                                    opacity: 0.12,
                                  }}
                                />
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedLeaders((prev) =>
                                    prev.includes(l.id)
                                      ? prev.filter((id) => id !== l.id)
                                      : [...prev, l.id]
                                  )
                                }
                                className="w-full flex items-center gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 rounded-2xl"
                                style={{
                                  ["--tw-ring-color" as any]: "var(--accent-500)",
                                }}
                              >
                                {/* Rank */}
                                <div
                                  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold tabular-nums"
                                  style={{
                                    background: "var(--surface-2)",
                                    border: "1px solid var(--border-subtle)",
                                  }}
                                >
                                  {medal ? (
                                    <span className="text-lg">{medal}</span>
                                  ) : (
                                    <span
                                      className="text-sm"
                                      style={{ color: "var(--text-muted)" }}
                                    >
                                      #{i + 1}
                                    </span>
                                  )}
                                </div>

                                {/* Avatar */}
                                <div
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                                  style={{
                                    background:
                                      "linear-gradient(135deg, var(--accent-500), var(--accent-600))",
                                    boxShadow: "0 6px 18px var(--accent-glow)",
                                    border: "1px solid var(--border-accent)",
                                  }}
                                >
                                  {l.name[0]?.toUpperCase()}
                                </div>

                                {/* Name */}
                                <div className="min-w-0 flex-1">
                                  <p
                                    className="truncate text-sm font-semibold"
                                    style={{ color: "var(--text-heading)" }}
                                  >
                                    {l.name}
                                  </p>

                                  <p
                                    className="text-[11px]"
                                    style={{ color: "var(--text-muted)" }}
                                  >
                                    {l.clientDistribution.length} client
                                    {l.clientDistribution.length === 1 ? "" : "s"}
                                  </p>
                                </div>

                                {/* Count */}
                                <div className="flex flex-col items-end">
                                  <span
                                    className="text-lg font-bold tabular-nums leading-none"
                                    style={{ color: "var(--accent-400)" }}
                                  >
                                    {l.count}
                                  </span>

                                  <span
                                    className="text-[10px] uppercase tracking-wider"
                                    style={{ color: "var(--text-muted)" }}
                                  >
                                    {t("analytics.duties")}
                                  </span>
                                </div>

                                {/* Expand Icon */}
                                <ChevronDown
                                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                  style={{
                                    color: isExpanded
                                      ? "var(--accent-400)"
                                      : "var(--text-muted)",
                                  }}
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
                                  <div
                                    className="px-4 pb-3 pt-1"
                                    style={{
                                      borderTop: "1px solid var(--border-subtle)",
                                    }}
                                  >
                                    {hasClients ? (
                                      <div className="mt-3 flex flex-wrap gap-1.5">
                                        {l.clientDistribution.map((cd) => (
                                          <div
                                            key={cd.clientId}
                                            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] transition-colors"
                                            style={{
                                              background: "var(--accent-glow)",
                                              border: "1px solid var(--border-accent)",
                                              color: "var(--text-primary)",
                                            }}
                                          >
                                            <Building2
                                              className="h-3 w-3"
                                              style={{ color: "var(--accent-500)" }}
                                            />

                                            <span className="truncate max-w-[120px]">
                                              {cd.clientName}
                                            </span>

                                            <span
                                              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                                              style={{
                                                background: "rgba(64,138,113,.18)",
                                                color: "var(--accent-400)",
                                              }}
                                            >
                                              {cd.count}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p
                                        className="mt-2 text-[11px] italic flex items-center gap-1.5"
                                        style={{ color: "var(--text-muted)" }}
                                      >
                                        <Info className="h-3 w-3" />
                                        {t("analytics.no_client_assignments")}
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

            {/* ══ FINES & BORROWINGS TAB ══ */}
            <TabsContent value="borrowings">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-base font-semibold text-slate-200">Fines & Borrowings</h2>
                  <p className="text-xs text-slate-500">Track money borrowed by employees and fines issued</p>
                </div>
                <Button
                  size="sm"
                  className="bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white h-9 shadow-md shadow-[var(--accent-glow)] rounded-lg shrink-0"
                  onClick={openAddBorrowing}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Record
                </Button>
              </div>

              {/* Summary cards */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
                {[
                  { label: "Total Borrowed", value: borrowingStats.totalBorrowed, icon: <Wallet className="w-5 h-5" />, color: "text-[var(--warning)]" },
                  { label: "Total Fines", value: borrowingStats.totalFines, icon: <Receipt className="w-5 h-5" />, color: "text-[var(--error)]" },
                  { label: "Outstanding", value: borrowingStats.totalOutstanding, icon: <TrendingDown className="w-5 h-5" />, color: "text-[var(--warning)]" },
                  { label: "Total Settled", value: borrowingStats.totalSettled, icon: <CheckCircle2 className="w-5 h-5" />, color: "text-[var(--success)]" },
                ].map((s) => (
                  <Card key={s.label} className={`dashboard-card px-5 py-4 rounded-xl hover:border-[var(--border-hover)] transition-colors`}>
                    <div className={`${s.color} mb-2`}>{s.icon}</div>
                    <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">₹{s.value.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.label}</p>
                  </Card>
                ))}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-5">
                <SearchableSelect
                  value={filterBEmployee}
                  onValueChange={setFilterBEmployee}
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
                  value={filterBType}
                  onValueChange={setFilterBType}
                  options={[
                    { value: "all", label: "All Types" },
                    { value: "borrowing", label: "Borrowings", icon: <Wallet className="w-3 h-3 text-yellow-400" /> },
                    { value: "fine", label: "Fines", icon: <Receipt className="w-3 h-3 text-red-400" /> },
                  ]}
                  placeholder="All Types"
                  searchPlaceholder="Search type…"
                  emptyText="No types found."
                  className="w-full sm:w-40"
                />
                <SearchableSelect
                  value={filterBSettled}
                  onValueChange={setFilterBSettled}
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "outstanding", label: "Outstanding", icon: <Circle className="w-3 h-3 text-orange-400" /> },
                    { value: "settled", label: "Settled", icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" /> },
                  ]}
                  placeholder="All Status"
                  searchPlaceholder="Search status…"
                  emptyText="No status found."
                  className="w-full sm:w-40"
                />
                {(filterBEmployee !== "all" || filterBType !== "all" || filterBSettled !== "all") && (
                  <Button variant="ghost" size="sm" className="h-9 text-xs icon-button-ghost"
                    onClick={() => { setFilterBEmployee("all"); setFilterBType("all"); setFilterBSettled("all"); }}>
                    <X className="w-3 h-3 mr-1" /> Clear
                  </Button>
                )}
              </div>

              {/* Records list */}
              {(() => {
                const filtered = borrowings
                  .filter((b) => {
                    if (filterBEmployee !== "all" && b.employeeId !== filterBEmployee) return false;
                    if (filterBType !== "all" && b.type !== filterBType) return false;
                    if (filterBSettled === "outstanding" && b.settled) return false;
                    if (filterBSettled === "settled" && !b.settled) return false;
                    return true;
                  })
                  .sort((a, b) => b.date.localeCompare(a.date));

                if (borrowings.length === 0) {
                  return (
                    <div className="text-center py-24 text-slate-500">
                      <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No records yet</p>
                      <p className="text-xs mt-1 text-slate-600">Click "Add Record" to track borrowings or fines</p>
                    </div>
                  );
                }

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-16 text-slate-500">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No records match the filters.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {filtered.map((b) => {
                      const empName = employees.find((e) => e.id === b.employeeId)?.name ?? "Unknown";
                      const isFine = b.type === "fine";
                      return (
                        <div
                          key={b.id}
                          className={`group relative flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
                            b.settled
                              ? "bg-[var(--surface-2)] border-[var(--success)]"
                              : isFine
                              ? "bg-[var(--surface-2)] border-[var(--error)]"
                              : "bg-[var(--surface-2)] border-[var(--warning)]"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 text-white ${
                              isFine
                                ? "bg-[var(--error)]"
                                : "bg-[var(--warning)]"
                            }`}>
                              {empName[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{empName}</p>
                              <p className="text-xs text-[var(--text-secondary)] truncate">{b.note || "No reason provided"}</p>
                            </div>
                          </div>

                          {/* Center: Type badge + Date */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={`text-[11px] px-2 py-0.5 rounded-md font-semibold text-white ${
                              isFine
                                ? "bg-[var(--error)] border border-[var(--error)]"
                                : "bg-[var(--warning)] border border-[var(--warning)]"
                            }`}>
                              {isFine ? <Receipt className="w-2.5 h-2.5 mr-1" /> : <Wallet className="w-2.5 h-2.5 mr-1" />}
                              {isFine ? "Fine" : "Borrowing"}
                            </Badge>
                            <span className="text-xs text-[var(--text-secondary)] tabular-nums">{b.date}</span>
                          </div>

                          {/* Amount */}
                          <div className="shrink-0 text-right">
                            <p className={`text-base font-bold tabular-nums ${
                              b.settled ? "text-[var(--success)]" : isFine ? "text-[var(--error)]" : "text-[var(--warning)]"
                            }`}>
                              ₹{b.amount.toLocaleString("en-IN")}
                            </p>
                            <p className={`text-[10px] font-semibold uppercase tracking-wide ${
                              b.settled ? "text-[var(--success)]" : "text-[var(--text-secondary)]"
                            }`}>
                              {b.settled ? "Settled" : "Outstanding"}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => toggleSettled(b.id)}
                                  className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                                    b.settled
                                      ? "text-[var(--success)] bg-[var(--surface-2)]"
                                      : "icon-button-ghost hover:text-[var(--success)]"
                                  }`}
                                >
                                  {b.settled ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {b.settled ? "Mark as outstanding" : "Mark as settled"}
                              </TooltipContent>
                            </Tooltip>
                            <Button variant="ghost" size="icon" className="h-8 w-8 icon-button-ghost" onClick={() => openEditBorrowing(b)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 icon-button-ghost hover:text-[var(--error)]" onClick={() => setDeleteBorrowingDialog(b)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Per-employee outstanding breakdown */}
              {borrowingStats.perEmployee.length > 0 && (
                <Card className="bg-slate-950/60 border-sky-900/40 rounded-xl mt-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-orange-400" />
                      Per-Employee Outstanding
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {borrowingStats.perEmployee.map((ep) => (
                        <div key={ep.id} className="flex items-center gap-3 py-2 border-b border-slate-800/60 last:border-0">
                          <div
  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border border-[var(--border-accent)] shadow-md shadow-[var(--accent-glow)]"
  style={{
    background:
      "linear-gradient(135deg, var(--accent-500) 0%, var(--accent-600) 100%)",
    color: "var(--accent-400)",
  }}
>
  {ep.name[0]?.toUpperCase()}
</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{ep.name}</p>
                            <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                              {ep.borrowed > 0 && <span className="text-amber-500">Borrowed ₹{ep.borrowed.toLocaleString("en-IN")}</span>}
                              {ep.fines > 0 && <span className="text-red-500">Fined ₹{ep.fines.toLocaleString("en-IN")}</span>}
                              {ep.settled > 0 && <span className="text-emerald-600">Settled ₹{ep.settled.toLocaleString("en-IN")}</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-bold tabular-nums ${ep.outstanding > 0 ? "text-orange-300" : "text-emerald-400"}`}>
                              ₹{ep.outstanding.toLocaleString("en-IN")}
                            </p>
                            <p className="text-[10px] text-slate-600 uppercase tracking-wide">{ep.outstanding > 0 ? "Due" : "Clear"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

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
                      desc: "Removes clients, employees, attendance & borrowings",
                    },
                    {
                      key: "clients",
                      label: "Clear Clients Only",
                      desc: "Removes all clients and their attendance",
                    },
                    {
                      key: "employees",
                      label: "Clear Employees Only",
                      desc: "Removes all employees, related records & borrowings",
                    },
                    {
                      key: "attendance",
                      label: "Clear Attendance Only",
                      desc: "Removes all daily attendance records",
                    },
                    {
                      key: "borrowings",
                      label: "Clear Fines & Borrowings Only",
                      desc: "Removes all borrowings and fine records",
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

            {/* ══ BACKUP TAB ══ */}
            <TabsContent value="backup">
              <div className="backup-tab-grid">
                <ExportPanel
                  onSuccess={(filename) =>
                    addToast(`Backup downloaded: ${filename}`)
                  }
                  onError={(msg) => addToast(msg, "error")}
                />
                 <ImportPanel
                  onSuccess={(sections, payload, approval) => {
                    if (approval.clients) setClients(payload.sections.clients);
                    if (approval.employees) setEmployees(payload.sections.employees);
                    if (approval.attendance) setAttendanceRecords(payload.sections.attendance);
                    if (approval.borrowings) setBorrowings(payload.sections.borrowings);
                    if (approval.theme) setTheme(payload.sections.theme as "light" | "dark");
                    addToast(
                      `Restored ${sections.length} section${sections.length !== 1 ? "s" : ""} successfully`,
                      "success",
                    );
                  }}
                  onError={(msg) => addToast(msg, "error")}
                />
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* ══ DIALOGS ══ */}

        {/* Download Client Wise Report Dialog */}
        <Dialog open={downloadClientDialog} onOpenChange={setDownloadClientDialog}>
          <DialogContent className="bg-slate-900 border-sky-900/50 text-slate-100 max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle>Download Client Report</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <label className="text-xs text-slate-400 mb-2 block">
                Select Client
              </label>
              <SearchableSelect
                value={downloadClientId}
                onValueChange={setDownloadClientId}
                options={[
                  { value: "all", label: "All Clients" },
                  ...clients.map((c) => ({ value: c.id, label: c.name })),
                ]}
                placeholder="Select a client"
                searchPlaceholder="Search clients…"
                emptyText="No clients found."
                className="w-full"
              />
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setDownloadClientDialog(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={downloadClientWiseExcel}
                className="bg-purple-600 hover:bg-purple-500 text-white"
              >
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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



        {/* Day Edit Dialog (Drag & Drop) */}
        {editDayDialog && (
          <DayAttendanceEditor
            open={!!editDayDialog}
            date={editDayDialog}
            clients={clients}
            employees={employees}
            record={getRecord(editDayDialog)}
            onClose={() => setEditDayDialog(null)}
            onAssign={(clientId, employeeIds, shift) => handleAssign(editDayDialog, clientId, employeeIds, shift)}
            onRemoveAssignment={(clientId, employeeId, shift) => removeAssignment(editDayDialog, clientId, employeeId, shift)}
            onMarkAbsent={(employeeId) => {
              if (getRecord(editDayDialog).absentees.includes(employeeId)) return;
              updateRecord(editDayDialog, (r) => ({
                ...r,
                absentees: [...r.absentees, employeeId],
              }));
            }}
            onRemoveAbsentee={(employeeId) => removeAbsentee(editDayDialog, employeeId)}
          />
        )}

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


        {/* Add/Edit Borrowing or Fine */}
        <Dialog
  open={borrowingDialog.open}
  onOpenChange={(o) =>
    !o && setBorrowingDialog({ open: false, editing: null })
  }
>
  <DialogContent
    className="max-w-[560px] w-[95vw] p-0 overflow-hidden rounded-2xl"
    style={{
      background: "var(--surface-1)",
      border: "1px solid var(--border-default)",
      color: "var(--text-primary)",
    }}
  >
    {/* Header */}
    <DialogHeader
      className="px-6 py-5 border-b"
      style={{
        borderColor: "var(--border-default)",
        background: "var(--surface-2)",
      }}
    >
      <DialogTitle className="flex items-center gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md"
          style={{
            background:
              borrowingDialog.editing
                ? "linear-gradient(135deg,var(--accent-500),var(--accent-600))"
                : "linear-gradient(135deg,var(--accent-500),var(--accent-600))",
            color: "var(--primary-foreground)",
          }}
        >
          {borrowingDialog.editing ? (
            <Edit2 className="w-5 h-5" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
        </div>

        <div className="flex flex-col">
          <span className="text-lg font-semibold">
            {borrowingDialog.editing ? "Edit Record" : "Add New Record"}
          </span>

          <span
            className="text-xs font-normal"
            style={{ color: "var(--text-secondary)" }}
          >
            {bType === "fine"
              ? "Create a fine entry for an employee."
              : "Create a borrowing record for an employee."}
          </span>
        </div>
      </DialogTitle>
    </DialogHeader>

    {/* Body */}
    <div className="space-y-5 px-6 py-6">
      {/* Type */}
      <div
        className="grid grid-cols-2 rounded-xl p-1"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border-default)",
        }}
      >
        <button
          type="button"
          onClick={() => setBType("borrowing")}
          className="flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all"
          style={
            bType === "borrowing"
              ? {
                  background:
                    "linear-gradient(135deg,var(--accent-500),var(--accent-600))",
                  color: "var(--primary-foreground)",
                  boxShadow: "0 6px 18px var(--accent-glow)",
                }
              : {
                  color: "var(--text-secondary)",
                }
          }
        >
          <Wallet className="w-4 h-4" />
          Borrowing
        </button>

        <button
          type="button"
          onClick={() => setBType("fine")}
          className="flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all"
          style={
            bType === "fine"
              ? {
                  background: "linear-gradient(135deg,#d46a6a,#bb5252)",
                  color: "#fff",
                }
              : {
                  color: "var(--text-secondary)",
                }
          }
        >
          <Receipt className="w-4 h-4" />
          Fine
        </button>
      </div>

      {/* Employee */}
      <div className="space-y-2">
        <label
          className="text-xs font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Employee
        </label>

        <SearchableSelect
          value={bEmployeeId}
          onValueChange={setBEmployeeId}
          options={employees.map((e) => ({
            value: e.id,
            label: e.name,
          }))}
          placeholder="Select Employee"
          searchPlaceholder="Search employee..."
          emptyText="No employee found."
        />
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <label
          className="text-xs font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Amount
        </label>

        <div className="relative">
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold"
            style={{ color: "var(--accent-500)" }}
          >
            ₹
          </span>

          <Input
            type="number"
            min="1"
            placeholder="Enter amount"
            value={bAmount}
            onChange={(e) => setBAmount(e.target.value)}
            className="h-11 pl-10 rounded-lg"
            style={{
              background: "var(--surface-input)",
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      {/* Date */}
      <div className="space-y-2">
        <label
          className="text-xs font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Date
        </label>

        <Input
          type="date"
          value={bDate}
          max={todayStr}
          onChange={(e) => setBDate(e.target.value)}
          className="h-11 rounded-lg"
          style={{
            background: "var(--surface-input)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {/* Note */}
      <div className="space-y-2">
        <label
          className="text-xs font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {bType === "fine" ? "Reason" : "Note"}
        </label>

        <Input
          placeholder={
            bType === "fine"
              ? "Reason for fine..."
              : "Optional note..."
          }
          value={bNote}
          onChange={(e) => setBNote(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && saveBorrowing()
          }
          className="h-11 rounded-lg"
          style={{
            background: "var(--surface-input)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
          }}
        />
      </div>
    </div>

    {/* Footer */}
    <DialogFooter
      className="px-6 py-5 border-t flex justify-end gap-3"
      style={{
        borderColor: "var(--border-default)",
        background: "var(--surface-2)",
      }}
    >
      <Button
        variant="ghost"
        className="rounded-lg"
        style={{
          color: "var(--text-secondary)",
        }}
        onClick={() =>
          setBorrowingDialog({
            open: false,
            editing: null,
          })
        }
      >
        Cancel
      </Button>

      <Button
        disabled={!bEmployeeId || !bAmount}
        onClick={saveBorrowing}
        className="rounded-lg px-6 shadow-md"
        style={{
          background:
            bType === "fine"
              ? "linear-gradient(135deg,#d46a6a,#bb5252)"
              : "linear-gradient(135deg,var(--accent-500),var(--accent-600))",
          color: "var(--primary-foreground)",
        }}
      >
        {borrowingDialog.editing ? (
          <>
            <Edit2 className="w-4 h-4 mr-2" />
            Update Record
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            Save Record
          </>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

        {/* Delete Borrowing / Fine */}
        <AlertDialog
          open={!!deleteBorrowingDialog}
          onOpenChange={(o) => !o && setDeleteBorrowingDialog(null)}
        >
          <AlertDialogContent className="bg-slate-900 border-sky-900/50 text-slate-100 rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Record</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Remove this {deleteBorrowingDialog?.type === "fine" ? "fine" : "borrowing"} record of{" "}
                <strong className="text-slate-200">₹{deleteBorrowingDialog?.amount.toLocaleString("en-IN")}</strong>{" "}
                for{" "}
                <strong className="text-slate-200">
                  {employees.find((e) => e.id === deleteBorrowingDialog?.employeeId)?.name ?? "Unknown"}
                </strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-800 border-sky-900/40 text-slate-300 hover:bg-slate-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-700 hover:bg-rose-600"
                onClick={() => deleteBorrowingDialog && deleteBorrowing(deleteBorrowingDialog)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ToastContainer toasts={toasts} onRemove={removeToast} />

      </div>
    </TooltipProvider>
  );
}
