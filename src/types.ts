/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PositionType =
  | "ექიმი"
  | "უმცროსი ექიმი"
  | "ექთანი"
  | "ექთნის დამხმარე"
  | "სანიტარი"
  | "სუპერვაიზერი"
  | "უფროსი ექიმი"
  | "უფროსი ექთანი"
  | "ადმინისტრატორი";

export type SpecialStatusType =
  | "დეკრეტული შვებულება"
  | "შვებულება"
  | "ავადმყოფობა"
  | "ბიულეტენი"
  | "ადმინისტრაციული"
  | "გაცდენა";

export interface Employee {
  id: string; // unique ID
  number: number; // sequential number for timesheet display
  name: string; // Full Name
  personalId: string; // 11-digit personal ID
  position: PositionType;
  specialStatus?: SpecialStatusType | null; // active special status for the selected month which covers all days
  username?: string; // admin login username (for senior doctor / senior nurse)
  password?: string; // admin login password (for senior doctor / senior nurse)
  inactiveFromPeriod?: string; // YYYY_M; hidden from this month onward, preserving older schedules
}

export interface SpecialLeaveRange {
  id: string;
  employeeId: string;
  type: SpecialStatusType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface DailyShift {
  hours?: number; // e.g. 24, 12, 8, 6
  isNightShift?: boolean; // starting custom night rules or details
  isHoliday?: boolean; // overridden holiday hours manually
}

export type MonthlyShifts = {
  [day: number]: DailyShift; // Keyed by day of month (1 to 28-31)
};

export interface EmployeeMonthlySchedule {
  employeeId: string;
  year: number;
  month: number; // 0-indexed (0 = Jan, 2 = Mar) or 1-indexed (1-12). Let's use 1-indexed (1-12) for simplicity.
  shifts: MonthlyShifts;
  specialStatus?: SpecialStatusType | null; // monthly coverage status
}

export interface DepartmentSettings {
  companyName: string;
  departmentName: string;
  year: number;
  month: number; // 1-12
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string; // name of holiday
}
