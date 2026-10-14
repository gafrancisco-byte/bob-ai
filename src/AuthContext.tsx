import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Employee, Department } from "./types";

const EMPLOYEES_KEY = "hris_employees";
const SESSION_KEY   = "hris_session";

// ── Simple password hashing (btoa — for demo only) ────────────────────────────
export function hashPassword(plain: string): string {
  return btoa(plain);
}
function checkPassword(plain: string, hash: string): boolean {
  return btoa(plain) === hash;
}

// ── Storage helpers ────────────────────────────────────────────────────────────
function loadEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(EMPLOYEES_KEY);
    return raw ? (JSON.parse(raw) as Employee[]) : [];
  } catch {
    return [];
  }
}

function saveEmployees(employees: Employee[]) {
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
}

function loadSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

function saveSession(id: string | null) {
  if (id) localStorage.setItem(SESSION_KEY, id);
  else localStorage.removeItem(SESSION_KEY);
}

// ── Context types ──────────────────────────────────────────────────────────────
interface AuthCtx {
  employee: Employee | null;
  /** Login with employeeNo + password. Returns error string or null on success. */
  login: (employeeNo: string, password: string) => string | null;
  /** Register a new account. Returns error string or null on success. */
  register: (fields: Omit<Employee, "id" | "passwordHash"> & { password: string }) => string | null;
  logout: () => void;
  /** Update the current employee's profile. Returns error string or null. */
  updateProfile: (
    fields: Partial<Pick<Employee, "employeeNo" | "name" | "email" | "hireDate" | "department">> & { password?: string; currentPassword?: string }
  ) => string | null;
}

const Ctx = createContext<AuthCtx | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(loadEmployees);
  const [sessionId, setSessionId] = useState<string | null>(loadSession);

  const employee = employees.find((e) => e.id === sessionId) ?? null;

  const login = useCallback(
    (employeeNo: string, password: string): string | null => {
      const found = employees.find(
        (e) => e.employeeNo.toLowerCase() === employeeNo.trim().toLowerCase()
      );
      if (!found) return "No account found with that Employee ID.";
      if (!checkPassword(password, found.passwordHash)) return "Incorrect password.";
      setSessionId(found.id);
      saveSession(found.id);
      return null;
    },
    [employees]
  );

  const register = useCallback(
    (fields: Omit<Employee, "id" | "passwordHash"> & { password: string }): string | null => {
      if (!fields.employeeNo.trim()) return "Employee ID is required.";
      if (!fields.name.trim())       return "Name is required.";
      if (!fields.password)          return "Password is required.";
      if (employees.some((e) => e.employeeNo.toLowerCase() === fields.employeeNo.trim().toLowerCase()))
        return "An account with this Employee ID already exists.";

      const newEmployee: Employee = {
        id:           crypto.randomUUID(),
        employeeNo:   fields.employeeNo.trim().toUpperCase(),
        name:         fields.name.trim(),
        email:        fields.email.trim(),
        hireDate:     fields.hireDate,
        department:   fields.department,
        passwordHash: hashPassword(fields.password),
      };
      const updated = [...employees, newEmployee];
      setEmployees(updated);
      saveEmployees(updated);
      setSessionId(newEmployee.id);
      saveSession(newEmployee.id);
      return null;
    },
    [employees]
  );

  const logout = useCallback(() => {
    setSessionId(null);
    saveSession(null);
  }, []);

  const updateProfile = useCallback(
    (
      fields: Partial<Pick<Employee, "employeeNo" | "name" | "email" | "hireDate" | "department">> & {
        password?: string;
        currentPassword?: string;
      }
    ): string | null => {
      if (!employee) return "Not logged in.";
      if (fields.password && !fields.currentPassword)
        return "Enter your current password to set a new one.";
      if (fields.currentPassword && !checkPassword(fields.currentPassword, employee.passwordHash))
        return "Current password is incorrect.";
      // Check employeeNo uniqueness if it is being changed
      if (fields.employeeNo && fields.employeeNo.trim().toUpperCase() !== employee.employeeNo) {
        if (employees.some((e) => e.id !== employee.id && e.employeeNo.toLowerCase() === fields.employeeNo!.trim().toLowerCase()))
          return "That Employee ID is already in use by another account.";
      }

      const updated = employees.map((e) =>
        e.id !== employee.id
          ? e
          : {
              ...e,
              ...(fields.employeeNo ? { employeeNo: fields.employeeNo.trim().toUpperCase() } : {}),
              ...(fields.name       ? { name: fields.name.trim() }                           : {}),
              ...(fields.email      ? { email: fields.email.trim() }                         : {}),
              ...(fields.hireDate   ? { hireDate: fields.hireDate }                          : {}),
              ...(fields.department ? { department: fields.department }                      : {}),
              ...(fields.password   ? { passwordHash: hashPassword(fields.password) }        : {}),
            }
      );
      setEmployees(updated);
      saveEmployees(updated);
      return null;
    },
    [employee, employees]
  );

  return (
    <Ctx.Provider value={{ employee, login, register, logout, updateProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
