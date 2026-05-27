/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Employee, PositionType, SpecialStatusType, SpecialLeaveRange } from "../types";
import { isHolidayOrWeekend, GEORGIAN_MONTHS } from "../constants";
import { FileSpreadsheet, Edit3, X, UserCheck, Printer, Search, ChevronRight, RefreshCw, Sparkles, Trash2, Plus, UserX, CalendarRange, GripVertical } from "lucide-react";

const STATUS_ABBREVIATIONS: { [key in SpecialStatusType]: string } = {
  "დეკრეტული შვებულება": "დეკრ",
  "შვებულება": "შვბ",
  "ავადმყოფობა": "ავად",
  "ბიულეტენი": "ბიულ",
  "ადმინისტრაციული": "ადმ",
  "გაცდენა": "გაცდ",
};

interface TimesheetGridProps {
  employees: Employee[];
  schedules: { [employeeId: string]: any };
  year: number;
  month: number;
  filterPosition: string;
  setFilterPosition: (pos: string) => void;
  standardHoursNorm: number;
  onUpdateShift: (employeeId: string, day: number, hours: number) => void;
  onUpdateEmployeeSpecialStatus: (employeeId: string, status: SpecialStatusType | null) => void;
  onDownloadExcel: () => void;
  specialLeaves: SpecialLeaveRange[];
  isAdmin: boolean;
  loggedInEmployee: Employee | null;
  onSyncRhythmFromPreviousMonth?: () => void;
  onAddSpecialLeave?: (leave: Omit<SpecialLeaveRange, "id">) => void;
  onDeleteSpecialLeave?: (id: string) => void;
  onClearEmployeeShifts?: (employeeId: string) => void;
  onRemoveEmployeeFromMonth?: (employeeId: string) => void;
  onReorderEmployees?: (reorderedSection: Employee[]) => void;
  onApplyRhythmFromDay?: (
    employeeId: string,
    startDay: number,
    hours: number,
    pattern: "every_second" | "every_fourth" | "weekdays"
  ) => void;
}

export default function TimesheetGrid({
  employees,
  schedules,
  year,
  month,
  standardHoursNorm,
  onUpdateShift,
  onUpdateEmployeeSpecialStatus,
  onDownloadExcel,
  specialLeaves = [],
  isAdmin,
  loggedInEmployee,
  onSyncRhythmFromPreviousMonth,
  onAddSpecialLeave,
  onDeleteSpecialLeave,
  onClearEmployeeShifts,
  onRemoveEmployeeFromMonth,
  onReorderEmployees,
  onApplyRhythmFromDay,
}: TimesheetGridProps) {
  // States for cell editor popover
  const [editingCell, setEditingCell] = useState<{ employeeId: string; day: number } | null>(null);
  const [customHours, setCustomHours] = useState<string>("");
  const [rhythmHours, setRhythmHours] = useState<number>(24);

  // States for Special Status popup
  const [editingSpecialStatusId, setEditingSpecialStatusId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("__none__");

  // Drag-and-drop reorder state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, empId: string) => {
    setDraggedId(empId);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, empId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (empId !== dragOverId) setDragOverId(empId);
  };
  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null); };
  const handleDrop = (e: React.DragEvent, targetId: string, sectionList: Employee[]) => {
    e.preventDefault();
    setDraggedId(null);
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) return;
    const fromIdx = sectionList.findIndex(emp => emp.id === draggedId);
    const toIdx   = sectionList.findIndex(emp => emp.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...sectionList];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    // Redistribute the section's original numbers in the new order
    const origNumbers = sectionList.map(emp => emp.number).sort((a, b) => a - b);
    const renumbered = reordered.map((emp, i) => ({ ...emp, number: origNumbers[i] }));
    onReorderEmployees?.(renumbered);
  };

  // States for leave date-range form inside the status modal
  const [leaveFormType, setLeaveFormType] = useState<SpecialStatusType>("შვებულება");
  const [leaveFormStart, setLeaveFormStart] = useState<string>("");
  const [leaveFormEnd, setLeaveFormEnd] = useState<string>("");

  // Search keyword query state
  const [searchQuery, setSearchQuery] = useState("");

  const monthDaysCount = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: monthDaysCount }, (_, i) => i + 1);

  // Define position groupings as requested
  const doctorPositions = ["უფროსი ექიმი", "ექიმი", "უმცროსი ექიმი"];
  const nursePositions = ["უფროსი ექთანი", "სუპერვაიზერი", "ექთანი", "ექთნის დამხმარე", "სანიტარი"];

  // Search filter
  const filterBySearch = (emp: Employee) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    
    // Support searching customized Georgian clinical titles too
    const displayPos = emp.position === "უფროსი ექიმი" ? "განყოფილების უფროსი ექიმი" : emp.position;
    
    return (
      emp.name.toLowerCase().includes(query) ||
      emp.personalId.includes(query) ||
      displayPos.toLowerCase().includes(query)
    );
  };

  // Ordering sequences
  const getDoctorRank = (pos: string) => {
    if (pos === "უფროსი ექიმი") return 1; // "განყოფილების უფროსი ექიმი"
    if (pos === "ექიმი") return 2;
    return 3; // "უმცროსი ექიმი"
  };

  const getNurseRank = (pos: string) => {
    if (pos === "უფროსი ექთანი") return 1;
    if (pos === "სუპერვაიზერი") return 2; // "ვაიზერი"
    if (pos === "ექთანი") return 3;
    if (pos === "ექთნის დამხმარე") return 4;
    return 5; // "სანიტარი"
  };

  // Filter and sort the lists
  const doctorsList = employees
    .filter((emp) => doctorPositions.includes(emp.position))
    .filter(filterBySearch)
    .sort((a, b) => {
      const r = getDoctorRank(a.position) - getDoctorRank(b.position);
      return r !== 0 ? r : a.number - b.number;
    });

  const nursesList = employees
    .filter((emp) => nursePositions.includes(emp.position))
    .filter(filterBySearch)
    .sort((a, b) => {
      const r = getNurseRank(a.position) - getNurseRank(b.position);
      return r !== 0 ? r : a.number - b.number;
    });

  const showDoctors = !loggedInEmployee || loggedInEmployee.position === "ადმინისტრატორი" || doctorPositions.includes(loggedInEmployee.position);
  const showNurses = !loggedInEmployee || loggedInEmployee.position === "ადმინისტრატორი" || nursePositions.includes(loggedInEmployee.position);

  const openCellEditor = (employeeId: string, day: number, currentHrs?: number) => {
    setEditingCell({ employeeId, day });
    setCustomHours(currentHrs && currentHrs > 0 ? String(currentHrs) : "");
  };

  const saveCellShift = (hoursValue: number) => {
    if (editingCell) {
      onUpdateShift(editingCell.employeeId, editingCell.day, hoursValue);
      setEditingCell(null);
    }
  };

  const handleCustomHoursSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hrs = parseFloat(customHours);
    if (!isNaN(hrs) && hrs >= 0 && hrs <= 24) {
      saveCellShift(hrs);
    } else if (customHours === "") {
      saveCellShift(0);
    }
  };

  // Calculation parameters according to strict formulas
  const calculateRowSums = (emp: Employee) => {
    const sched = schedules[emp.id];
    const shifts = sched ? sched.shifts : {};

    let DaysCount = 0;
    let HoursSum = 0;
    let NightHoursSum = 0;
    let HolidayHoursSum = 0;

    daysArray.forEach((day) => {
      // Check if this day is within an active range leave
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const hasRangeLeave = specialLeaves?.some(l => 
        l.employeeId === emp.id && 
        l.startDate <= dateStr && 
        dateStr <= l.endDate
      );
      if (hasRangeLeave) {
        return; // skip leave days from worked hours calculations
      }

      const shift = shifts[day];
      if (shift && shift.hours && shift.hours > 0) {
        const hrs = shift.hours;
        DaysCount += 1;
        HoursSum += hrs;

        // Custom Night calculations
        if (hrs === 24) {
          NightHoursSum += 8;
        } else if (hrs === 12) {
          NightHoursSum += 4;
        }

        // Holiday/Weekend calculations
        if (isHolidayOrWeekend(dateStr)) {
          HolidayHoursSum += hrs;
        }
      }
    });

    const overtimeHours = HoursSum > standardHoursNorm ? HoursSum - standardHoursNorm : 0;
    const otherHours = Math.max(0, HoursSum - NightHoursSum - HolidayHoursSum);

    return {
      DaysCount,
      HoursSum,
      overtimeHours,
      NightHoursSum,
      HolidayHoursSum,
      otherHours,
    };
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  // Helper renderer for each sub-table
  const renderTimesheetTable = (title: string, subtitle: string, list: Employee[], offsetNo: number) => {
    return (
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-sm font-extrabold text-[#0D3B66] uppercase tracking-wider flex items-center gap-1.5">
              <ChevronRight size={16} className="text-sky-600 block print:hidden" />
              {title}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase block print:hidden">{subtitle}</p>
          </div>
          <span className="text-[10.5px] bg-[#EEF4F8] text-[#0D3B66] px-3 py-1 rounded-full font-bold border border-sky-100/50 block print:hidden">
            სულ: {list.length} პერსონალი
          </span>
        </div>

        <div className="overflow-auto border border-slate-100 rounded-xl relative bg-white min-w-full print:border-none print:rounded-none" style={{maxHeight: "calc(100dvh - 240px)"}}>
          <table className="w-full text-left border-collapse min-w-[1350px] print:min-w-0">
            <thead>
              {/* Row 1: Merged column topics */}
              <tr className="bg-slate-50 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-150 print:bg-slate-100">
                <th className="py-2.5 px-2 border-r border-slate-200 text-center w-8 sticky left-0 z-30 bg-slate-50">№</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-44 sticky left-8 z-30 bg-slate-50">თანამშრომლის სახელი, გვარი</th>
                <th className="py-2.5 px-2 border-r border-slate-200 text-center w-28">პირადი №</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center w-36">თანამდებობა</th>
                
                {/* Day values header */}
                <th colSpan={monthDaysCount} className="py-2.5 px-1 text-center border-r border-slate-200 bg-sky-50/60 text-sky-900 print:bg-transparent print:text-slate-800">
                  თვის დღეები ({GEORGIAN_MONTHS[month]})
                </th>

                {/* Exact requested summary column categories grouped */}
                <th colSpan={7} className="py-2 px-2 text-center bg-[#F4F6F9] text-slate-800 border-l border-slate-300 print:bg-transparent">
                  თვის განმავლობაში ნამუშევარი დროის ჯამები
                </th>
              </tr>

              {/* Row 2: Sub-headers including days 1-31 and exact labels */}
              <tr className="bg-slate-50/50 border-b border-slate-200 text-[9.5px] font-bold text-slate-500 print:bg-slate-50">
                <th className="py-2 border-r border-slate-200 bg-slate-50 text-center sticky top-0 left-0 z-[31]"></th>
                <th className="py-2 border-r border-slate-200 bg-slate-50 sticky top-0 left-8 z-[31]"></th>
                <th className="py-2 border-r border-slate-200 bg-slate-50 text-center sticky top-0 z-20"></th>
                <th className="py-2 border-r border-slate-200 bg-slate-50 text-center sticky top-0 z-20"></th>

                {/* Days integers */}
                {daysArray.map((day) => {
                  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isWE = isHolidayOrWeekend(dateStr);
                  return (
                    <th
                      key={day}
                      className={`p-1 text-center border-r border-slate-200 font-mono text-xs cursor-default select-none shrink-0 w-8 sticky top-0 z-20 ${
                        isWE ? "bg-red-50 text-red-600 font-extrabold" : "text-slate-600 bg-slate-50"
                      }`}
                      title={isWE ? "შაბათ-კვირა / უქმე დღე" : `დღე ${day}`}
                    >
                      {day}
                    </th>
                  );
                })}

                {/* STRIKT EXACT TEXT LABELS AS REQUESTED BY THE USER */}
                <th
                  className="p-1 px-1.5 text-center border-r border-slate-200 bg-amber-50/80 text-amber-950 text-[9.5px] font-extrabold w-24 whitespace-normal leading-tight select-none sticky top-0 z-20"
                  title="თვის განმავლობაში ნამუშევარ დღეთა ჯამური რაოდენობა"
                >
                  თვის განმავლობაში ნამუშევარ დღეთა ჯამური რაოდენობა
                </th>

                <th
                  className="p-1 px-1.5 text-center border-r border-slate-200 bg-lime-50/80 text-lime-950 text-[9.5px] font-extrabold w-24 whitespace-normal leading-tight select-none sticky top-0 z-20"
                  title="თვის განმავლობაში ნამუშევარი საათების ჯამური რაოდენობა"
                >
                  თვის განმავლობაში ნამუშევარი საათების ჯამური რაოდენობა
                </th>

                <th
                  className="p-1 px-1.5 text-center border-r border-slate-200 bg-purple-50/80 text-purple-950 text-[9.5px] font-extrabold w-24 whitespace-normal leading-tight select-none sticky top-0 z-20"
                  title="თვის განმავლობაში ზეგანაკვეთური ნამუშევარი საათების ჯამური რაოდენობა"
                >
                  თვის განმავლობაში ზეგანაკვეთური ნამუშევარი საათების ჯამური რაოდენობა
                </th>

                <th
                  className="p-1 px-1.5 text-center border-r border-slate-200 bg-indigo-50/80 text-indigo-950 text-[9.5px] font-extrabold w-24 whitespace-normal leading-tight select-none sticky top-0 z-20"
                  title="თვის განმავლობაში ღამით (22:00-დან 6:00-მდე პერიოდი) ნამუშევარი საათების ჯამური რაოდენობა"
                >
                  თვის განმავლობაში ღამით (22:00-დან 6:00-მდე პერიოდი) ნამუშევარი საათების ჯამური რაოდენობა
                </th>

                <th
                  className="p-1 px-1.5 text-center border-r border-slate-200 bg-rose-50/80 text-rose-950 text-[9.5px] font-extrabold w-24 whitespace-normal leading-tight select-none sticky top-0 z-20"
                  title="თვის განმავლობაში დასვენების,უქმე დღეებში ნამუშევარი საათების ჯამური რაოდენობა"
                >
                  თვის განმავლობაში დასვენების,უქმე დღეებში ნამუშევარი საათების ჯამური რაოდენობა
                </th>

                <th
                  className="p-1 px-1.5 text-center border-r border-slate-200 bg-slate-100 text-slate-900 text-[9.5px] font-extrabold w-24 whitespace-normal leading-tight select-none sticky top-0 z-20"
                  title="სხვა (7-9 გრაფებისგან განსხვავებული ნამუშევარი საათების ჯამური რაოდენობა)"
                >
                  სხვა (7-9 გრაფებისგან განსხვავებული ნამუშევარი საათების ჯამური რაოდენობა)
                </th>

                <th
                  className="p-1 px-2 text-center bg-[#F1F3F5] text-slate-800 text-[9.5px] font-extrabold w-18 whitespace-normal select-none sticky top-0 z-20"
                >
                  ხელისმოწერა
                </th>
              </tr>
            </thead>

            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={monthDaysCount + 11} className="py-10 text-center text-slate-400 text-xs font-bold bg-slate-50/30">
                    მოცემულ კატეგორიაში მონაცემები ცარიელია ან არ შეესაბამება საძიებო სიტყვას
                  </td>
                </tr>
              ) : (
                list.map((emp, idx) => {
                  const sums = calculateRowSums(emp);
                  const hasSpecialStatus = !!emp.specialStatus;
                  
                  // Support exact clinician title mapping
                  const displayPosition = emp.position === "უფროსი ექიმი" ? "განყოფილების უფროსი ექიმი" : emp.position;

                  return (
                    <tr
                      key={emp.id}
                      draggable={isAdmin}
                      onDragStart={(e) => handleDragStart(e, emp.id)}
                      onDragOver={(e) => handleDragOver(e, emp.id)}
                      onDrop={(e) => handleDrop(e, emp.id, list)}
                      onDragEnd={handleDragEnd}
                      className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors group print:hover:bg-transparent ${
                        dragOverId === emp.id && draggedId !== emp.id ? "border-t-2 border-t-sky-400 bg-sky-50/30" : ""
                      } ${draggedId === emp.id ? "opacity-50" : ""}`}
                    >
                      {/* Index / drag handle */}
                      <td className="py-2 px-1 text-center border-r border-slate-200 text-[11px] font-mono font-bold text-slate-400 bg-white sticky left-0 z-10 select-none">
                        {isAdmin ? (
                          <>
                            <span className="group-hover:hidden">{idx + 1}</span>
                            <GripVertical size={13} className="hidden group-hover:block mx-auto text-slate-350 cursor-grab active:cursor-grabbing" />
                          </>
                        ) : (
                          idx + 1
                        )}
                      </td>

                      {/* Name */}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-xs font-extrabold text-[#0D3B66] bg-white sticky left-8 z-10">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{emp.name}</span>
                          {isAdmin && (
                            <button
                              onClick={() => { setSelectedStatus(emp.specialStatus ?? "__none__"); setEditingSpecialStatusId(emp.id); }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-150 rounded text-sky-600 transition-all cursor-pointer block print:hidden"
                              title="სტატუსის შეცვლა"
                            >
                              <Edit3 size={12} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Personal ID */}
                      <td className="py-2 px-1 text-center border-r border-slate-200 text-xs font-mono text-slate-600 font-semibold select-all bg-slate-50/50">
                        {emp.personalId}
                      </td>

                      {/* Position */}
                      <td className="py-2 px-3 border-r border-slate-200 text-[10.5px] text-slate-600 text-center font-bold bg-slate-50/10">
                        {displayPosition}
                      </td>

                      {/* Day Shifts */}
                      {hasSpecialStatus ? (
                        <td
                          colSpan={monthDaysCount}
                          onClick={() => { if (isAdmin || (loggedInEmployee && loggedInEmployee.id === emp.id)) { setSelectedStatus(emp.specialStatus ?? "__none__"); setEditingSpecialStatusId(emp.id); } }}
                          className={`p-1 border-r border-slate-200 text-center bg-amber-50 hover:bg-amber-105 text-amber-850 font-black italic text-[11px] tracking-widest transition-all print:bg-transparent print:border-r ${
                            (isAdmin || (loggedInEmployee && loggedInEmployee.id === emp.id)) ? "cursor-pointer" : "cursor-default"
                          }`}
                          title={(isAdmin || (loggedInEmployee && loggedInEmployee.id === emp.id)) ? "დააწკაპუნეთ სტატუსის შესაცვლელად/გასაუქმებლად" : undefined}
                        >
                          — {emp.specialStatus?.toUpperCase()} —
                        </td>
                      ) : (
                        daysArray.map((day) => {
                          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                          
                          // Look for active range-based leaves
                          const activeRangeLeave = specialLeaves?.find(l => 
                            l.employeeId === emp.id && 
                            l.startDate <= dateStr && 
                            dateStr <= l.endDate
                          );
                          const canEditCell = isAdmin || (loggedInEmployee && loggedInEmployee.id === emp.id);

                          if (activeRangeLeave) {
                            const abbr = STATUS_ABBREVIATIONS[activeRangeLeave.type] || "შვბ";
                            return (
                                <td
                                  key={day}
                                  onClick={() => canEditCell && openCellEditor(emp.id, day, 0)}
                                  className={`p-0 border-r border-slate-150 text-center bg-amber-55 text-amber-950 font-extrabold text-[10.5px] border border-amber-250 select-none ${
                                    canEditCell ? "cursor-pointer hover:bg-amber-100" : "cursor-default"
                                  }`}
                                  title={`${emp.name}: ${activeRangeLeave.type} (${activeRangeLeave.startDate}-დან ${activeRangeLeave.endDate}-მდე) / ${canEditCell ? 'დააწკაპუნეთ სამართავად' : 'მხოლოდ კითხვადი'}`}
                                >
                                  <span className="block py-2.5 px-1 min-h-[35px] flex items-center justify-center">
                                    {abbr}
                                  </span>
                                </td>
                            );
                          }

                          const cellSched = schedules[emp.id];
                          const dayShift = cellSched ? cellSched.shifts[day] : null;
                          const hrValue = dayShift ? dayShift.hours : 0;

                          const isWE = isHolidayOrWeekend(dateStr);

                          return (
                            <td
                              key={day}
                              onClick={() => canEditCell && openCellEditor(emp.id, day, hrValue || undefined)}
                              className={`p-0 border-r border-slate-150 text-center transition-all ${
                                canEditCell ? "cursor-pointer hover:bg-sky-50" : "cursor-default"
                              } font-mono text-xs relative select-none ${
                                hrValue && hrValue > 0
                                  ? "font-extrabold text-slate-900 bg-sky-50/40"
                                  : ""
                              } ${isWE ? "bg-red-50/15 print:bg-transparent" : ""}`}
                            >
                              <span className="block py-2.5 px-1 min-h-[35px] flex items-center justify-center">
                                {hrValue && hrValue > 0 ? hrValue : ""}
                              </span>
                            </td>
                          );
                        })
                      )}

                      {/* SUM RESULTS WITH PRECISE LABELS FOR CELLS */}
                      <td className="py-1 px-1 text-center border-r border-slate-200 text-xs font-mono font-black text-slate-800 bg-amber-50/15 font-sans">
                        {sums.DaysCount}
                      </td>
                      <td className="py-1 px-1 text-center border-r border-slate-200 text-xs font-mono font-black text-slate-900 bg-lime-50/20">
                        {sums.HoursSum}
                      </td>
                      <td className={`py-1 px-1 text-center border-r border-slate-200 text-xs font-mono font-black bg-purple-50/15 ${sums.overtimeHours > 0 ? "text-purple-700" : "text-slate-400"}`}>
                        {sums.overtimeHours}
                      </td>
                      <td className="py-1 px-1 text-center border-r border-slate-200 text-xs font-mono font-black text-indigo-900 bg-indigo-50/15">
                        {sums.NightHoursSum}
                      </td>
                      <td className="py-1 px-1 text-center border-r border-slate-200 text-xs font-mono font-black text-rose-800 bg-rose-50/15">
                        {sums.HolidayHoursSum}
                      </td>
                      <td className="py-1 px-1 text-center border-r border-slate-200 text-xs font-mono font-black text-slate-800 bg-slate-50">
                        {sums.otherHours}
                      </td>
                      
                      {/* Signature blank column */}
                      <td className="py-1 px-1 text-center bg-slate-50/20 border-r border-slate-200 text-[10px] text-slate-400 font-mono select-none">
                        <span className="block border-b border-dashed border-slate-350 w-12 mx-auto pt-2 print:border-b"></span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Count if current month is "empty"
  let totalHoursScheduled = 0;
  employees.forEach((emp) => {
    const s = schedules[emp.id]?.shifts || {};
    Object.values(s).forEach((shift: any) => {
      totalHoursScheduled += shift?.hours || 0;
    });
  });
  const isMonthEmpty = totalHoursScheduled === 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 print:p-0 print:border-none print:shadow-none print:rounded-none space-y-6 flex flex-col print-full-width">
      
      {/* CUSTOM MEDIA INJECTED PRINT ENGINE FOR PERFECT LANDSCAPE EXPORT */}
      <style>{`
        @media print {
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: "Inter", sans-serif !important;
            margin: 0 !important;
            padding: 10px !important;
            width: 100% !important;
          }
          header, footer, aside, nav, .no-print, button, .footnote-info {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          table {
            page-break-inside: avoid;
            font-size: 8px !important;
            width: 100% !important;
            min-width: 0 !important;
          }
          th, td {
            padding: 3px !important;
            font-size: 8px !important;
            border: 1px solid #000000 !important;
          }
          .page-break {
            page-break-before: always;
            margin-top: 30px;
          }
          h3 {
            font-size: 11px !important;
            color: #000000 !important;
            margin-bottom: 5px !important;
          }
        }
      `}</style>

      {/* SEARCH AND ACTION TOOLBAR */}
      <div className="flex flex-col gap-2.5 pb-3 sm:pb-5 border-b border-slate-100 no-print">
        <div className="flex items-center gap-2">
          {/* Real-time Employee searching tool */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="მოძებნეთ სახელით ან პირადი ნომრით..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
            />
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 p-0.5 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Action buttons – icons+text on sm+, icons only on mobile */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isAdmin && onSyncRhythmFromPreviousMonth && (
              <button
                onClick={onSyncRhythmFromPreviousMonth}
                className="p-2 sm:py-2 sm:px-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                title="წინა თვის მორიგეობებიდან გამომდინარე დარიტმვა"
              >
                <RefreshCw size={15} className="shrink-0" />
                <span className="hidden sm:inline">წინა თვიდან</span>
              </button>
            )}

            <button
              onClick={handleBrowserPrint}
              className="p-2 sm:py-2 sm:px-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              title="PDF ექსპორტი / ბეჭდვა"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              onClick={onDownloadExcel}
              className="p-2 sm:py-2 sm:px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              title="Excel ჩამოტვირთვა"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* EMPTY MONTH SYNC BANNER */}
      {isMonthEmpty && isAdmin && onSyncRhythmFromPreviousMonth && (
        <div className="bg-amber-50/75 border border-amber-200/70 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in no-print text-slate-800">
          <div className="space-y-1">
            <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-600 animate-pulse shrink-0" />
              ცარიელი საანგარიშო თვე!
            </h4>
            <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
              მიმდინარე თვისთვის მორიგეობის საათები ჯერ არ არის შეყვანილი. გსურთ წინა თვის როტაციის სქემების ავტომატური გაგრძელება (მაგ. 4 დღეში ერთხელ სისტემები, სამუშაო დღეები და ა.შ.)?
            </p>
          </div>
          <button
            onClick={onSyncRhythmFromPreviousMonth}
            className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 hover:scale-[1.01] active:scale-[0.99]"
          >
            <RefreshCw size={14} className="shrink-0" />
            წინა თვიდან დარითმვა და ავტომატური გაანგარიშება
          </button>
        </div>
      )}

      {/* SECTION 1: DOCTORS TIMESHEET GRID */}
      {showDoctors && (
        <div className="space-y-2">
          {renderTimesheetTable(
            "1. ექიმთა შემადგენლობა (ტაბელი)", 
            "თანმიმდევრობა: განყოფილების უფროსი ექიმი, ექიმები, უმცროსი ექიმები", 
            doctorsList, 
            0
          )}
        </div>
      )}

      {/* Spacer or break */}
      {showDoctors && showNurses && (
        <div className="page-break border-t border-slate-100 pt-3 print:pt-0 print:border-none"></div>
      )}

      {/* SECTION 2: NURSES & SUPPORT TIMESHEET GRID */}
      {showNurses && (
        <div className="space-y-2">
          {renderTimesheetTable(
            "2. ექთნები და დამხმარე სამედიცინო შემადგენლობა (ტაბელი)", 
            "თანმიმდევრობა: უფროსი ექთანი, სუპერვაიზერი (ვაიზერი), ექთნები, ექთნის დამხმარეები, სანიტარები", 
            nursesList, 
            doctorsList.length
          )}
        </div>
      )}

      {/* FOOTNOTE INDICATOR SYSTEM */}
      <div className="flex flex-wrap items-center mt-3 gap-5 text-xs text-slate-400 font-semibold px-1 footnote-info select-none">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 bg-red-100 border border-red-200 rounded"></div>
          <span>შაბათ-კვირა / უქმე დღე</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 bg-amber-50 border border-amber-200 rounded"></div>
          <span>სპეციალური სტატუსი (დეკრეტი/შვებულება)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 bg-sky-50 border border-sky-100 rounded"></div>
          <span>აქტიური მორიგეობა (საათები ჩაწერილია)</span>
        </div>
        <span className="ml-auto text-slate-400 italic">დააწკაპუნეთ ნებისმიერ უჯრაზე საათების მოსამატებლად / შესაცვლელად</span>
      </div>

      {/* DAY CELL SHIFT MODAL EDITOR */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 no-print">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl border border-slate-100 w-full sm:max-w-sm max-h-[92dvh] overflow-y-auto animate-fade-in text-slate-800">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">მორიგეობის რედაქტორი</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  თანამშრომელი: <strong className="text-slate-700 font-bold">{employees.find((e) => e.id === editingCell.employeeId)?.name}</strong>
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  რიცხვი: <strong className="text-slate-700">{editingCell.day} {GEORGIAN_MONTHS[month]}, {year} წელი</strong>
                </p>
              </div>
              <button
                onClick={() => setEditingCell(null)}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick selectors */}
            <div className="p-5 space-y-4">
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase mb-2">სწრაფი არჩევანი (საათები)</span>
                <div className="grid grid-cols-4 gap-2">
                  {[24, 12, 8, 16].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => saveCellShift(hrs)}
                      className="py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold rounded-lg transition-all cursor-pointer border border-sky-100"
                    >
                      {hrs}სთ
                    </button>
                  ))}
                </div>
              </div>

              {/* Form custom hours or remove */}
              <form onSubmit={handleCustomHoursSubmit} className="space-y-4 pt-3 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">სხვა საათი (0-24)</label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={customHours}
                      onChange={(e) => setCustomHours(e.target.value)}
                      placeholder="მაგ: 16"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => saveCellShift(0)}
                      className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold border border-red-200 rounded-lg transition-all cursor-pointer"
                    >
                      მორიგეობის წაშლა
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCell(null)}
                    className="px-4 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-150 rounded-lg transition-all cursor-pointer"
                  >
                    დახურვა
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-705 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                  >
                    შენახვა
                  </button>
                </div>
              </form>

              {/* ── RHYTHM SECTION ── */}
              {onApplyRhythmFromDay && isAdmin && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase">დარითმვა ამ დღიდან</span>

                  {/* Hours selector for rhythm */}
                  <div className="flex gap-1.5">
                    {[24, 12, 8, 16].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setRhythmHours(h)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          rhythmHours === h
                            ? "bg-sky-600 text-white border-sky-600"
                            : "bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100"
                        }`}
                      >
                        {h}სთ
                      </button>
                    ))}
                  </div>

                  {/* Pattern buttons */}
                  <div className="space-y-1.5">
                    {([
                      { label: "ყოველ 4 დღეში ერთხელ", pattern: "every_fourth" as const },
                      { label: "ყოველ 2 დღეში ერთხელ", pattern: "every_second" as const },
                      { label: "ყოველ სამუშაო დღე (შაბ/კვი გარდა)", pattern: "weekdays" as const },
                    ] as const).map(({ label, pattern }) => (
                      <button
                        key={pattern}
                        type="button"
                        onClick={() => {
                          if (editingCell) {
                            onApplyRhythmFromDay(editingCell.employeeId, editingCell.day, rhythmHours, pattern);
                            setEditingCell(null);
                          }
                        }}
                        className="w-full text-left py-2 px-3 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold rounded-xl border border-violet-100 transition-all cursor-pointer flex items-center gap-2"
                      >
                        <RefreshCw size={12} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SPECIAL STATUS ASSIGN POPUP */}
      {editingSpecialStatusId && (() => {
        const empLeaves = specialLeaves.filter(l => l.employeeId === editingSpecialStatusId);
        const empName = employees.find((e) => e.id === editingSpecialStatusId)?.name ?? "";

        const handleAddLeave = () => {
          if (!leaveFormStart || !leaveFormEnd) return;
          if (leaveFormStart > leaveFormEnd) return;
          onAddSpecialLeave?.({
            employeeId: editingSpecialStatusId,
            type: leaveFormType,
            startDate: leaveFormStart,
            endDate: leaveFormEnd,
          });
          setLeaveFormStart("");
          setLeaveFormEnd("");
        };

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 no-print">
            <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl border border-slate-100 w-full sm:max-w-md max-h-[92dvh] overflow-y-auto animate-fade-in text-slate-800">
              {/* Header */}
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">თანამშრომლის სტატუსის მართვა</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    თანამშრომელი:{" "}
                    <strong className="text-slate-700 font-bold">{empName}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setEditingSpecialStatusId(null)}
                  className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer text-slate-400"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* ── SECTION 1: Month-wide special status ── */}
                <div className="space-y-2">
                  <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">სტატუსი მთელი თვისთვის</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    სტატუსის მინიჭებისას ყველა მორიგეობა ავტომატურად გაუქმდება და ტაბელი გაერთიანდება.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-300 cursor-pointer"
                    >
                      <option value="__none__">✕ სტატუსის მოხსნა (აქტიური რეჟიმი)</option>
                      {["დეკრეტული შვებულება", "შვებულება", "ავადმყოფობა", "ბიულეტენი", "ადმინისტრაციული", "გაცდენა"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const val = selectedStatus === "__none__" ? null : selectedStatus as SpecialStatusType;
                        onUpdateEmployeeSpecialStatus(editingSpecialStatusId, val);
                        setEditingSpecialStatusId(null);
                      }}
                      className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                    >
                      გამოყენება
                    </button>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* ── SECTION 2: Date-range leave management ── */}
                {onAddSpecialLeave && (
                  <div className="space-y-3">
                    <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                      <CalendarRange size={12} />
                      შვებულება / ბიულეტენი განსაზღვრული თარიღებით
                    </p>

                    {/* Existing leaves list */}
                    {empLeaves.length > 0 && (
                      <div className="space-y-1.5">
                        {empLeaves.map((leave) => (
                          <div
                            key={leave.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs"
                          >
                            <span className="font-bold text-amber-800 shrink-0">{leave.type}</span>
                            <span className="text-slate-500 font-mono text-[10px]">
                              {leave.startDate} — {leave.endDate}
                            </span>
                            <button
                              onClick={() => onDeleteSpecialLeave?.(leave.id)}
                              className="p-1 hover:bg-red-100 rounded-lg text-red-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                              title="წაშლა"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new leave form */}
                    <div className="border border-slate-100 rounded-xl p-3 bg-slate-50 space-y-2">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase">ახალი პერიოდის დამატება</p>
                      <select
                        value={leaveFormType}
                        onChange={(e) => setLeaveFormType(e.target.value as SpecialStatusType)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-300 cursor-pointer"
                      >
                        {["შვებულება", "დეკრეტული შვებულება", "ბიულეტენი", "ავადმყოფობა", "ადმინისტრაციული", "გაცდენა"].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-400 font-semibold block mb-1">დაწყება</label>
                          <input
                            type="date"
                            value={leaveFormStart}
                            onChange={(e) => setLeaveFormStart(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-400 font-semibold block mb-1">დასრულება</label>
                          <input
                            type="date"
                            value={leaveFormEnd}
                            onChange={(e) => setLeaveFormEnd(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleAddLeave}
                        disabled={!leaveFormStart || !leaveFormEnd || leaveFormStart > leaveFormEnd}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer"
                      >
                        <Plus size={13} />
                        პერიოდის დამატება
                      </button>
                    </div>
                  </div>
                )}

                <hr className="border-slate-100" />

                {/* ── SECTION 3: Destructive actions ── */}
                {isAdmin && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">სხვა მოქმედებები</p>

                    {onClearEmployeeShifts && (
                      <button
                        onClick={() => {
                          onClearEmployeeShifts(editingSpecialStatusId);
                          setEditingSpecialStatusId(null);
                        }}
                        className="w-full text-left py-2 px-3 hover:bg-orange-50 rounded-xl border border-orange-100/60 text-xs font-bold text-orange-700 flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <Trash2 size={14} />
                        ამ თვის მორიგეობების გასუფთავება
                      </button>
                    )}

                    {onRemoveEmployeeFromMonth && (
                      <button
                        onClick={() => {
                          onRemoveEmployeeFromMonth(editingSpecialStatusId);
                          setEditingSpecialStatusId(null);
                        }}
                        className="w-full text-left py-2 px-3 hover:bg-red-50 rounded-xl border border-red-100/60 text-xs font-bold text-red-700 flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <UserX size={14} />
                        თანამშრომლის წაშლა ამ თვეში
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
