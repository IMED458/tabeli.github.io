import type { Employee, EmployeeMonthlySchedule, SpecialLeaveRange } from "../types";
import type { DeptSettings } from "../utils/database";

export const JUNE_2026_DEPT_SETTINGS: DeptSettings = {
  companyName: "შპს თბილისის სახელმწიფო სამედიცინო უნივერსიტეტისა და ინგოროყვას მაღალი სამედიცინო ტექნოლოგიების საუნივერსიტეტო კლინიკა",
  departmentName: "მოზრდილთა ემერჯენსი",
  year: 2026,
  month: 6,
  standardHoursNorm: 176,
};

export const JUNE_2026_EMPLOYEES: Employee[] = [
  { id: "emp-1", number: 1, name: "ანა დალაქიშვილი", personalId: "01020003548", position: "უფროსი ექიმი" },
  { id: "emp-2", number: 2, name: "კიკვაძე ნინო", personalId: "350011035950", position: "ექიმი" },
  { id: "emp-3", number: 3, name: "მარიამ კვერნაძე", personalId: "37001058325", position: "ექიმი" },
  { id: "emp-4", number: 4, name: "მაისურაძე თეკლა", personalId: "35001112705", position: "ექიმი" },
  { id: "emp-5", number: 5, name: "მიქელაძე ეკატერინე", personalId: "01011058447", position: "ექიმი" },
  { id: "emp-6", number: 6, name: "ზედელაშვილი ქეთი", personalId: "40001009851", position: "ექიმი" },
  { id: "emp-7", number: 7, name: "მიგინეიშვილი მურადი", personalId: "01024070013", position: "ექიმი" },
  { id: "emp-8", number: 8, name: "ონიანი ნინო", personalId: "27001007422", position: "ექიმი" },
  { id: "emp-9", number: 9, name: "მირიანაშვილი მარიამი", personalId: "40001038612", position: "ექიმი" },
  { id: "emp-10", number: 10, name: "ჯაპავა ანა", personalId: "19001101233", position: "უმცროსი ექიმი" },
  { id: "emp-11", number: 11, name: "კასრელიშვილი ნათია", personalId: "13001041618", position: "უმცროსი ექიმი" },
  { id: "emp-12", number: 12, name: "ერაძე ცოტნე", personalId: "01024089605", position: "უმცროსი ექიმი" },
  { id: "emp-13", number: 13, name: "მახარაშვილი ნინო", personalId: "14001026762", position: "უმცროსი ექიმი" },
  { id: "emp-14", number: 14, name: "აფხაზიშვილი მიხეილ", personalId: "01027072015", position: "უმცროსი ექიმი" },
  { id: "emp-15", number: 15, name: "მამედოვა გულშანა", personalId: "10001069085", position: "უმცროსი ექიმი" },
  { id: "emp-16", number: 16, name: "ალეკო თურმანიძე", personalId: "42001036060", position: "უმცროსი ექიმი" },
  { id: "emp-17", number: 17, name: "ვახტან ისკანდაროღლი", personalId: "01027068665", position: "უმცროსი ექიმი" },
  { id: "emp-18", number: 18, name: "ნიკა არახამია", personalId: "01027075684", position: "უმცროსი ექიმი" },
  { id: "emp-19", number: 19, name: "ანი ესვანჯია", personalId: "01024078311", position: "უმცროსი ექიმი" },
  { id: "emp-20", number: 20, name: "მონიკა ქობალია", personalId: "62909012853", position: "უმცროსი ექიმი" },
  { id: "emp-21", number: 21, name: "თათია ღვინიაშვილი", personalId: "01011083906", position: "უმცროსი ექიმი" },
  { id: "emp-22", number: 22, name: "ნიკოლოზ ლუტიძე", personalId: "01027087166", position: "უმცროსი ექიმი" },
  { id: "emp-23", number: 23, name: "ბურჯანაძე ნათელა", personalId: "09001001003", position: "უმცროსი ექიმი" },
];

export const JUNE_2026_SCHEDULES: { [employeeId: string]: EmployeeMonthlySchedule } = {
  "emp-1": { employeeId: "emp-1", year: 2026, month: 6, shifts: {} },
  "emp-2": { employeeId: "emp-2", year: 2026, month: 6, shifts: { 1: { hours: 24 }, 5: { hours: 24 }, 9: { hours: 24 }, 13: { hours: 24 }, 17: { hours: 24 }, 25: { hours: 24 } } },
  "emp-3": { employeeId: "emp-3", year: 2026, month: 6, shifts: { 3: { hours: 24 }, 7: { hours: 24 }, 11: { hours: 24 }, 13: { hours: 24 }, 15: { hours: 24 }, 27: { hours: 24 }, 29: { hours: 24 } } },
  "emp-4": { employeeId: "emp-4", year: 2026, month: 6, shifts: { 23: { hours: 23 }, 27: { hours: 24 } } },
  "emp-5": { employeeId: "emp-5", year: 2026, month: 6, shifts: {} },
  "emp-6": { employeeId: "emp-6", year: 2026, month: 6, shifts: { 2: { hours: 24 }, 6: { hours: 24 }, 10: { hours: 24 }, 22: { hours: 24 }, 26: { hours: 24 }, 30: { hours: 24 } } },
  "emp-7": { employeeId: "emp-7", year: 2026, month: 6, shifts: { 19: { hours: 24 }, 21: { hours: 24 } } },
  "emp-8": { employeeId: "emp-8", year: 2026, month: 6, shifts: { 14: { hours: 24 }, 18: { hours: 24 } } },
  "emp-9": { employeeId: "emp-9", year: 2026, month: 6, shifts: { 4: { hours: 24 }, 8: { hours: 24 }, 12: { hours: 24 }, 16: { hours: 24 }, 20: { hours: 24 }, 24: { hours: 24 }, 28: { hours: 24 } } },
  "emp-10": { employeeId: "emp-10", year: 2026, month: 6, shifts: { 12: { hours: 24 }, 20: { hours: 24 } } },
  "emp-11": { employeeId: "emp-11", year: 2026, month: 6, shifts: { 2: { hours: 24 }, 6: { hours: 24 }, 10: { hours: 24 }, 14: { hours: 24 }, 18: { hours: 24 }, 22: { hours: 24 }, 26: { hours: 24 }, 30: { hours: 24 } } },
  "emp-12": { employeeId: "emp-12", year: 2026, month: 6, shifts: { 2: { hours: 24 }, 6: { hours: 24 }, 10: { hours: 24 }, 14: { hours: 24 }, 18: { hours: 24 }, 22: { hours: 24 }, 26: { hours: 24 }, 30: { hours: 24 } } },
  "emp-13": { employeeId: "emp-13", year: 2026, month: 6, shifts: { 2: { hours: 24 }, 6: { hours: 24 }, 10: { hours: 24 }, 14: { hours: 24 }, 18: { hours: 24 }, 22: { hours: 24 }, 26: { hours: 24 }, 30: { hours: 24 } } },
  "emp-14": { employeeId: "emp-14", year: 2026, month: 6, shifts: { 4: { hours: 24 }, 8: { hours: 24 }, 12: { hours: 24 }, 16: { hours: 24 }, 20: { hours: 24 }, 24: { hours: 24 }, 28: { hours: 24 } } },
  "emp-15": { employeeId: "emp-15", year: 2026, month: 6, shifts: { 4: { hours: 24 }, 8: { hours: 24 }, 12: { hours: 24 }, 16: { hours: 24 }, 20: { hours: 24 }, 24: { hours: 24 }, 28: { hours: 24 } } },
  "emp-16": { employeeId: "emp-16", year: 2026, month: 6, shifts: { 4: { hours: 24 }, 8: { hours: 24 }, 12: { hours: 24 }, 16: { hours: 24 }, 20: { hours: 24 }, 24: { hours: 24 }, 28: { hours: 24 } } },
  "emp-17": { employeeId: "emp-17", year: 2026, month: 6, shifts: { 3: { hours: 24 }, 7: { hours: 24 }, 11: { hours: 24 }, 15: { hours: 24 }, 19: { hours: 24 }, 23: { hours: 24 }, 27: { hours: 24 } } },
  "emp-18": { employeeId: "emp-18", year: 2026, month: 6, shifts: { 3: { hours: 24 }, 7: { hours: 24 }, 11: { hours: 24 }, 15: { hours: 24 }, 19: { hours: 24 }, 23: { hours: 24 }, 27: { hours: 24 } } },
  "emp-19": { employeeId: "emp-19", year: 2026, month: 6, shifts: { 3: { hours: 24 }, 7: { hours: 24 }, 11: { hours: 24 }, 15: { hours: 24 }, 19: { hours: 24 }, 23: { hours: 24 }, 27: { hours: 24 } } },
  "emp-20": { employeeId: "emp-20", year: 2026, month: 6, shifts: { 1: { hours: 24 }, 5: { hours: 24 }, 9: { hours: 24 }, 13: { hours: 24 }, 17: { hours: 24 }, 21: { hours: 24 }, 25: { hours: 24 }, 29: { hours: 24 } } },
  "emp-21": { employeeId: "emp-21", year: 2026, month: 6, shifts: { 1: { hours: 24 }, 5: { hours: 24 }, 9: { hours: 24 }, 13: { hours: 24 }, 17: { hours: 24 }, 21: { hours: 24 }, 25: { hours: 24 }, 29: { hours: 24 } } },
  "emp-22": { employeeId: "emp-22", year: 2026, month: 6, shifts: { 1: { hours: 24 }, 5: { hours: 24 }, 9: { hours: 24 }, 13: { hours: 24 }, 17: { hours: 24 }, 21: { hours: 24 }, 25: { hours: 24 }, 29: { hours: 24 } } },
  "emp-23": { employeeId: "emp-23", year: 2026, month: 6, shifts: {} },
};

export const JUNE_2026_SPECIAL_LEAVES: SpecialLeaveRange[] = [
  { id: "leave-5-13", employeeId: "emp-5", type: "ბიულეტენი", startDate: "2026-06-13", endDate: "2026-06-13" },
  { id: "leave-23-12", employeeId: "emp-23", type: "დეკრეტული შვებულება", startDate: "2026-06-12", endDate: "2026-06-12" },
];
