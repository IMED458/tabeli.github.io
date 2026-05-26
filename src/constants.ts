/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee, PositionType, SpecialStatusType } from "./types";

export const POSITIONS: PositionType[] = [
  "ექიმი",
  "უმცროსი ექიმი",
  "ექთანი",
  "ექთნის დამხმარე",
  "სანიტარი",
  "სუპერვაიზერი",
  "უფროსი ექიმი",
  "უფროსი ექთანი",
  "ადმინისტრატორი",
];

export const SPECIAL_STATUSES: SpecialStatusType[] = [
  "დეკრეტული შვებულება",
  "შვებულება",
  "ავადმყოფობა",
  "ბიულეტენი",
  "ადმინისტრაციული",
  "გაცდენა",
];

export const GEORGIAN_HOLIDAYS_MULTYEAR = [
  "01-01", // New Year
  "01-02", // New Year Day 2
  "01-07", // Christmas
  "01-19", // Epiphany
  "03-03", // Mother's Day
  "03-08", // Women's Day
  "04-09", // National Unity Day
  "05-09", // Victory Day
  "05-12", // St. Andrew's Day
  "05-26", // Independence Day
  "08-28", // Mariamoba (Assumption)
  "10-14", // Svetitskhovloba
  "11-23", // Giorgoba (St. George)
];

// Returns if a specific YYYY-MM-DD date is a holiday or weekend in Georgia
export function isHolidayOrWeekend(dateStr: string): boolean {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }
  const mmDd = dateStr.substring(5, 10); // MM-DD
  return GEORGIAN_HOLIDAYS_MULTYEAR.includes(mmDd);
}

export const GEORGIAN_MONTHS: { [key: number]: string } = {
  1: "იანვარი",
  2: "თებერვალი",
  3: "მარტი",
  4: "აპრილი",
  5: "მაისი",
  6: "ივნისი",
  7: "ივლისი",
  8: "აგვისტო",
  9: "სექტემბერი",
  10: "ოქტომბერი",
  11: "ნოემბერი",
  12: "დეკემბერი",
};

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: "emp-1",
    number: 1,
    name: "გიორგი იმედაშვილი",
    personalId: "01024045618",
    position: "უფროსი ექიმი",
  },
  {
    id: "emp-2",
    number: 2,
    name: "ნინო ახვლედიანი",
    personalId: "01019083311",
    position: "ექიმი",
  },
  {
    id: "emp-3",
    number: 3,
    name: "დავით კვირიკაშვილი",
    personalId: "54001024391",
    position: "ექიმი",
  },
  {
    id: "emp-4",
    number: 4,
    name: "თამარ მაისურაძე",
    personalId: "01030018442",
    position: "უმცროსი ექიმი",
  },
  {
    id: "emp-5",
    number: 5,
    name: "ეკატერინე თოდუა",
    personalId: "01017044229",
    position: "უფროსი ექთანი",
  },
  {
    id: "emp-6",
    number: 6,
    name: "მარიამ ბერიძე",
    personalId: "19001041112",
    position: "ექთანი",
  },
  {
    id: "emp-7",
    number: 7,
    name: "ნათია კობახიძე",
    personalId: "01024119932",
    position: "ექთანი",
  },
  {
    id: "emp-8",
    number: 8,
    name: "ზურაბ ჯაფარიძე",
    personalId: "60001099221",
    position: "ექთნის დამხმარე",
  },
  {
    id: "emp-9",
    number: 9,
    name: "ლევან მჭედლიშვილი",
    personalId: "01011048821",
    position: "სანიტარი",
  },
  {
    id: "emp-10",
    number: 10,
    name: "სალომე ხერგიანი",
    personalId: "01027011992",
    position: "სუპერვაიზერი",
    specialStatus: "შვებულება", // Demonstrates special status row blending!
  },
];

// Returns an initial beautiful shift scheduling for March 2025 (31 days)
export function getInitialShifts(employees: Employee[], year: number, month: number): { [key: string]: any } {
  const schedules: { [key: string]: any } = {};
  
  // Set up standard repeating schedules or custom mock shifts for visual richness
  employees.forEach((emp, index) => {
    const s: { [day: number]: { hours?: number } } = {};
    
    // Skip if employee has active monthly special status (like emp-10, Salome)
    if (emp.specialStatus) {
      schedules[emp.id] = s;
      return;
    }

    // Let's create varying patterns
    if (emp.position === "უფროსი ექიმი" || emp.position === "სუპერვაიზერი") {
      // 8-hour day shifts on weekdays
      for (let day = 1; day <= 31; day++) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const isWE = isHolidayOrWeekend(dateStr);
        if (!isWE) {
          s[day] = { hours: 8 };
        }
      }
    } else if (emp.position === "ექიმი" || emp.position === "უმცროსი ექიმი") {
      // Alternating 24-hour shifts: e.g. every 4th day
      const startDay = 1 + (index % 4);
      for (let day = startDay; day <= 31; day += 4) {
        s[day] = { hours: 24 };
      }
    } else if (emp.position.includes("ექთანი") || emp.position === "სანიტარი") {
      // 12-hour shifts: day shift (12 hours) then night shift (12 hours) then rest.
      // E.g. every 3rd day
      const startDay = 1 + (index % 3);
      for (let day = startDay; day <= 31; day += 3) {
        s[day] = { hours: 12 };
      }
    } else {
      // General 8 hours
      for (let day = 1; day <= 31; day++) {
        if (day % 2 === 1) {
          s[day] = { hours: 8 };
        }
      }
    }
    schedules[emp.id] = s;
  });

  return schedules;
}
