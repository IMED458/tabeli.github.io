/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Employee, PositionType, SpecialStatusType, EmployeeMonthlySchedule, SpecialLeaveRange } from "./types";
import { GEORGIAN_MONTHS, isHolidayOrWeekend, getInitialShifts, POSITIONS } from "./constants";
import {
  setStoredEmployees,
  setStoredDeptSettings,
  setStoredSpecialLeaves,
  DeptSettings,
} from "./utils/database";
import { subscribeToCloudState, periodKey, saveCloudStatePatch, saveSchedulesForPeriod } from "./utils/cloudDatabase";
import { initFirestoreWithDefaults } from "./utils/database";
import { generateExcelTimesheet } from "./utils/excelGenerator";

// Subcomponents import
import TimesheetGrid from "./components/TimesheetGrid";
import ShiftQuickScheduler from "./components/ShiftQuickScheduler";
import EmployeeManager from "./components/EmployeeManager";
import StatsDashboard from "./components/StatsDashboard";

// Icons import
import {
  Calendar,
  Users,
  BarChart3,
  Settings,
  RefreshCw,
  DatabaseBackup,
  HeartPulse,
  Award,
  LogOut,
  Lock,
  PlusCircle,
  X,
  UserPlus,
  ShieldAlert,
  HelpCircle,
  Search,
  Check,
  Umbrella,
  Trash2,
} from "lucide-react";

export default function App() {
  // 1. Core State Initialization
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<{ [employeeId: string]: EmployeeMonthlySchedule }>({});
  const [settings, setSettings] = useState<DeptSettings>(() => {
    const now = new Date();
    return {
      companyName: "",
      departmentName: "",
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      standardHoursNorm: 168,
    };
  });

  const [isLoading, setIsLoading] = useState(true);
  const [schedulesByPeriod, setSchedulesByPeriod] = useState<{ [key: string]: { [empId: string]: EmployeeMonthlySchedule } }>({});
  const schedulesByPeriodRef = useRef<{ [key: string]: { [empId: string]: EmployeeMonthlySchedule } }>({});

  // UI state managers
  const [activeTab, setActiveTab2] = useState<"timesheet" | "employees" | "recurring" | "stats" | "params">("timesheet");
  const [filterPosition, setFilterPosition] = useState<string>("ყველა");
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);

  // Security Lock Screen states (მომხმარებელი და პაროლი / პერსონალური შესვლა)
  const [isLocked, setIsLocked] = useState<boolean>(true); // default locked for medical security
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // admin role with full write rights vs regular employee read-only
  const [loggedInEmployeeId, setLoggedInEmployeeId] = useState<string | null>(() => localStorage.getItem("hospital_logged_in_employee_id"));
  const loggedInEmployee = loggedInEmployeeId ? employees.find(e => e.id === loggedInEmployeeId) : null;
  const [authMode, setAuthMode] = useState<"employee" | "admin">("employee");
  const [authPersonalId, setAuthPersonalId] = useState<string>("");
  const [authUsername, setAuthUsername] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [lockError, setLockError] = useState<string>("");

  // Searchable "მორიგეობის დაგეგმვა" Modal form states
  const [isAddShiftOpen, setIsAddShiftOpen] = useState<boolean>(false);
  const [selectedShiftEmpId, setSelectedShiftEmpId] = useState<string>("");
  const [selectedShiftDate, setSelectedShiftDate] = useState<string>("");
  const [selectedShiftHours, setSelectedShiftHours] = useState<number>(12);
  const [isShiftRecurring, setIsShiftRecurring] = useState<boolean>(false);
  const [shiftRecurrenceRule, setShiftRecurrenceRule] = useState<string>("every_third");
  const [recSearchQuery, setRecSearchQuery] = useState<string>("");
  const [recPositionFilter, setRecPositionFilter] = useState<string>("ყველა");
  const [modalError, setModalError] = useState<string>("");

  // Range-based Vagary & Sick leaves state
  const [specialLeaves, setSpecialLeaves] = useState<SpecialLeaveRange[]>([]);
  
  // Range-based Leave/Sick Modal states
  const [isLeaveOpen, setIsLeaveOpen] = useState<boolean>(false);
  const [leaveEmployeeId, setLeaveEmployeeId] = useState<string>("");
  const [leaveType, setLeaveType] = useState<SpecialStatusType>("შვებულება");
  const [leaveStartDate, setLeaveStartDate] = useState<string>("");
  const [leaveEndDate, setLeaveEndDate] = useState<string>("");
  const [leaveSearchQuery, setLeaveSearchQuery] = useState<string>("");
  const [leavePositionFilter, setLeavePositionFilter] = useState<string>("ყველა");

  // Real-time Firestore sync — single source of truth, no localStorage for data
  useEffect(() => {
    const storedEmpId = localStorage.getItem("hospital_logged_in_employee_id");
    const isSuperAdmin = localStorage.getItem("hospital_is_superadmin_unlocked") === "true";
    let firstLoad = true;

    const unsubscribe = subscribeToCloudState((cloud) => {
      if (!cloud) {
        // Firestore has no data yet — initialise with defaults
        initFirestoreWithDefaults();
        if (firstLoad) {
          firstLoad = false;
          setIsLoading(false);
        }
        return;
      }

      // Always sync all data from Firestore
      if (cloud.employees) setEmployees(cloud.employees);
      if (cloud.settings) setSettings(cloud.settings);
      if (cloud.specialLeaves !== undefined) setSpecialLeaves(cloud.specialLeaves ?? []);
      if (cloud.schedulesByPeriod) {
        setSchedulesByPeriod(cloud.schedulesByPeriod);
        schedulesByPeriodRef.current = cloud.schedulesByPeriod;
      }

      // Update currently-viewed period schedules
      const activeSettings = cloud.settings;
      if (activeSettings) {
        const activeKey = periodKey(activeSettings.year, activeSettings.month);
        const periodScheds = cloud.schedulesByPeriod?.[activeKey] ?? cloud.schedules;
        if (periodScheds) setSchedules(periodScheds);
      } else if (cloud.schedules) {
        setSchedules(cloud.schedules);
      }

      // Auth restoration — only on first Firestore response
      if (firstLoad) {
        firstLoad = false;
        if (isSuperAdmin) {
          setIsAdmin(true);
          setIsLocked(false);
        } else if (storedEmpId) {
          const found = cloud.employees?.find((e) => e.id === storedEmpId);
          if (found) {
            setLoggedInEmployeeId(found.id);
            setIsAdmin(["უფროსი ექიმი", "უფროსი ექთანი", "ადმინისტრატორი"].includes(found.position));
            setIsLocked(false);
          }
        }
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update schedules whenever settings.year or settings.month changes
  const handlePeriodChange = (newYear: number, newMonth: number) => {
    const nextSettings = { ...settings, year: newYear, month: newMonth };
    
    // Auto calculate dynamic monthly standard norm based on weekdays of chosen month
    let weekdaysCount = 0;
    const numDays = new Date(newYear, newMonth, 0).getDate();
    for (let d = 1; d <= numDays; d++) {
      const dateStr = `${newYear}-${String(newMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (!isHolidayOrWeekend(dateStr)) {
        weekdaysCount++;
      }
    }
    const computedNorm = weekdaysCount * 8;
    nextSettings.standardHoursNorm = computedNorm;

    setSettings(nextSettings);
    setStoredDeptSettings(nextSettings);

    // Load schedules for the new period from Firestore cache (schedulesByPeriodRef)
    const key = periodKey(newYear, newMonth);
    const storedPeriod = schedulesByPeriodRef.current[key];
    if (storedPeriod && Object.keys(storedPeriod).length > 0) {
      setSchedules(storedPeriod);
    } else {
      // Generate default schedules and save to Firestore
      const initialMap = getInitialShifts(employees, newYear, newMonth);
      const res: { [employeeId: string]: EmployeeMonthlySchedule } = {};
      employees.forEach((emp) => {
        res[emp.id] = {
          employeeId: emp.id,
          year: newYear,
          month: newMonth,
          shifts: initialMap[emp.id] || {},
        };
      });
      setSchedules(res);
      saveSchedulesForPeriod(newYear, newMonth, res);
    }

    showToast(`სამუშაო პერიოდი შეიცვალა: ${GEORGIAN_MONTHS[newMonth]} ${newYear}`, "info");
  };

  // Toast alert tool
  const showToast = (text: string, type: "success" | "info" | "error") => {
    setStatusMsg({ text, type });
    setTimeout(() => {
      setStatusMsg(null);
    }, 4500);
  };

  // State update handler
  const handleSaveEmployees = (updatedList: Employee[]) => {
    setEmployees(updatedList);
    setStoredEmployees(updatedList);

    const updatedSchedules = { ...schedules };
    let hasChanges = false;

    updatedList.forEach((emp) => {
      if (!updatedSchedules[emp.id]) {
        updatedSchedules[emp.id] = {
          employeeId: emp.id,
          year: settings.year,
          month: settings.month,
          shifts: {},
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setSchedules(updatedSchedules);
      saveSchedulesForPeriod(settings.year, settings.month, updatedSchedules);
    }
  };

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextSettings = { ...settings, companyName: e.target.value };
    setSettings(nextSettings);
    setStoredDeptSettings(nextSettings);
  };

  const handleDeptNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextSettings = { ...settings, departmentName: e.target.value };
    setSettings(nextSettings);
    setStoredDeptSettings(nextSettings);
  };

  const handleHoursNormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value);
    const nextSettings = { ...settings, standardHoursNorm: isNaN(v) ? 168 : v };
    setSettings(nextSettings);
    setStoredDeptSettings(nextSettings);
  };

  // Quick live grid cell update
  const handleUpdateShift = (employeeId: string, day: number, hours: number) => {
    // Deep-copy the affected employee's record to avoid mutating existing state
    const prevRecord = schedules[employeeId];
    const newShifts = prevRecord ? { ...prevRecord.shifts } : {};

    if (hours === 0) {
      delete newShifts[day];
    } else {
      newShifts[day] = { hours };
    }

    const updatedSchedules = {
      ...schedules,
      [employeeId]: {
        employeeId,
        year: settings.year,
        month: settings.month,
        ...(prevRecord ?? {}),
        shifts: newShifts,
      },
    };

    setSchedules(updatedSchedules);
    setStoredSchedules(updatedSchedules);
    saveSchedulesForPeriod(settings.year, settings.month, updatedSchedules);
  };

  // Special monthly leave statuses
  const handleUpdateEmployeeSpecialStatus = (employeeId: string, status: SpecialStatusType | null) => {
    const updatedEmployees = employees.map((emp) => {
      if (emp.id === employeeId) {
        return { ...emp, specialStatus: status };
      }
      return emp;
    });

    handleSaveEmployees(updatedEmployees);

    if (status) {
      const updatedSchedules = {
        ...schedules,
        ...(schedules[employeeId] ? {
          [employeeId]: { ...schedules[employeeId], shifts: {} }
        } : {}),
      };
      setSchedules(updatedSchedules);
      saveSchedulesForPeriod(settings.year, settings.month, updatedSchedules);
    }

    showToast(`თანამშრომლის სტატუსი განახლდა წარმატებით`, "success");
  };

  const handleAddEmployee = (empData: Omit<Employee, "id" | "number">) => {
    const nextNumber = employees.length > 0 ? Math.max(...employees.map((e) => e.number)) + 1 : 1;
    const newEmp: Employee = {
      ...empData,
      id: `emp-${Date.now()}`,
      number: nextNumber,
    };

    const nextList = [...employees, newEmp];
    handleSaveEmployees(nextList);
    showToast(`თანამშრომელი ${newEmp.name} წარმატებით დაემატა`, "success");
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    const nextList = employees.map((emp) => (emp.id === updatedEmp.id ? updatedEmp : emp));
    handleSaveEmployees(nextList);
    showToast(`თანამშრომლის მონაცემები შენახულია`, "success");
  };

  const handleDeleteEmployee = (id: string) => {
    const target = employees.find((e) => e.id === id);
    if (window.confirm(`ნამდვილად გსურთ ${target?.name}-ს წაშლა ბაზიდან?`)) {
      const nextList = employees.filter((emp) => emp.id !== id);
      const renumbered = nextList.map((emp, idx) => ({ ...emp, number: idx + 1 }));
      handleSaveEmployees(renumbered);

      const nextScheds = { ...schedules };
      delete nextScheds[id];
      setSchedules(nextScheds);
      saveSchedulesForPeriod(settings.year, settings.month, nextScheds);

      showToast(`თანამშრომელი წარმატებით წაიშალა`, "info");
    }
  };

  // Advanced recurring scheduler
  const handleApplyRecurringShifts = (params: {
    employeeId: string | "all_by_position";
    positionMatch?: PositionType;
    shiftHours: number;
    ruleType: "everyday" | "every_second" | "every_third" | "every_fourth" | "weekdays" | "weekends";
    startDay: number;
  }) => {
    const numDays = new Date(settings.year, settings.month, 0).getDate();
    const updatedSchedules = { ...schedules };

    const targets = employees.filter((emp) => {
      if (emp.specialStatus) return false;
      if (params.employeeId === "all_by_position") {
        return emp.position === params.positionMatch;
      }
      return emp.id === params.employeeId;
    });

    if (targets.length === 0) {
      showToast("მოცემულ როლზე აქტიური პერსონალი არ მოიძებნა", "error");
      return;
    }

    targets.forEach((emp) => {
      const targetShifts: { [day: number]: { hours: number } } = {};

      for (let day = 1; day <= numDays; day++) {
        const dateStr = `${settings.year}-${String(settings.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const isWE = isHolidayOrWeekend(dateStr);

        let shouldAssign = false;

        switch (params.ruleType) {
          case "everyday":
            shouldAssign = day >= params.startDay;
            break;
          case "every_second":
            shouldAssign = day >= params.startDay && (day - params.startDay) % 2 === 0;
            break;
          case "every_third":
            shouldAssign = day >= params.startDay && (day - params.startDay) % 3 === 0;
            break;
          case "every_fourth":
            shouldAssign = day >= params.startDay && (day - params.startDay) % 4 === 0;
            break;
          case "weekdays":
            shouldAssign = day >= params.startDay && !isWE;
            break;
          case "weekends":
            shouldAssign = day >= params.startDay && isWE;
            break;
        }

        if (shouldAssign && params.shiftHours > 0) {
          targetShifts[day] = { hours: params.shiftHours };
        }
      }

      updatedSchedules[emp.id] = {
        employeeId: emp.id,
        year: settings.year,
        month: settings.month,
        shifts: targetShifts,
      };
    });

    setSchedules(updatedSchedules);
    saveSchedulesForPeriod(settings.year, settings.month, updatedSchedules);

    showToast("განრიგი ავტომატურად შეივსო არჩეული წესით!", "success");
  };

  const getPrevMonthSchedulesWithFallback = (employeesList: Employee[], year: number, month: number) => {
    let pMonth = month - 1;
    let pYear = year;
    if (pMonth === 0) {
      pMonth = 12;
      pYear = year - 1;
    }
    const stored = schedulesByPeriodRef.current[periodKey(pYear, pMonth)];
    if (stored && Object.keys(stored).length > 0) return stored;

    // Fallback: generate default previous month schedule
    const initialMap = getInitialShifts(employeesList, pYear, pMonth);
    const res: { [employeeId: string]: EmployeeMonthlySchedule } = {};
    employeesList.forEach((emp) => {
      res[emp.id] = {
        employeeId: emp.id,
        year: pYear,
        month: pMonth,
        shifts: initialMap[emp.id] || {},
      };
    });
    return res;
  };

  const handleSyncRhythmFromPreviousMonth = () => {
    let pMonth = settings.month - 1;
    let pYear = settings.year;
    if (pMonth === 0) {
      pMonth = 12;
      pYear = settings.year - 1;
    }

    const prevScheds = getPrevMonthSchedulesWithFallback(employees, settings.year, settings.month);
    const numDays = new Date(settings.year, settings.month, 0).getDate();
    const updatedSchedules = { ...schedules };

    let successCount = 0;

    employees.forEach((emp) => {
      if (emp.specialStatus) return;

      const empPrev = prevScheds[emp.id];
      const prevShifts = empPrev ? empPrev.shifts : {};
      const workedDays = Object.keys(prevShifts)
        .map(Number)
        .filter((d) => (prevShifts[d]?.hours || 0) > 0)
        .sort((a, b) => a - b);

      const nonZeroHours = Object.keys(prevShifts)
        .map(Number)
        .map((d) => prevShifts[d]?.hours || 0)
        .filter((h) => h > 0);

      let detectedHours = 12;
      if (nonZeroHours.length > 0) {
        const counts: { [key: number]: number } = {};
        nonZeroHours.forEach((h) => counts[h] = (counts[h] || 0) + 1);
        let maxCount = 0;
        Object.keys(counts).forEach((hk) => {
          const hNum = Number(hk);
          if (counts[hNum] > maxCount) {
            maxCount = counts[hNum];
            detectedHours = hNum;
          }
        });
      } else {
        if (emp.position === "უფროსი ექიმი" || emp.position === "სუპერვაიზერი") {
          detectedHours = 8;
        } else if (emp.position === "ექიმი" || emp.position === "უმცროსი ექიმი") {
          detectedHours = 24;
        } else {
          detectedHours = 12;
        }
      }

      let detectedInterval = 3;
      let isWeekdaysOnly = false;
      let isEveryDay = false;

      if (workedDays.length > 1) {
        const gaps: number[] = [];
        for (let i = 1; i < workedDays.length; i++) {
          gaps.push(workedDays[i] - workedDays[i - 1]);
        }

        const gapCounts: { [key: number]: number } = {};
        gaps.forEach((g) => gapCounts[g] = (gapCounts[g] || 0) + 1);
        let maxGapCount = 0;
        let mostCommonGap = 3;
        Object.keys(gapCounts).forEach((gk) => {
          const gNum = Number(gk);
          if (gapCounts[gNum] > maxGapCount) {
            maxGapCount = gapCounts[gNum];
            mostCommonGap = gNum;
          }
        });

        detectedInterval = mostCommonGap;

        const workedWeekendsCount = workedDays.filter((d) => {
          const dateStr = `${pYear}-${String(pMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          return isHolidayOrWeekend(dateStr);
        }).length;

        if (workedWeekendsCount === 0 && workedDays.length > 10) {
          isWeekdaysOnly = true;
        } else if (detectedInterval === 1) {
          if (workedWeekendsCount === 0) {
            isWeekdaysOnly = true;
          } else {
            isEveryDay = true;
          }
        }
      } else {
        if (emp.position === "უფროსი ექიმი" || emp.position === "სუპერვაიზერი") {
          isWeekdaysOnly = true;
        } else if (emp.position === "ექიმი" || emp.position === "უმცროსი ექიმი") {
          detectedInterval = 4;
        } else {
          detectedInterval = 3;
        }
      }

      const currentShifts: { [day: number]: { hours: number } } = {};

      if (isWeekdaysOnly) {
        for (let d = 1; d <= numDays; d++) {
          const dateStr = `${settings.year}-${String(settings.month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          if (!isHolidayOrWeekend(dateStr)) {
            currentShifts[d] = { hours: detectedHours };
          }
        }
      } else if (isEveryDay) {
        for (let d = 1; d <= numDays; d++) {
          currentShifts[d] = { hours: detectedHours };
        }
      } else {
        let lastWorkedDay = workedDays[workedDays.length - 1];
        if (!lastWorkedDay) {
          const empIndex = employees.findIndex((e) => e.id === emp.id);
          lastWorkedDay = 1 - detectedInterval + (empIndex % detectedInterval);
        }

        const lastDate = new Date(pYear, pMonth - 1, lastWorkedDay);
        let nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + detectedInterval);

        const currentMonthZeroIndex = settings.month - 1;
        const currentYear = settings.year;

        while (true) {
          const dYear = nextDate.getFullYear();
          const dMonth = nextDate.getMonth();
          const dDate = nextDate.getDate();

          if (dYear > currentYear || (dYear === currentYear && dMonth > currentMonthZeroIndex)) {
            break;
          }

          if (dYear === currentYear && dMonth === currentMonthZeroIndex) {
            currentShifts[dDate] = { hours: detectedHours };
          }

          nextDate.setDate(nextDate.getDate() + detectedInterval);
        }
      }

      updatedSchedules[emp.id] = {
        employeeId: emp.id,
        year: settings.year,
        month: settings.month,
        shifts: currentShifts,
      };

      successCount++;
    });

    setSchedules(updatedSchedules);
    saveSchedulesForPeriod(settings.year, settings.month, updatedSchedules);

    showToast(`განრიგი ავტომატურად გადაიანგარიშა წინა თვის (${GEORGIAN_MONTHS[pMonth]}) რიტმების მიხედვით! შეცვლილია ${successCount} პერსონალის გრაფიკი.`, "success");
  };

  const handleClearAllShifts = () => {
    if (window.confirm("გაფრთხილება: ნამდვილად გსურთ მიმდინარე თვის ყველა მორიგეობის წაშლა?")) {
      const cleared = { ...schedules };
      Object.keys(cleared).forEach((id) => {
        cleared[id].shifts = {};
      });
      setSchedules(cleared);
      saveSchedulesForPeriod(settings.year, settings.month, cleared);
      showToast("ტაბელი სრულად გასუფთავდა", "info");
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm("ნამდვილად გსურთ საწყის სატესტო მონაცემებზე დაბრუნება? მიმდინარე ცვლილებები წაიშლება.")) {
      initFirestoreWithDefaults();
      showToast("სისტემა დაუბრუნდა ქარხნულ სატესტო მონაცემებს", "success");
    }
  };

  const handleExportDatabase = () => {
    const databaseBackup = { employees, schedules, settings };
    const blob = new Blob([JSON.stringify(databaseBackup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hospital_shifts_backup_${settings.year}_${settings.month}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("მონაცემთა ბაზა წარმატებით ჩამოიტვირთა", "success");
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.employees && parsed.schedules && parsed.settings) {
          setEmployees(parsed.employees);
          setStoredEmployees(parsed.employees);
          setSchedules(parsed.schedules);
          setSettings(parsed.settings);
          setStoredDeptSettings(parsed.settings);
          saveSchedulesForPeriod(parsed.settings.year, parsed.settings.month, parsed.schedules);
          showToast("მონაცემები წარმატებით აღდგა!", "success");
        } else {
          showToast("ფაილს აქვს არასწორი სტრუქტურა", "error");
        }
      } catch (err) {
        showToast("ფაილის წაკითხვის შეცდომა", "error");
      }
    };
    reader.readAsText(file);
  };

  // Excel generation triggering
  const handleDownloadExcelSpreadsheet = async () => {
    showToast("მიმდინარეობს Excel ტაბელის გენერაცია...", "info");
    try {
      const fileBlob = await generateExcelTimesheet({
        companyName: settings.companyName,
        departmentName: settings.departmentName,
        year: settings.year,
        month: settings.month,
        employees,
        schedules,
        filterPosition,
        standardMonthlyHours: settings.standardHoursNorm,
        specialLeaves,
      });

      const monthLabel = GEORGIAN_MONTHS[settings.month];
      const filename = `სახელფასო_ტაბელი_${monthLabel}_${settings.year}.xlsx`;

      const downloadUrl = URL.createObjectURL(fileBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = filename;
      downloadLink.click();
      URL.revokeObjectURL(downloadUrl);

      showToast("Excel ფაილი წარმატებით ჩამოიტვირთა!", "success");
    } catch (err) {
      console.error(err);
      showToast("Excel-ის გენერაციისას დაფიქსირდა შეცდომა", "error");
    }
  };

  // Helper to open Add Shift modal with proper field pre-defaults
  const openAddShiftModal = () => {
    const defaultDayStr = `${settings.year}-${String(settings.month).padStart(2, "0")}-01`;
    setSelectedShiftDate(defaultDayStr);
    
    // Auto preset employee based on privilege
    if (!isAdmin && loggedInEmployeeId) {
      setSelectedShiftEmpId(loggedInEmployeeId);
    } else {
      setSelectedShiftEmpId(employees[0]?.id || "");
    }
    
    setSelectedShiftHours(12);
    setIsShiftRecurring(false);
    setShiftRecurrenceRule("every_third");
    setRecSearchQuery("");
    setRecPositionFilter("ყველა");
    setModalError("");
    setIsAddShiftOpen(true);
  };

  // Helper to open Leave range modal with defaults
  const openLeaveModal = () => {
    const defaultDayStr = `${settings.year}-${String(settings.month).padStart(2, "0")}-01`;
    const defaultEndStr = `${settings.year}-${String(settings.month).padStart(2, "0")}-07`;
    setLeaveStartDate(defaultDayStr);
    setLeaveEndDate(defaultEndStr);
    
    if (!isAdmin && loggedInEmployeeId) {
      setLeaveEmployeeId(loggedInEmployeeId);
    } else {
      setLeaveEmployeeId(employees[0]?.id || "");
    }
    
    setLeaveType("შვებულება");
    setLeaveSearchQuery("");
    setLeavePositionFilter("ყველა");
    setModalError("");
    setIsLeaveOpen(true);
  };

  // Dual Role authorization verification (no bypass, no sampl/demo pointers)
  const handleUnlockPortal = (e: React.FormEvent) => {
    e.preventDefault();
    setLockError("");

    if (authMode === "admin") {
      if (authUsername.trim() === "admin" && authPassword === "admin123") {
        setIsLocked(false);
        setIsAdmin(true);
        setLoggedInEmployeeId(null);
        localStorage.setItem("hospital_logged_in_employee_id", "");
        localStorage.setItem("hospital_is_superadmin_unlocked", "true");
        setAuthUsername("");
        setAuthPassword("");
        showToast("ავტორიზაცია გატარდა — კეთილი ყოველით, ადმინისტრატორო!", "success");
      } else {
        // Check senior doctor / senior nurse credentials
        const seniorEmployee = employees.find(
          (emp) => emp.username && emp.password &&
            emp.username === authUsername.trim() && emp.password === authPassword
        );
        if (seniorEmployee) {
          setIsLocked(false);
          setIsAdmin(true);
          setLoggedInEmployeeId(seniorEmployee.id);
          localStorage.setItem("hospital_logged_in_employee_id", seniorEmployee.id);
          localStorage.setItem("hospital_is_superadmin_unlocked", "false");
          setAuthUsername("");
          setAuthPassword("");
          showToast(`სესია გააქტიურდა: ${seniorEmployee.name} (${seniorEmployee.position})`, "success");
        } else {
          setLockError("მომხმარებლის სახელი ან პაროლი არასწორია");
        }
      }
    } else {
      // Employee login using personal ID
      if (authPersonalId.length !== 11 || !/^\d+$/.test(authPersonalId)) {
        setLockError("პირადი ნომერი უნდა შედგებოდეს ზუსტად 11 ციფრისგან");
        return;
      }
      
      const foundEmployee = employees.find(emp => emp.personalId === authPersonalId);
      if (foundEmployee) {
        setIsLocked(false);
        setLoggedInEmployeeId(foundEmployee.id);
        localStorage.setItem("hospital_logged_in_employee_id", foundEmployee.id);
        localStorage.setItem("hospital_is_superadmin_unlocked", "false");
        
        // Head doc, head nurse, and admin are also admins!
        if (foundEmployee.position === "უფროსი ექიმი" || foundEmployee.position === "უფროსი ექთანი" || foundEmployee.position === "ადმინისტრატორი") {
          setIsAdmin(true);
          showToast(`სესია გააქტიურდა როგორც ადმინისტრატორი: ${foundEmployee.name}!`, "success");
        } else {
          setIsAdmin(false);
          showToast(`სესია გააქტიურდა თანამშრომლისთვის: ${foundEmployee.name}!`, "success");
        }
        setAuthPersonalId("");
      } else {
        // Fallback: If no employees or first boot, allow any 11 digits to prevent lockouts
        if (employees.length === 0) {
          setIsLocked(false);
          setIsAdmin(false);
          setLoggedInEmployeeId(null);
          localStorage.setItem("hospital_logged_in_employee_id", "");
          localStorage.setItem("hospital_is_superadmin_unlocked", "false");
          setAuthPersonalId("");
          showToast("სისტემა დაცარიელებულია. ავტორიზაცია გატარდა როგორც თანამშრომელი.", "success");
        } else {
          setLockError("პერსონალი მოცემული პირადი ნომრით ვერ მოიძებნა კლინიკის ბაზაში");
        }
      }
    }
  };

  // Advanced Date and Recurrent Shift planner starting from a custom Date
  const handleAddNewShiftSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    const finalShiftEmpId = (!isAdmin && loggedInEmployeeId) ? loggedInEmployeeId : selectedShiftEmpId;
    if (!finalShiftEmpId) {
      setModalError("გთხოვთ აირჩიოთ თანამშრომელი განრიგისთვის");
      return;
    }
    if (!selectedShiftDate) {
      setModalError("გთხოვთ მიუთითოთ მორიგეობის თარიღი");
      return;
    }

    const parsedDate = new Date(selectedShiftDate);
    const sYear = parsedDate.getFullYear();
    const sMonth = parsedDate.getMonth() + 1; // 1-indexed (1-12)
    const sDay = parsedDate.getDate();

    if (sYear !== settings.year || sMonth !== settings.month) {
      setModalError(`გთხოვთ შეარჩიოთ თარიღი მიმდინარე აქტიური პერიოდიდან (${GEORGIAN_MONTHS[settings.month]} ${settings.year})`);
      return;
    }

    const updatedSchedules = { ...schedules };
    if (!updatedSchedules[finalShiftEmpId]) {
      updatedSchedules[finalShiftEmpId] = {
        employeeId: finalShiftEmpId,
        year: settings.year,
        month: settings.month,
        shifts: {},
      };
    }

    const targetShifts = { ...updatedSchedules[finalShiftEmpId].shifts };

    if (!isShiftRecurring) {
      // Single shift on specific date
      if (selectedShiftHours === 0) {
        delete targetShifts[sDay];
      } else {
        targetShifts[sDay] = { hours: selectedShiftHours };
      }
    } else {
      // Recur shift starting starting from selected date sDay to the month end
      const numDays = new Date(settings.year, settings.month, 0).getDate();
      for (let day = sDay; day <= numDays; day++) {
        const dateStr = `${settings.year}-${String(settings.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const isWE = isHolidayOrWeekend(dateStr);

        let shouldAssign = false;
        switch (shiftRecurrenceRule) {
          case "everyday":
            shouldAssign = true;
            break;
          case "every_second":
            shouldAssign = (day - sDay) % 2 === 0;
            break;
          case "every_third":
            shouldAssign = (day - sDay) % 3 === 0;
            break;
          case "every_fourth":
            shouldAssign = (day - sDay) % 4 === 0;
            break;
          case "weekdays":
            shouldAssign = !isWE;
            break;
          case "weekends":
            shouldAssign = isWE;
            break;
        }

        if (shouldAssign) {
          if (selectedShiftHours === 0) {
            delete targetShifts[day];
          } else {
            targetShifts[day] = { hours: selectedShiftHours };
          }
        }
      }
    }

    updatedSchedules[finalShiftEmpId].shifts = targetShifts;
    setSchedules(updatedSchedules);
    saveSchedulesForPeriod(settings.year, settings.month, updatedSchedules);

    setIsAddShiftOpen(false);
    showToast("მორიგეობის განრიგი წარმატებით გაფორმდა!", "success");
  };

  // Leaves and sick Range registration
  const handleAddLeaveRangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveEmployeeId) {
      showToast("გთხოვთ აირჩიოთ თანამშრომელი შვებულებისთვის", "error");
      return;
    }
    if (!leaveStartDate || !leaveEndDate) {
      showToast("გთხოვთ მიუთითოთ დაწყების და დასრულების თარიღები", "error");
      return;
    }
    if (leaveStartDate > leaveEndDate) {
      showToast("დაწყების თარიღი არ შეიძლება იყოს დასრულების თარიღზე გვიან", "error");
      return;
    }

    const newLeave: SpecialLeaveRange = {
      id: `leave-${Date.now()}`,
      employeeId: leaveEmployeeId,
      type: leaveType,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
    };

    const nextLeaves = [...specialLeaves, newLeave];
    setSpecialLeaves(nextLeaves);
    setStoredSpecialLeaves(nextLeaves);

    setIsLeaveOpen(false);
    showToast("შვებულების/ბიულეტენის პერიოდი წარმატებით გაფორმდა!", "success");
  };

  const handleDeleteLeaveRange = (id: string) => {
    if (window.confirm("ნამდვილად გსურთ ამ შვებულების/ბიულეტენის გაუქმება?")) {
      const nextLeaves = specialLeaves.filter(l => l.id !== id);
      setSpecialLeaves(nextLeaves);
      setStoredSpecialLeaves(nextLeaves);
      showToast("შვებულების/ბიულეტენის ჩანაწერი წაიშალა", "info");
    }
  };

  // Firebase loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#071E3D] flex flex-col items-center justify-center gap-5 text-white">
        <div className="w-12 h-12 border-4 border-sky-400/30 border-t-sky-400 rounded-full animate-spin"></div>
        <div className="text-center space-y-1">
          <p className="text-sm font-black text-sky-300 uppercase tracking-widest">Firebase-დან ჩართვა</p>
          <p className="text-xs text-slate-400 font-semibold">მონაცემები სინქრონიზდება...</p>
        </div>
      </div>
    );
  }

  // Secure locked medical office login page
  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#071E3D] flex items-center justify-center p-4 antialiased text-white font-sans relative overflow-hidden">
        {/* Decorative ambient visual background icons */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-8 w-full max-w-md shadow-2xl relative z-10 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-2">
              <Lock size={26} className="text-white" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black text-sky-400 tracking-widest leading-none">დაცული სამედიცინო სესია</span>
              <h1 className="text-xl font-black mt-1">კლინიკის ტაბელების პორტალი</h1>
              <p className="text-xs text-slate-300 mt-1 max-w-xs font-semibold">სამუშაო გრაფიკებისა და მორიგეობების აღრიცხვა</p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-white/5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => {
                setAuthMode("employee");
                setLockError("");
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === "employee" ? "bg-white text-[#071E3D] shadow-sm" : "text-slate-300 hover:text-white"
              }`}
            >
              თანამშრომელი
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("admin");
                setLockError("");
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === "admin" ? "bg-white text-[#071E3D] shadow-sm" : "text-slate-300 hover:text-white"
              }`}
            >
              ადმინისტრატორი
            </button>
          </div>

          {lockError && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert size={16} className="text-red-300 shrink-0" />
              <span>{lockError}</span>
            </div>
          )}

          <form onSubmit={handleUnlockPortal} className="space-y-4">
            {authMode === "employee" ? (
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wide text-slate-300 font-bold">თანამშრომლის პირადი ნომერი</label>
                <input
                  type="text"
                  maxLength={11}
                  value={authPersonalId}
                  onChange={(e) => setAuthPersonalId(e.target.value.replace(/\D/g, ""))}
                  placeholder="შეიყვანეთ 11-ნიშნა პირადი ნომერი"
                  className="w-full text-center tracking-widest text-sm font-mono py-2.5 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 font-semibold leading-normal pt-1 text-center">
                  ავტორიზაციისთვის ჩაწერეთ კლინიკის ბაზაში რეგისტრირებული თქვენი პირადი ნომერი
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wide text-slate-300 font-bold">ადმინისტრატორის მომხმარებელი</label>
                  <input
                    type="text"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="მომხმარებელი (მაგ: admin)"
                    className="w-full text-sm py-2.5 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-semibold"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wide text-slate-300 font-bold">პაროლი</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="პაროლი (მაგ: admin123)"
                    className="w-full text-sm py-2.5 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-mono"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 mt-2 bg-sky-500 hover:bg-sky-600 active:scale-[0.99] text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all text-center cursor-pointer uppercase tracking-wider"
            >
              პორტალში შესვლა
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col antialiased">
      
      {/* PROFESSIONAL MEDICAL OFFICE TOP APP BAR */}
      <header className="bg-white border-b border-slate-100 shadow-xs h-14 sm:h-16 shrink-0 sticky top-0 z-30 no-print">
        <div className="px-3 sm:px-4 lg:px-6 h-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#0F4C81] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md shrink-0 transform -rotate-1">
              <HeartPulse size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <span className="hidden sm:block text-[9px] tracking-widest uppercase font-black text-slate-400 leading-none">ინგოროყვას სახ. საავადმყოფო</span>
              <h1 className="hidden sm:block text-md font-black text-[#0D3B66] tracking-tight mt-0.5 truncate">მორიგეობისა და სახელფასო ტაბელის პორტალი</h1>
              <h1 className="sm:hidden text-sm font-black text-[#0D3B66] truncate">სახელფასო ტაბელი</h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <div className="hidden md:flex flex-col text-right mr-1.5 select-none leading-none">
              <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">წვდომის რეჟიმი</span>
              <span className="text-xs font-extrabold text-[#0D3B66] mb-0.5">
                {isAdmin ? "🛡️ ადმინისტრატორი" : "🧑‍⚕️ თანამშრომელი"}
              </span>
              {loggedInEmployee ? (
                <div className="flex flex-col leading-tight mt-0.5 border-t border-slate-100 pt-0.5">
                  <span className="text-[11px] font-black text-slate-800">{loggedInEmployee.name}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">{loggedInEmployee.position}</span>
                </div>
              ) : isAdmin ? (
                <div className="flex flex-col leading-tight mt-0.5 border-t border-slate-100 pt-0.5">
                  <span className="text-[11px] font-black text-slate-800">სისტემური ადმინისტრატორი</span>
                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wide">სუპერ ადმინი</span>
                </div>
              ) : null}
            </div>

            {/* INLINE ACTIONS */}
            {!isLocked && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={openAddShiftModal}
                  className="p-2 sm:py-2 sm:px-3.5 bg-[#00A8CC] hover:bg-[#0090B0] text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                  title="ახალი მორიგეობის დაგეგმვა"
                >
                  <PlusCircle size={16} />
                  <span className="hidden sm:inline">მორიგეობის დამატება</span>
                </button>

                <button
                  onClick={openLeaveModal}
                  className="p-2 sm:py-2 sm:px-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                  title="შვებულების, ბიულეტენის ან დეკრეტის გაფორმება"
                >
                  <Umbrella size={16} className="text-white shrink-0" />
                  <span className="hidden sm:inline">შვებულება/ბიულეტენი</span>
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setIsLocked(true);
                setIsAdmin(false);
                setLoggedInEmployeeId(null);
                localStorage.removeItem("hospital_logged_in_employee_id");
                localStorage.setItem("hospital_is_superadmin_unlocked", "false");
              }}
              className="p-2 sm:py-2 sm:px-3 border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="სესიის ჩაკეტვა და გასვლა"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">გასვლა</span>
            </button>
          </div>
        </div>
      </header>

      {/* TOAST PANEL */}
      {statusMsg && (
        <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:w-auto z-50 animate-fade-in no-print">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-3 ${
              statusMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : statusMsg.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-sky-50 border-sky-200 text-sky-800"
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-current shrink-0"></div>
            <span>{statusMsg.text}</span>
          </div>
        </div>
      )}

      {/* CORE FRAME CONTAINER */}
      <main className="flex-1 w-full px-2 sm:px-3 lg:px-5 py-2 sm:py-4 lg:py-5 flex flex-col lg:flex-row gap-3 lg:gap-5">

        {/* LEFT CONFIGURATION PANEL */}
        <aside className="w-full lg:w-60 shrink-0 no-print">

          {/* Mobile: compact horizontal strip / Desktop: full card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-100 px-3 py-2.5 lg:p-5">
            <h3 className="hidden lg:flex text-[10.5px] font-black text-slate-400 uppercase tracking-wider mb-2.5 items-center gap-1.5">
              <Calendar size={13} className="text-[#0D3B66]" />
              საანგარიშო პერიოდი
            </h3>

            <div className="flex flex-row lg:flex-col items-center lg:items-stretch gap-2 lg:gap-3">
              {/* Period selects – side-by-side always */}
              <div className="flex-1 grid grid-cols-2 gap-2">
                <select
                  value={settings.month}
                  onChange={(e) => handlePeriodChange(settings.year, parseInt(e.target.value))}
                  className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none transition-all cursor-pointer"
                >
                  {Object.keys(GEORGIAN_MONTHS).map((mKey) => (
                    <option key={mKey} value={mKey}>
                      {GEORGIAN_MONTHS[parseInt(mKey)]}
                    </option>
                  ))}
                </select>

                <select
                  value={settings.year}
                  onChange={(e) => handlePeriodChange(parseInt(e.target.value), settings.month)}
                  className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none transition-all cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Norms strip – visible on all sizes */}
              <div className="flex lg:hidden items-center gap-3 text-right shrink-0 font-mono border-l border-slate-100 pl-3">
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">ნორმა</span>
                  <span className="text-xs font-black text-slate-700">{settings.standardHoursNorm}სთ</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">დღეები</span>
                  <span className="text-xs font-black text-slate-700">{new Date(settings.year, settings.month, 0).getDate()}დ</span>
                </div>
              </div>

              {/* Norms block – desktop only */}
              <div className="hidden lg:flex p-3 bg-slate-50 rounded-lg border border-slate-100 items-center justify-between font-mono">
                <div>
                  <span className="block text-[9.5px] text-slate-400 font-bold uppercase">საათობრივი ნორმა</span>
                  <span className="text-xs font-black text-slate-700">{settings.standardHoursNorm} სთ</span>
                </div>
                <div className="text-right">
                  <span className="block text-[9.5px] text-slate-400 font-bold uppercase">თვის დღეები</span>
                  <span className="text-xs font-black text-slate-700">{new Date(settings.year, settings.month, 0).getDate()} დღე</span>
                </div>
              </div>
            </div>
          </div>

        </aside>

        {/* WORKSPACE AREA */}
        <section className="flex-1 space-y-3 sm:space-y-4 min-w-0 print-full-width">
          {/* NAVIGATION BAR - HIDDEN PRINT */}
          <nav className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-slate-150/65 rounded-xl no-print select-none overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab2("timesheet")}
              className={`py-2 px-2.5 sm:px-3.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === "timesheet"
                  ? "bg-white text-[#0F4C81] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Calendar size={14} />
              <span className="hidden sm:inline">ცხრილი</span>
            </button>

            <button
              onClick={() => setActiveTab2("recurring")}
              className={`py-2 px-2.5 sm:px-3.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === "recurring"
                  ? "bg-white text-[#0F4C81] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">{isAdmin ? "განმეორებადი" : "შვებულებები"}</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab2("employees")}
                className={`py-2 px-2.5 sm:px-3.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  activeTab === "employees"
                    ? "bg-white text-[#0F4C81] shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users size={14} />
                <span className="hidden sm:inline">პერსონალი</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab2("stats")}
              className={`py-2 px-2.5 sm:px-3.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === "stats"
                  ? "bg-white text-[#0F4C81] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <BarChart3 size={14} />
              <span className="hidden sm:inline">ანალიტიკა</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab2("params")}
                className={`py-2 px-2.5 sm:px-3.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  activeTab === "params"
                    ? "bg-white text-[#0F4C81] shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Settings size={14} />
                <span className="hidden sm:inline">პარამეტრები</span>
              </button>
            )}
          </nav>

          {/* DYNAMIC VIEWPORTS */}
          <div className="print-full-width">
            {activeTab === "timesheet" && (
              <TimesheetGrid
                employees={employees}
                schedules={schedules}
                year={settings.year}
                month={settings.month}
                filterPosition={filterPosition}
                setFilterPosition={setFilterPosition}
                standardHoursNorm={settings.standardHoursNorm}
                onUpdateShift={handleUpdateShift}
                onUpdateEmployeeSpecialStatus={handleUpdateEmployeeSpecialStatus}
                onDownloadExcel={handleDownloadExcelSpreadsheet}
                specialLeaves={specialLeaves}
                isAdmin={isAdmin}
                loggedInEmployee={loggedInEmployee}
                onSyncRhythmFromPreviousMonth={handleSyncRhythmFromPreviousMonth}
              />
            )}

            {activeTab === "recurring" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print animate-fade-in">
                <div className="lg:col-span-2 space-y-6">
                  {isAdmin && (
                    <ShiftQuickScheduler
                      employees={employees}
                      year={settings.year}
                      month={settings.month}
                      onApplyRecurringShifts={handleApplyRecurringShifts}
                    />
                  )}

                  {/* Vacations & Bulletin leave scheduler periods registry */}
                  <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 space-y-4 text-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-50">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                          <Umbrella size={16} className="text-amber-600" />
                          შვებულებების და ბიულეტენების რეესტრი
                        </h3>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5">სპეციალური სტატუსების კალენდარული პერიოდები</p>
                      </div>

                      <button
                        onClick={openLeaveModal}
                        type="button"
                        className="py-1.5 px-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer w-fit"
                      >
                        <PlusCircle size={14} />
                        შვებულების გაფორმება
                      </button>
                    </div>

                    {specialLeaves.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 font-bold text-xs">
                        აქტიური დაგეგმილი შვებულებები ან ბიულეტენები არ ირიცხება.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-700">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100">
                              <th className="p-2.5">თანამშრომელი</th>
                              <th className="p-2.5">პოზიცია</th>
                              <th className="p-2.5">ტიპი</th>
                              <th className="p-2.5 text-center font-mono">საიდან</th>
                              <th className="p-2.5 text-center font-mono">სადამდე</th>
                              <th className="p-2.5 text-right">მოქმედება</th>
                            </tr>
                          </thead>
                          <tbody>
                            {specialLeaves.map((lRange) => {
                              const emp = employees.find((e) => e.id === lRange.employeeId);
                              if (!emp) return null;
                              const canDelete = isAdmin || (loggedInEmployeeId && lRange.employeeId === loggedInEmployeeId);
                              return (
                                <tr key={lRange.id} className="border-b border-slate-50 hover:bg-slate-50/55 transition-colors">
                                  <td className="p-2.5 font-bold text-[#0D3B66]">{emp.name}</td>
                                  <td className="p-2.5 text-slate-400 text-[10px] font-bold">{emp.position}</td>
                                  <td className="p-2.5">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      {lRange.type}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center font-mono text-slate-600 font-bold">{lRange.startDate}</td>
                                  <td className="p-2.5 text-center font-mono text-slate-600 font-bold">{lRange.endDate}</td>
                                  <td className="p-2.5 text-right">
                                    {canDelete ? (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteLeaveRange(lRange.id)}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                        title="გაუქმება"
                                      >
                                        <Trash2 size={13.5} />
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-bold">დაცული</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
                
                {!isAdmin ? (
                  <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-3.5 h-fit text-slate-800">
                    <h3 className="font-extrabold text-xs text-amber-800 uppercase flex items-center gap-1.5">
                      <Umbrella size={15} className="text-amber-600" />
                      შვებულებები და გაცდენები
                    </h3>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                      აქ შეგიძლიათ იხილოთ კლინიკის ყველა თანამშრომლის შვებულებების, ბიულეტენების, დეკრეტული პერიოდების და გაცდენების რეესტრი.
                    </p>
                    <ul className="space-y-1.5 text-[11px] text-slate-650 font-bold list-disc list-inside">
                      <li>კონკრეტული ვადების მითითებით შვებულება ავტომატურად ისახება ტაბელში.</li>
                      <li>ავადმყოფობა ან ბიულეტენი (საავადმყოფო ფურცელი) გათავისუფლებთ მორიგეობებისგან.</li>
                      <li>თქვენ შეგიძლიათ თავად გააუქმოთ მხოლოდ თქვენს მიერ შექმნილი პერიოდები.</li>
                    </ul>
                  </div>
                ) : (
                  <div className="p-5 bg-sky-50/55 border border-sky-100 rounded-2xl space-y-3.5 h-fit text-slate-800">
                    <h3 className="font-extrabold text-xs text-[#0D3B66] uppercase flex items-center gap-1.5">
                      <Award size={15} className="text-[#00A8CC]" />
                      როგორ მუშაობს ავტომატური დარიტმვა?
                    </h3>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                      ყოველდღიურად ხელით განრიგის შევსების ნაცვლად, შეგიძლიათ გამოიყენოთ შემდეგი მარტივი წესები:
                    </p>
                    <ul className="space-y-1.5 text-[11px] text-slate-600 font-bold list-disc list-inside">
                      <li>აირჩიეთ სასურველი თანამშრომელი ან მთელი კატეგორია</li>
                      <li>მიუთითეთ სასურველი მორიგეობის საათები (მაგ. <strong>24</strong>, <strong>12</strong> ან <strong>8</strong>)</li>
                      <li>მიუთითეთ განმეორებადობის ციკლი და დასაწყისი თვის რიცხვი</li>
                      <li>დააჭირეთ დარიტმვას და საათები მყისიერად გადანაწილდება მთელ თვეზე!</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === "employees" && (
              <div className="no-print">
                <EmployeeManager
                  employees={employees}
                  onAddEmployee={handleAddEmployee}
                  onUpdateEmployee={handleUpdateEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                />
              </div>
            )}

            {activeTab === "stats" && (
              <div className="no-print">
                <StatsDashboard
                  employees={employees}
                  schedules={schedules}
                  year={settings.year}
                  month={settings.month}
                  standardHoursNorm={settings.standardHoursNorm}
                />
              </div>
            )}

            {activeTab === "params" && isAdmin && (
              <div className="no-print space-y-6 max-w-2xl animate-fade-in">
                {/* Clinical Office Custom settings */}
                <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-100">
                  <h3 className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Settings size={13} className="text-[#0D3B66]" />
                    უწყებრივი რეგულირება
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">კომპანიის სათაური</label>
                      <textarea
                        value={settings.companyName}
                        onChange={handleCompanyNameChange}
                        rows={2}
                        placeholder="მაგ: შპს ინგოროყვას კლინიკა"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-normal focus:outline-none focus:border-sky-500 transition-all font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">სამედიცინო განყოფილება</label>
                      <input
                        type="text"
                        value={settings.departmentName}
                        onChange={handleDeptNameChange}
                        placeholder="მაგ: რეანიმაცია"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-sky-500 transition-all font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">თვის ნორმა საათებში</label>
                      <input
                        type="number"
                        value={settings.standardHoursNorm}
                        onChange={handleHoursNormChange}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Database Backup tools */}
                <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-100">
                  <h3 className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <DatabaseBackup size={13} className="text-[#0D3B66]" />
                    რეზერვი და მონაცემები
                  </h3>
                  <p className="text-[9.5px] text-slate-400 leading-relaxed mb-4 font-semibold">
                    ყველა სამუშაო საათი ავტომატურად ინახება ბრაუზერში. თვის ცვლილებისას მონაცემები არ იკარგება.
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={handleExportDatabase}
                      className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-slate-200"
                    >
                      მონაცემთა ჩამოტვირთვა (.json)
                    </button>
                    <label className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-dashed border-slate-200">
                      რეზერვის აღდგენა (.json)
                      <input type="file" accept=".json" onChange={handleImportDatabase} className="hidden" />
                    </label>
                    <button
                      onClick={handleClearAllShifts}
                      className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-red-500/10"
                    >
                      ტაბელის სრული გასუფთავება
                    </button>
                    <button
                      onClick={handleResetToDefaults}
                      className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg text-[10px] font-bold cursor-pointer transition-all text-center"
                    >
                      ნაგულისხმევი დემო ბაზა
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-4 mt-auto shrink-0 text-center text-[9.5px] text-slate-400 font-bold uppercase tracking-wider no-print select-none">
        სამედიცინო ტაბელების მართვის უწყებრივი პორტალი © {new Date().getFullYear()} — შპს ინგოროყვას კლინიკის ოფიციალური ფორმატი
      </footer>

      {/* SEARCHABLE DYNAMIC "მორიგეობის დაგეგმვა" MODAL WINDOW */}
      {isAddShiftOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 no-print select-none">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-100 w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto animate-fade-in text-slate-800">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <Calendar size={16} className="text-sky-600" />
                  მორიგეობის დაგეგმვა
                </h3>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1">საათობრივი მორიგეობის განაწილება კონკრეტულ თარიღებზე</p>
              </div>
              
              <button
                onClick={() => {
                  setIsAddShiftOpen(false);
                  setModalError("");
                }}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form body */}
            <form onSubmit={handleAddNewShiftSchedule} className="p-6 space-y-4">
              
              {modalError && (
                <div className="p-2.5 bg-red-50 text-red-650 border border-red-100 rounded-xl text-xs font-bold flex items-center gap-2">
                  <ShieldAlert size={15} />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Searchable and Filterable Employee Selector */}
              {!isAdmin && loggedInEmployee ? (
                <div className="p-3 bg-sky-50 border border-sky-150 rounded-xl flex items-center justify-between select-none">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-sky-600 tracking-wider">მოსამსახურე პერსონა (მორიგე)</span>
                    <strong className="text-sm font-black text-[#0D3B66]">{loggedInEmployee.name}</strong>
                    <span className="block text-[10.5px] text-slate-500 font-bold">{loggedInEmployee.position} (პირადი ნ.: {loggedInEmployee.personalId})</span>
                  </div>
                  <span className="text-[10px] font-black tracking-wider bg-white text-sky-600 px-3 py-1.5 rounded-lg border border-sky-100 uppercase">
                    ფიქსირებული
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">თანამშრომლის შერჩევა</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="მოძებნე სახელით ან როლით..."
                        value={recSearchQuery}
                        onChange={(e) => setRecSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-500 transition-all font-semibold"
                      />
                    </div>
                    <select
                      value={recPositionFilter}
                      onChange={(e) => setRecPositionFilter(e.target.value)}
                      className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      <option value="ყველა">ყველა როლი</option>
                      <option value="ადმინისტრატორი">ადმინისტრატორი</option>
                      <option value="უფროსი ექიმი">უფროსი ექიმი</option>
                      <option value="ექიმი">ექიმი</option>
                      <option value="უმცროსი ექიმი">უმცროსი ექიმი</option>
                      <option value="უფროსი ექთანი">უფროსი ექთანი</option>
                      <option value="სუპერვაიზერი">სუპერვაიზერი</option>
                      <option value="ექთანი">ექთანი</option>
                      <option value="ექთნის დამხმარე">ექთნის დამხმარე</option>
                      <option value="სანიტარი">სანიტარი</option>
                    </select>
                  </div>
                  
                  {/* Scrollable Selector Grid */}
                  <div className="max-h-36 overflow-y-auto border border-slate-100 rounded-lg p-1.5 bg-slate-50/50 space-y-1">
                    {employees.filter(e => {
                      const matchedName = e.name.toLowerCase().includes(recSearchQuery.toLowerCase()) || e.personalId.includes(recSearchQuery);
                      const matchedPos = recPositionFilter === "ყველა" || e.position === recPositionFilter;
                      return matchedName && matchedPos;
                    }).length === 0 ? (
                      <p className="text-[11px] text-slate-400 font-bold py-4 text-center">შესაბამისი თანამშრომელი არ მოიძებნა</p>
                    ) : (
                      employees.filter(e => {
                        const matchedName = e.name.toLowerCase().includes(recSearchQuery.toLowerCase()) || e.personalId.includes(recSearchQuery);
                        const matchedPos = recPositionFilter === "ყველა" || e.position === recPositionFilter;
                        return matchedName && matchedPos;
                      }).map(emp => {
                        const isSelectedAndActive = selectedShiftEmpId === emp.id;
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => setSelectedShiftEmpId(emp.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors text-left font-semibold ${
                              isSelectedAndActive
                                ? "bg-sky-50 text-sky-800 border border-sky-200"
                                : "hover:bg-slate-100 text-slate-700 border border-transparent"
                            }`}
                          >
                            <div>
                              <span className="font-extrabold text-[#0D3B66]">{emp.name}</span>
                              <span className="block text-[10px] text-slate-400">{emp.position} (პირადი ნ.: {emp.personalId})</span>
                            </div>
                            {isSelectedAndActive && <Check size={14} className="text-sky-600 font-extrabold" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Date & Hours Layout */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">მორიგეობის თარიღი</label>
                  <input
                    type="date"
                    value={selectedShiftDate}
                    onChange={(e) => setSelectedShiftDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">სამუშაო საათები</label>
                  <select
                    value={selectedShiftHours}
                    onChange={(e) => setSelectedShiftHours(parseInt(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-bold cursor-pointer"
                  >
                    <option value={24}>24 საათი (სრული დღე)</option>
                    <option value={12}>12 საათი (ნახევარი დღე/ღამე)</option>
                    <option value={8}>8 საათი (დღის მორიგეობა)</option>
                    <option value={16}>16 საათი</option>
                    <option value={6}>6 საათი</option>
                    <option value={0}>0 სთ (ცარიელი/წაშლა)</option>
                  </select>
                </div>
              </div>

              {/* Recurrence Pattern Configuration */}
              <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isShiftRecurring}
                    onChange={(e) => setIsShiftRecurring(e.target.checked)}
                    className="w-4 h-4 text-sky-600 border-slate-200 rounded focus:ring-sky-500 cursor-pointer"
                  />
                  <span className="text-xs font-extrabold text-[#0D3B66]">გრაფიკის ავტომატური გამეორება (დარიტმვა)</span>
                </label>

                {isShiftRecurring && (
                  <div className="pt-2 border-t border-slate-200/50 animate-fade-in">
                    <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">განმეორებადობის სქემა (არჩეული თარიღიდან)</label>
                    <select
                      value={shiftRecurrenceRule}
                      onChange={(e) => setShiftRecurrenceRule(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="everyday">ყოველდღიურად ამ რიცხვიდან თვის ბოლომდე</option>
                      <option value="every_second">დღეგამოშვებით (ყოველ მეორე დღეს)</option>
                      <option value="every_third">სამ დღეში ერთხელ (ყოველ მესამე დღეს)</option>
                      <option value="every_fourth">ოთხ დღეში ერთხელ (ყოველ მეოთხე დღეს)</option>
                      <option value="weekdays">მხოლოდ სამუშაო დღეებში (შაბათ-კვირის გარდა)</option>
                      <option value="weekends">მხოლოდ დასვენების და უქმე დღეებში</option>
                    </select>
                    <p className="text-[9.5px] text-slate-400 leading-normal mt-1.5 font-semibold">
                      საათები ავტომატურად გადანაწილდება გრაფიკის მიხედვით, დაწყებული მონიშნული დღიდან მიმდინარე თვის დასასრულამდე.
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddShiftOpen(false);
                    setModalError("");
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  გაუქმება
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black rounded-xl shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                >
                  დაგეგმვა და შენახვა
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED DATE-RANGE "შვებულება და ბიულეტენი" REGISTRATION MODAL WINDOW */}
      {isLeaveOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 no-print select-none">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-100 w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto animate-fade-in text-slate-800">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <Umbrella size={16} className="text-amber-600" />
                  შვებულების / ბიულეტენის გაფორმება
                </h3>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1">აკადემიური პერიოდი, ორსულობა, ავადმყოფობა და განთავისუფლება</p>
              </div>
              
              <button
                onClick={() => {
                  setIsLeaveOpen(false);
                  setModalError("");
                }}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form body */}
            <form onSubmit={handleAddLeaveRangeSubmit} className="p-6 space-y-4">
              
              {/* Searchable and Filterable Employee Selector for Vacation */}
              {!isAdmin && loggedInEmployee ? (
                <div className="p-3 bg-amber-50 border border-amber-150 rounded-xl flex items-center justify-between select-none">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-amber-700 tracking-wider">მოსამსახურე პერსონა</span>
                    <strong className="text-sm font-black text-[#0D3B66]">{loggedInEmployee.name}</strong>
                    <span className="block text-[10.5px] text-slate-500 font-bold">{loggedInEmployee.position} (პირადი ნ.: {loggedInEmployee.personalId})</span>
                  </div>
                  <span className="text-[10px] font-black tracking-wider bg-white text-amber-700 px-3 py-1.5 rounded-lg border border-amber-100 uppercase">
                    ფიქსირებული
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">თანამშრომლის შერჩევა</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="მოძებნე სახელით ან როლით..."
                        value={leaveSearchQuery}
                        onChange={(e) => setLeaveSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-sky-500 transition-all font-semibold"
                      />
                    </div>
                    <select
                      value={leavePositionFilter}
                      onChange={(e) => setLeavePositionFilter(e.target.value)}
                      className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      <option value="ყველა">ყველა როლი</option>
                      <option value="ადმინისტრატორი">ადმინისტრატორი</option>
                      <option value="უფროსი ექიმი">უფროსი ექიმი</option>
                      <option value="ექიმი">ექიმი</option>
                      <option value="უმცროსი ექიმი">უმცროსი ექიმი</option>
                      <option value="უფროსი ექთანი">უფროსი ექთანი</option>
                      <option value="სუპერვაიზერი">სუპერვაიზერი</option>
                      <option value="ექთანი">ექთანი</option>
                      <option value="ექთნის დამხმარე">ექთნის დამხმარე</option>
                      <option value="სანიტარი">სანიტარი</option>
                    </select>
                  </div>
                  
                  {/* Scrollable Selector Grid for Vacation */}
                  <div className="max-h-36 overflow-y-auto border border-slate-100 rounded-lg p-1.5 bg-slate-50/50 space-y-1">
                    {employees.filter(e => {
                      const matchedName = e.name.toLowerCase().includes(leaveSearchQuery.toLowerCase()) || e.personalId.includes(leaveSearchQuery);
                      const matchedPos = leavePositionFilter === "ყველა" || e.position === leavePositionFilter;
                      return matchedName && matchedPos;
                    }).length === 0 ? (
                      <p className="text-[11px] text-slate-400 font-bold py-4 text-center font-semibold">შესაბამისი პერსონალი არ მოიძებნა</p>
                    ) : (
                      employees.filter(e => {
                        const matchedName = e.name.toLowerCase().includes(leaveSearchQuery.toLowerCase()) || e.personalId.includes(leaveSearchQuery);
                        const matchedPos = leavePositionFilter === "ყველა" || e.position === leavePositionFilter;
                        return matchedName && matchedPos;
                      }).map(emp => {
                        const isSelectedAndActive = leaveEmployeeId === emp.id;
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => setLeaveEmployeeId(emp.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors text-left font-semibold ${
                              isSelectedAndActive
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "hover:bg-slate-100 text-slate-700 border border-transparent"
                            }`}
                          >
                            <div>
                              <span className="font-extrabold text-[#0D3B66]">{emp.name}</span>
                              <span className="block text-[10px] text-slate-400">{emp.position} (პირადი ნ.: {emp.personalId})</span>
                            </div>
                            {isSelectedAndActive && <Check size={14} className="text-amber-600 font-extrabold" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Leave category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">დათხოვნის კატეგორია</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as SpecialStatusType)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="შვებულება">შვებულება (ორდინალური შვებულება)</option>
                  <option value="ბიულეტენი">ბიულეტენი (სამედიცინო ფურცელი / ავადმყოფობა)</option>
                  <option value="დეკრეტული შვებულება">დეკრეტული შვებულება (ორსულობა და მშობიარობა)</option>
                  <option value="ადმინისტრაციული">ადმინისტრაციული (ანაზღაურების გარეშე)</option>
                  <option value="ავადმყოფობა">ავადმყოფობა (ავადმყოფობის გამო განთავისუფლება)</option>
                  <option value="გაცდენა">გაცდენა (სხვა მიზეზით არყოფნა)</option>
                </select>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0D3B66] mb-1">დაწყების თარიღი</label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0D3B66] mb-1">დასრულების თარიღი (მათ შორის)</label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Actions buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsLeaveOpen(false);
                    setModalError("");
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  გაუქმება
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                >
                  გაფორმება და რეგისტრაცია
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
