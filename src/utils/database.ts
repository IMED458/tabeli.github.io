/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee, EmployeeMonthlySchedule, SpecialLeaveRange } from "../types";
import { getInitialShifts } from "../constants";
import {
  JUNE_2026_DEPT_SETTINGS,
  JUNE_2026_EMPLOYEES,
  JUNE_2026_SCHEDULES,
  JUNE_2026_SPECIAL_LEAVES,
} from "../data/june2026";
import { saveCloudStatePatch, periodKey } from "./cloudDatabase";

export interface DeptSettings {
  companyName: string;
  departmentName: string;
  year: number;
  month: number;
  standardHoursNorm: number;
}

export const DEFAULT_DEPT_SETTINGS: DeptSettings = {
  ...JUNE_2026_DEPT_SETTINGS,
};

// All data lives in Firestore. These helpers just write to Firestore.

export function getStoredEmployees(): Employee[] {
  return JUNE_2026_EMPLOYEES;
}

export function setStoredEmployees(employees: Employee[]) {
  saveCloudStatePatch({ employees });
}

export function getStoredSchedules(employees: Employee[], year: number, month: number): { [employeeId: string]: EmployeeMonthlySchedule } {
  if (year === 2026 && month === 6) return JUNE_2026_SCHEDULES;
  const initialShiftsMap = getInitialShifts(employees, year, month);
  const result: { [employeeId: string]: EmployeeMonthlySchedule } = {};
  employees.forEach((emp) => {
    result[emp.id] = { employeeId: emp.id, year, month, shifts: initialShiftsMap[emp.id] || {} };
  });
  return result;
}

export function setStoredSchedules(schedules: { [employeeId: string]: EmployeeMonthlySchedule }) {
  saveCloudStatePatch({ schedules });
}

export function getStoredDeptSettings(): DeptSettings {
  return DEFAULT_DEPT_SETTINGS;
}

export function setStoredDeptSettings(settings: DeptSettings) {
  saveCloudStatePatch({ settings });
}

export function getStoredSpecialLeaves(): SpecialLeaveRange[] {
  return JUNE_2026_SPECIAL_LEAVES;
}

export function setStoredSpecialLeaves(leaves: SpecialLeaveRange[]) {
  saveCloudStatePatch({ specialLeaves: leaves });
}

export function initFirestoreWithDefaults() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const settings: DeptSettings = {
    ...DEFAULT_DEPT_SETTINGS,
    year: currentYear,
    month: currentMonth,
  };
  const defaultScheds = currentYear === 2026 && currentMonth === 6 ? JUNE_2026_SCHEDULES : {};
  saveCloudStatePatch({
    employees: JUNE_2026_EMPLOYEES,
    settings,
    schedules: currentYear === 2026 && currentMonth === 6 ? JUNE_2026_SCHEDULES : {},
    schedulesByPeriod: {
      [periodKey(2026, 6)]: JUNE_2026_SCHEDULES,
      [periodKey(currentYear, currentMonth)]: defaultScheds,
    },
    specialLeaves: JUNE_2026_SPECIAL_LEAVES,
  });
}
