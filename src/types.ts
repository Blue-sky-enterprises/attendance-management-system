// ─── Types ────────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  name: string;
}

export interface AttendanceAssignment {
  employeeId: string;
  shift: "day" | "night";
  dutyCount: number;
}

export interface DailyAttendance {
  date: string;
  clients: {
    clientId: string;
    employees: AttendanceAssignment[];
  }[];
  absentees: string[];
}

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}
