import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
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

export function subscribeToCloudState(
  callback: (state: CloudState | null) => void,
): () => void {
  return onSnapshot(
    CLOUD_DOC,
    (snapshot) => {
      callback(snapshot.exists() ? (snapshot.data() as CloudState) : null);
    },
    (error) => {
      console.error("Firestore listener error", error);
      callback(null);
    },
  );
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
  const key = periodKey(year, month);
  void updateDoc(CLOUD_DOC, {
    schedules,
    [`schedulesByPeriod.${key}`]: schedules,
    updatedAt: serverTimestamp(),
  }).catch(() => {
    void setDoc(CLOUD_DOC, {
      schedules,
      schedulesByPeriod: { [key]: schedules },
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
}
