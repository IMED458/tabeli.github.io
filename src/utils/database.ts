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
import { saveCloudStatePatch } from "./cloudDatabase";

const EMPLOYEES_KEY = "hospital_employees";
const SCHEDULES_KEY = "hospital_schedules";
const DEPT_SETTINGS_KEY = "hospital_dept_settings";
const SPECIAL_LEAVES_KEY = "hospital_special_leaves";

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

export function getStoredEmployees(): Employee[] {
  try {
    const data = localStorage.getItem(EMPLOYEES_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to parse stored employees", e);
  }
  
  // Set default if empty
  setStoredEmployees(JUNE_2026_EMPLOYEES);
  return JUNE_2026_EMPLOYEES;
}

export function setStoredEmployees(employees: Employee[]) {
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  saveCloudStatePatch({ employees });
}

export function getStoredSchedules(employees: Employee[], year: number, month: number): { [employeeId: string]: EmployeeMonthlySchedule } {
  try {
    const data = localStorage.getItem(SCHEDULES_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Validate structure is correct, otherwise recalculate
      if (Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse stored schedules", e);
  }

  if (year === 2026 && month === 6) {
    setStoredSchedules(JUNE_2026_SCHEDULES);
    return JUNE_2026_SCHEDULES;
  }

  // Pre-generate shifts for months without an imported source timesheet.
  const initialShiftsMap = getInitialShifts(employees, year, month);
  const result: { [employeeId: string]: EmployeeMonthlySchedule } = {};
  
  employees.forEach((emp) => {
    result[emp.id] = {
      employeeId: emp.id,
      year,
      month,
      shifts: initialShiftsMap[emp.id] || {},
    };
  });

  setStoredSchedules(result);
  return result;
}

export function setStoredSchedules(schedules: { [employeeId: string]: EmployeeMonthlySchedule }) {
  localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
  saveCloudStatePatch({ schedules });
}

export function getStoredDeptSettings(): DeptSettings {
  try {
    const data = localStorage.getItem(DEPT_SETTINGS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to parse dept settings", e);
  }
  return DEFAULT_DEPT_SETTINGS;
}

export function setStoredDeptSettings(settings: DeptSettings) {
  localStorage.setItem(DEPT_SETTINGS_KEY, JSON.stringify(settings));
  saveCloudStatePatch({ settings });
}

export function getStoredSpecialLeaves(): SpecialLeaveRange[] {
  try {
    const data = localStorage.getItem(SPECIAL_LEAVES_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to parse special leaves", e);
  }
  setStoredSpecialLeaves(JUNE_2026_SPECIAL_LEAVES);
  return JUNE_2026_SPECIAL_LEAVES;
}

export function setStoredSpecialLeaves(leaves: SpecialLeaveRange[]) {
  localStorage.setItem(SPECIAL_LEAVES_KEY, JSON.stringify(leaves));
  saveCloudStatePatch({ specialLeaves: leaves });
}
