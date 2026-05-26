import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { Employee, EmployeeMonthlySchedule, SpecialLeaveRange } from "../types";
import type { DeptSettings } from "./database";

const CLOUD_DOC = doc(db, "hospitalTimesheets", "default");

export interface CloudState {
  employees?: Employee[];
  schedules?: { [employeeId: string]: EmployeeMonthlySchedule };
  schedulesByPeriod?: { [period: string]: { [employeeId: string]: EmployeeMonthlySchedule } };
  settings?: DeptSettings;
  specialLeaves?: SpecialLeaveRange[];
}

export function periodKey(year: number, month: number) {
  return `${year}_${month}`;
}

export async function getCloudState(): Promise<CloudState | null> {
  const snapshot = await getDoc(CLOUD_DOC);
  return snapshot.exists() ? (snapshot.data() as CloudState) : null;
}

export function saveCloudStatePatch(patch: CloudState) {
  void setDoc(CLOUD_DOC, { ...patch, updatedAt: serverTimestamp() }, { merge: true }).catch((error) => {
    console.error("Firebase save failed", error);
  });
}

export function saveSchedulesForPeriod(
  year: number,
  month: number,
  schedules: { [employeeId: string]: EmployeeMonthlySchedule },
) {
  saveCloudStatePatch({
    schedules,
    schedulesByPeriod: {
      [periodKey(year, month)]: schedules,
    },
  });
}
