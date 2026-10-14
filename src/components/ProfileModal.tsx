import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import type { Department } from "../types";

const DEPARTMENTS: Department[] = ["OED/OSEC", "MISD", "AFD", "MIED"];

interface Props {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: Props) {
  const { employee, updateProfile, logout } = useAuth();

  const [employeeNo,      setEmployeeNo]      = useState(employee?.employeeNo ?? "");
  const [name,            setName]            = useState(employee?.name ?? "");
  const [email,           setEmail]           = useState(employee?.email ?? "");
  const [hireDate,        setHireDate]        = useState(employee?.hireDate ?? "");
  const [department,      setDepartment]      = useState<Department>(employee?.department ?? "OED/OSEC");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error,           setError]           = useState<string | null>(null);
  const [success,         setSuccess]         = useState(false);

  // Sync if employee changes externally
  useEffect(() => {
    if (employee) {
      setEmployeeNo(employee.employeeNo);
      setName(employee.name);
      setEmail(employee.email);
      setHireDate(employee.hireDate);
      setDepartment(employee.department);
    }
  }, [employee]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!employeeNo.trim()) return setError("Employee ID cannot be empty.");
    if (!name.trim()) return setError("Name cannot be empty.");

    if (newPassword) {
      if (newPassword !== confirmPassword) return setError("New passwords do not match.");
      if (newPassword.length < 6) return setError("Password must be at least 6 characters.");
    }

    const err = updateProfile({
      employeeNo,
      name,
      email,
      hireDate,
      department,
      ...(newPassword ? { currentPassword, password: newPassword } : {}),
    });

    if (err) return setError(err);
    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function handleLogout() {
    logout();
    onClose();
  }

  if (!employee) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">My Profile</p>
            <p className="text-xs text-gray-400 font-mono dark:text-gray-500">{employee.employeeNo}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-400"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Error / success */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:border-red-900 dark:text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:border-green-900 dark:text-green-400">
              ✓ Profile updated successfully.
            </div>
          )}

          {/* ── Personal info ── */}
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">Personal Info</p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">
              Employee ID
              <span className="ml-1 font-normal text-gray-400">(used to log in)</span>
            </label>
            <input
              type="text"
              required
              value={employeeNo}
              onChange={(e) => setEmployeeNo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">
              Email
              <span className="ml-1 font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Hire Date</label>
              <input
                type="date"
                value={hireDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setHireDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Change password ── */}
          <p className="pt-2 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">Change Password <span className="normal-case font-normal text-gray-400 dark:text-gray-600">(optional)</span></p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Required to set a new password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Confirm New</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Sign Out
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
