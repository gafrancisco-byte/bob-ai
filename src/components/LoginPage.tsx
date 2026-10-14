import { useState } from "react";
import { useAuth } from "../AuthContext";
import type { Department } from "../types";

const DEPARTMENTS: Department[] = ["OED/OSEC", "MISD", "AFD", "MIED"];

type Mode = "login" | "register";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);

  // ── Login fields ──────────────────────────────────────────────────────────
  const [loginEmpNo,    setLoginEmpNo]    = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // ── Register fields ───────────────────────────────────────────────────────
  const [regEmpNo,      setRegEmpNo]      = useState("");
  const [regName,       setRegName]       = useState("");
  const [regEmail,      setRegEmail]      = useState("");
  const [regPassword,   setRegPassword]   = useState("");
  const [regConfirm,    setRegConfirm]    = useState("");
  const [regHireDate,   setRegHireDate]   = useState("");
  const [regDept,       setRegDept]       = useState<Department>("OED/OSEC");

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const err = login(loginEmpNo, loginPassword);
    if (err) setError(err);
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!regEmpNo.trim())  return setError("Employee ID is required.");
    if (!regName.trim())   return setError("Name is required.");
    if (!regHireDate)      return setError("Hire date is required.");
    if (regPassword !== regConfirm) return setError("Passwords do not match.");
    const err = register({
      employeeNo: regEmpNo,
      name:       regName,
      email:      regEmail,
      hireDate:   regHireDate,
      department: regDept,
      password:   regPassword,
    });
    if (err) setError(err);
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4">
      {/* Brand */}
      <div className="mb-8 text-center">
        <p className="text-3xl font-bold tracking-tight text-indigo-700 dark:text-indigo-400">HRIS</p>
        <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">Timekeeping System</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
        {/* Tab switcher */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mode === m
                  ? "border-b-2 border-indigo-600 text-indigo-700 dark:border-indigo-500 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
              }`}
            >
              {m === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Error banner */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:border-red-900 dark:text-red-400">
              {error}
            </div>
          )}

          {/* ── Login form ── */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Employee ID</label>
                <input
                  type="text"
                  required
                  value={loginEmpNo}
                  onChange={(e) => setLoginEmpNo(e.target.value)}
                  placeholder="e.g. EMP-001"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
              >
                Sign In
              </button>
            </form>
          )}

          {/* ── Register form ── */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">
                  Employee ID
                  <span className="ml-1 font-normal text-gray-400">(used to log in)</span>
                </label>
                <input
                  type="text"
                  required
                  value={regEmpNo}
                  onChange={(e) => setRegEmpNo(e.target.value)}
                  placeholder="e.g. EMP-001"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Full Name</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Juan dela Cruz"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">
                  Email
                  <span className="ml-1 font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Hire Date</label>
                  <input
                    type="date"
                    required
                    value={regHireDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setRegHireDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Department</label>
                  <select
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value as Department)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Password</label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
              >
                Create Account
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
