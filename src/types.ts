export type Department = "OED/OSEC" | "MISD" | "AFD" | "MIED";

export interface Employee {
  id: string;
  employeeNo: string;  // unique human-readable ID, e.g. "EMP-001"
  name: string;
  email: string;
  hireDate: string;    // ISO date "YYYY-MM-DD"
  department: Department;
  passwordHash: string; // simple btoa hash — not production security
}

export interface TimeEntry {
  id: string;
  date: string;             // ISO date "YYYY-MM-DD"
  morningIn: string | null;    // 07:00 – (before noon); late if > 09:00
  morningOut: string | null;   // ~12:00 NN
  afternoonIn: string | null;  // ~12:00 NN
  afternoonOut: string | null; // morningIn + 8 h  (flexible end)
  overtimeIn: string | null;   // any time after afternoonOut
  overtimeOut: string | null;  // whenever OT session ends
}

/** The six punches in sequence */
export type Punch =
  | "morningIn"
  | "morningOut"
  | "afternoonIn"
  | "afternoonOut"
  | "overtimeIn"
  | "overtimeOut";

export type View = "clock" | "daily" | "weekly";
