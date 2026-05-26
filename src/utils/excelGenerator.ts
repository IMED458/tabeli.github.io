/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ExcelJS from "exceljs";
import { Employee, EmployeeMonthlySchedule, SpecialLeaveRange } from "../types";
import { isHolidayOrWeekend, GEORGIAN_MONTHS } from "../constants";

interface ExcelGenerateProps {
  companyName: string;
  departmentName: string;
  year: number;
  month: number;
  employees: Employee[];
  schedules: { [employeeId: string]: EmployeeMonthlySchedule };
  filterPosition: string;
  standardMonthlyHours: number;
  specialLeaves: SpecialLeaveRange[];
}

export async function generateExcelTimesheet({
  companyName,
  departmentName,
  year,
  month,
  employees,
  schedules,
  standardMonthlyHours,
  specialLeaves = [],
}: ExcelGenerateProps): Promise<Blob> {
  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("ტაბელი", {
    views: [{ showGridLines: true }],
  });

  const yearStr = String(year);
  const monthStr = String(month).padStart(2, "0");
  const monthName = GEORGIAN_MONTHS[month];
  
  // Calculate total days in this specific month
  const numDays = new Date(year, month, 0).getDate();

  // Define Groups & Ordering as requested
  const doctorPositions = ["უფროსი ექიმი", "ექიმი", "უმცროსი ექიმი"];
  const nursePositions = ["უფროსი ექთანი", "სუპერვაიზერი", "ექთანი", "ექთნის დამხმარე", "სანიტარი"];

  const getDoctorRank = (pos: string) => {
    if (pos === "უფროსი ექიმი") return 1;
    if (pos === "ექიმი") return 2;
    return 3; // "უმცროსი ექიმი"
  };

  const getNurseRank = (pos: string) => {
    if (pos === "უფროსი ექთანი") return 1;
    if (pos === "სუპერვაიზერი") return 2;
    if (pos === "ექთანი") return 3;
    if (pos === "ექთნის დამხმარე") return 4;
    return 5; // "სანიტარი"
  };

  const sortedDoctors = employees
    .filter((emp) => doctorPositions.includes(emp.position))
    .sort((a, b) => getDoctorRank(a.position) - getDoctorRank(b.position));

  const sortedNurses = employees
    .filter((emp) => nursePositions.includes(emp.position))
    .sort((a, b) => getNurseRank(a.position) - getNurseRank(b.position));

  // Borders helper
  const thinBorder: ExcelJS.Border = { style: "thin", color: { argb: "FFA0A0A0" } };
  const thickBorder: ExcelJS.Border = { style: "medium", color: { argb: "FF333333" } };

  // 1. COMPANY NAME
  worksheet.mergeCells("A2:AP2");
  const companyCell = worksheet.getCell("A2");
  companyCell.value = companyName || "შპს ინგოროყვას კლინიკა";
  companyCell.font = { name: "Arial", size: 11, bold: true };
  companyCell.alignment = { horizontal: "center", vertical: "middle" };

  // 2. DOCUMENT TITLE
  worksheet.mergeCells("A3:AP3");
  const titleCell = worksheet.getCell("A3");
  titleCell.value = "სამუშაო დროის აღრიცხვის ფორმა (ტაბელი)";
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF0F4C81" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // 3. DEPARTMENT AND BILLING PERIOD
  worksheet.mergeCells("A4:S4");
  const deptCell = worksheet.getCell("A4");
  deptCell.value = `განყოფილება: ${departmentName || "მიმღები განყოფილება (რეანიმაცია)"}`;
  deptCell.font = { name: "Arial", size: 10, bold: true };
  deptCell.alignment = { horizontal: "left", vertical: "middle" };

  worksheet.mergeCells("T4:AP4");
  const periodCell = worksheet.getCell("T4");
  const lastDay = String(numDays).padStart(2, "0");
  periodCell.value = `საანგარიშო პერიოდი: 01.${monthStr}.${yearStr} -დან  ${lastDay}.${monthStr}.${yearStr} -ით`;
  periodCell.font = { name: "Arial", size: 10, bold: true };
  periodCell.alignment = { horizontal: "right", vertical: "middle" };

  worksheet.getRow(2).height = 20;
  worksheet.getRow(3).height = 28;
  worksheet.getRow(4).height = 22;
  worksheet.getRow(5).height = 12; // spacer row

  // 4. COLUMN WIDTH SETUP
  const colWidths: { [key: string]: number } = {
    A: 5,   // No
    B: 24,  // Full Name
    C: 14,  // Personal ID
    D: 18,  // Position
  };

  // Days widths
  for (let d = 1; d <= 31; d++) {
    const colName = getColumnName(4 + d); // Day 1 will be E (column 5)
    colWidths[colName] = 4.2;
  }

  // Exact 7 summary columns (Plus one Signature Column)
  const lastDayColIndex = 4 + numDays;
  const sumCols = [
    { label: "თვის განმავლობაში ნამუშევარ დღეთა ჯამური რაოდენობა", width: 14 },
    { label: "თვის განმავლობაში ნამუშევარი საათების ჯამური რაოდენობა", width: 14 },
    { label: "თვის განმავლობაში ზეგანაკვეთური ნამუშევარი საათების ჯამური რაოდენობა", width: 14 },
    { label: "თვის განმავლობაში ღამით (22:00-დან 6:00-მდე პერიოდი) ნამუშევარი საათების ჯამური რაოდენობა", width: 14 },
    { label: "თვის განმავლობაში დასვენების,უქმე დღეებში ნამუშევარი საათების ჯამური რაოდენობა", width: 14 },
    { label: "სხვა (7-9 გრაფებისგან განსხვავებული ნამუშევარი საათების ჯამური რაოდენობა)", width: 14 },
    { label: "ხელისმოწერა", width: 12 }
  ];

  sumCols.forEach((colInfo, idx) => {
    const colName = getColumnName(lastDayColIndex + 1 + idx);
    colWidths[colName] = colInfo.width;
  });

  // Apply column widths to worksheet
  Object.keys(colWidths).forEach((col) => {
    worksheet.getColumn(col).width = colWidths[col];
  });

  // 5. HELPER FOR RENDERING HEADER ROW
  const writeTableHeader = (startRow: number) => {
    const headerRow6 = worksheet.getRow(startRow);
    const headerRow7 = worksheet.getRow(startRow + 1);
    headerRow6.height = 32;
    headerRow7.height = 42; // plenty of space for vertical wrapping

    // №
    worksheet.mergeCells(`${getColumnName(1)}${startRow}:${getColumnName(1)}${startRow + 1}`);
    const hNo = worksheet.getCell(`${getColumnName(1)}${startRow}`);
    hNo.value = "№";
    
    // Name
    worksheet.mergeCells(`${getColumnName(2)}${startRow}:${getColumnName(2)}${startRow + 1}`);
    const hName = worksheet.getCell(`${getColumnName(2)}${startRow}`);
    hName.value = "თანამშრომლის სახელი, გვარი";
    
    // Personal ID
    worksheet.mergeCells(`${getColumnName(3)}${startRow}:${getColumnName(3)}${startRow + 1}`);
    const hID = worksheet.getCell(`${getColumnName(3)}${startRow}`);
    hID.value = "პირადი №";

    // Position
    worksheet.mergeCells(`${getColumnName(4)}${startRow}:${getColumnName(4)}${startRow + 1}`);
    const hPos = worksheet.getCell(`${getColumnName(4)}${startRow}`);
    hPos.value = "თანამდებობა";

    // Days label
    const valFirstDayCol = "E" + startRow;
    const valLastDayCol = getColumnName(4 + numDays) + startRow;
    worksheet.mergeCells(`${valFirstDayCol}:${valLastDayCol}`);
    const hDays = worksheet.getCell(valFirstDayCol);
    hDays.value = `თვის დღეები (${monthName})`;

    // Daily indexes
    for (let d = 1; d <= numDays; d++) {
      const cellName = getColumnName(4 + d) + (startRow + 1);
      const cell = worksheet.getCell(cellName);
      cell.value = d;
      
      const dateStr = `${year}-${monthStr}-${String(d).padStart(2, "0")}`;
      const isWE = isHolidayOrWeekend(dateStr);
      if (isWE) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFEBEE" },
        };
      } else {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F5F5" },
        };
      }
    }

    // Exact requested summary headers (Merges startRow and startRow+1)
    sumCols.forEach((colInfo, idx) => {
      const colName = getColumnName(lastDayColIndex + 1 + idx);
      const cellRange = `${colName}${startRow}:${colName}${startRow + 1}`;
      worksheet.mergeCells(cellRange);
      const cell = worksheet.getCell(`${colName}${startRow}`);
      cell.value = colInfo.label;
    });

    // Color and border styles for Header Rows
    const maxColumnLimit = lastDayColIndex + sumCols.length;
    for (let r = startRow; r <= startRow + 1; r++) {
      const row = worksheet.getRow(r);
      for (let c = 1; c <= maxColumnLimit; c++) {
        const cell = row.getCell(c);
        cell.font = { name: "Arial", size: 8, bold: true, color: { argb: "FF1A237E" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        
        if (r === startRow && c >= 5 && c <= lastDayColIndex) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE1F5FE" },
          };
        } else if (!cell.fill) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF0F4F8" },
          };
        }
        
        cell.border = {
          top: thinBorder,
          left: thinBorder,
          bottom: thinBorder,
          right: thinBorder,
        };
      }
    }
  };

  // 6. HELPER FOR RENDERING DATA ROWS
  const writeSectionRows = (titleLine: string, list: Employee[], startRow: number): number => {
    // Add sectional descriptor row
    worksheet.mergeCells(`A${startRow}:AQ${startRow}`);
    const sectionTitleCell = worksheet.getCell(`A${startRow}`);
    sectionTitleCell.value = `★ ${titleLine.toUpperCase()}`;
    sectionTitleCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0D47A1" } };
    sectionTitleCell.alignment = { horizontal: "left", vertical: "middle" };
    sectionTitleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE3F2FD" },
    };
    worksheet.getRow(startRow).height = 24;

    const tableHeaderStart = startRow + 1;
    writeTableHeader(tableHeaderStart);

    let currentCursor = tableHeaderStart + 2;

    list.forEach((emp, index) => {
      const row = worksheet.getRow(currentCursor);
      row.height = 23;

      // Index
      row.getCell(1).value = index + 1;
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

      // Name
      row.getCell(2).value = emp.name;
      row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };

      // Personal ID
      row.getCell(3).value = emp.personalId;
      row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };

      // Position
      const displayPos = emp.position === "უფროსი ექიმი" ? "განყოფილების უფროსი ექიმი" : emp.position;
      row.getCell(4).value = displayPos;
      row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };

      const empSpecialStatus = emp.specialStatus;

      if (empSpecialStatus) {
        // Merge working days Cells
        const startDayCol = "E";
        const endDayCol = getColumnName(4 + numDays);
        worksheet.mergeCells(`${startDayCol}${currentCursor}:${endDayCol}${currentCursor}`);

        const mergedStatusCell = row.getCell(5);
        mergedStatusCell.value = `— ${empSpecialStatus.toUpperCase()} —`;
        mergedStatusCell.font = { name: "Arial", size: 9, bold: true, italic: true, color: { argb: "FFD84315" } };
        mergedStatusCell.alignment = { horizontal: "center", vertical: "middle" };
        mergedStatusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFF9C4" },
        };

        // Fill formula totals to 0
        for (let sIdx = 1; sIdx <= sumCols.length; sIdx++) {
          const cVal = row.getCell(lastDayColIndex + sIdx);
          cVal.value = 0;
          cVal.alignment = { horizontal: "center", vertical: "middle" };
        }
      } else {
        const sched = schedules[emp.id];
        const shifts = sched ? sched.shifts : {};

        let workedDays = 0;
        let workedHoursSum = 0;
        let nightHoursSum = 0;
        let holidayHoursSum = 0;

        for (let d = 1; d <= numDays; d++) {
          const cell = row.getCell(4 + d);
          const shiftData = shifts[d];

          const dateStr = `${yearStr}-${monthStr}-${String(d).padStart(2, "0")}`;
          const isWE = isHolidayOrWeekend(dateStr);
          
          // Primary: Check if this employee has an active range-based special leave on this day
          const activeRangeLeave = specialLeaves?.find(l => 
            l.employeeId === emp.id && 
            l.startDate <= dateStr && 
            dateStr <= l.endDate
          );

          if (activeRangeLeave) {
            const abb = activeRangeLeave.type === "დეკრეტული შვებულება" ? "დეკრ" :
                        activeRangeLeave.type === "შვებულება" ? "შვბ" :
                        activeRangeLeave.type === "ავადმყოფობა" ? "ავად" :
                        activeRangeLeave.type === "ბიულეტენი" ? "ბიულ" :
                        activeRangeLeave.type === "ადმინისტრაციული" ? "ადმ" : "გაცდ";
            cell.value = abb;
            cell.font = { name: "Arial", size: 8, bold: true, color: { argb: "FF7F5F00" } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFECB3" }, // high contrast soft amber
            };
            continue; // skip hours evaluation for this day
          }

          if (isWE) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFF1F1" },
            };
          }

          if (shiftData && shiftData.hours && shiftData.hours > 0) {
            const hrs = shiftData.hours;
            cell.value = hrs;
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.font = { name: "Arial", size: 9, bold: true };

            workedDays += 1;
            workedHoursSum += hrs;

            if (hrs === 24) {
              nightHoursSum += 8;
            } else if (hrs === 12) {
              nightHoursSum += 4;
            }

            if (isWE) {
              holidayHoursSum += hrs;
            }
          } else {
            cell.value = "";
          }
        }

        const overtimeHours = workedHoursSum > standardMonthlyHours ? workedHoursSum - standardMonthlyHours : 0;
        const otherHoursSum = Math.max(0, workedHoursSum - nightHoursSum - holidayHoursSum);

        // Map sums into Excel columns in correct sequential order
        row.getCell(lastDayColIndex + 1).value = workedDays;
        row.getCell(lastDayColIndex + 2).value = workedHoursSum;
        row.getCell(lastDayColIndex + 3).value = overtimeHours;
        row.getCell(lastDayColIndex + 4).value = nightHoursSum;
        row.getCell(lastDayColIndex + 5).value = holidayHoursSum;
        row.getCell(lastDayColIndex + 6).value = otherHoursSum;
        row.getCell(lastDayColIndex + 7).value = ""; // blank signature
      }

      // Border guidelines
      const maxColIdx = lastDayColIndex + sumCols.length;
      for (let c = 1; c <= maxColIdx; c++) {
        const cell = row.getCell(c);
        if (!cell.font) {
          cell.font = { name: "Arial", size: 9 };
        }
        cell.border = {
          top: thinBorder,
          left: thinBorder,
          bottom: thinBorder,
          right: thinBorder,
        };

        if (c > lastDayColIndex) {
          cell.font = { name: "Arial", size: 9, bold: true };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FBE7" },
          };
        }
      }

      currentCursor++;
    });

    return currentCursor;
  };

  // Run builders for doctors and nurses
  let currentActiveRow = 7;
  currentActiveRow = writeSectionRows("1. ექიმთა შემადგენლობა (ტაბელი)", sortedDoctors, currentActiveRow);
  
  // Add separator spacing 
  currentActiveRow += 2;
  currentActiveRow = writeSectionRows("2. ექთნები და დამხმარე სამედიცინო პერსონალი (ტაბელი)", sortedNurses, currentActiveRow);

  // 7. FOOTER AND OFFICE SIGNATURE BLOCK AT THE VERY TAIL
  currentActiveRow += 3;
  
  worksheet.mergeCells(`B${currentActiveRow}:H${currentActiveRow}`);
  const compilerCell = worksheet.getCell(`B${currentActiveRow}`);
  compilerCell.value = "ტაბელის შემდგენელი: ___________________________";
  compilerCell.font = { name: "Arial", size: 10, bold: true };
  compilerCell.alignment = { horizontal: "left" };

  worksheet.mergeCells(`V${currentActiveRow}:AD${currentActiveRow}`);
  const approverCell = worksheet.getCell(`V${currentActiveRow}`);
  approverCell.value = "განყოფილების გამგე: ___________________________";
  approverCell.font = { name: "Arial", size: 10, bold: true };
  approverCell.alignment = { horizontal: "left" };

  currentActiveRow += 2;
  worksheet.mergeCells(`B${currentActiveRow}:H${currentActiveRow}`);
  const dateCell = worksheet.getCell(`B${currentActiveRow}`);
  dateCell.value = `შედგენის თარიღი: ___________________________`;
  dateCell.font = { name: "Arial", size: 10 };
  dateCell.alignment = { horizontal: "left" };

  worksheet.mergeCells(`V${currentActiveRow}:AD${currentActiveRow}`);
  const signCell = worksheet.getCell(`V${currentActiveRow}`);
  signCell.value = "კლინიკური დირექტორი: ___________________________";
  signCell.font = { name: "Arial", size: 10, bold: true };
  signCell.alignment = { horizontal: "left" };

  // Generate binary
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function getColumnName(num: number): string {
  let temp;
  let letter = "";
  while (num > 0) {
    temp = (num - 1) % 26;
    letter = String.fromCharCode(65 + temp) + letter;
    num = (num - temp - 1) / 26;
  }
  return letter;
}
