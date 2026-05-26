/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Employee, PositionType } from "../types";
import { Calendar, CheckCircle2, RefreshCw } from "lucide-react";

interface ShiftQuickSchedulerProps {
  employees: Employee[];
  year: number;
  month: number;
  onApplyRecurringShifts: (params: {
    employeeId: string | "all_by_position";
    positionMatch?: PositionType;
    shiftHours: number;
    ruleType: "everyday" | "every_second" | "every_third" | "every_fourth" | "weekdays" | "weekends";
    startDay: number;
  }) => void;
}

export default function ShiftQuickScheduler({
  employees,
  year,
  month,
  onApplyRecurringShifts,
}: ShiftQuickSchedulerProps) {
  const [targetType, setTargetType] = useState<"individual" | "position">("individual");
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<PositionType>("ექიმი");
  
  const [shiftHours, setShiftHours] = useState<number>(12);
  const [ruleType, setRuleType] = useState<"everyday" | "every_second" | "every_third" | "every_fourth" | "weekdays" | "weekends">("every_third");
  const [startDay, setStartDay] = useState<number>(1);
  const [showSuccess, setShowSuccess] = useState(false);

  // Auto-select first employee when list loads
  React.useEffect(() => {
    const regularEmps = employees.filter(e => !e.specialStatus);
    if (regularEmps.length > 0 && !selectedEmpId) {
      setSelectedEmpId(regularEmps[0].id);
    }
  }, [employees, selectedEmpId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyRecurringShifts({
      employeeId: targetType === "individual" ? selectedEmpId : "all_by_position",
      positionMatch: targetType === "position" ? selectedPosition : undefined,
      shiftHours,
      ruleType,
      startDay,
    });
    
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  const activeEmployees = employees.filter((e) => !e.specialStatus);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 h-full">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-50">
        <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
          <Calendar size={18} />
        </div>
        <div>
          <h2 className="text-md font-bold text-slate-800">განმეორებადი მორიგეობები</h2>
          <p className="text-xs text-slate-500">გრაფიკის ერთი დაწკაპუნებით ავტომატური გენერაცია</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Dynamic target selection: Individual Employee OR all employees of a Position */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">სამიზნე ჯგუფი</label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 rounded-lg border border-slate-100 mb-3">
            <button
              type="button"
              onClick={() => setTargetType("individual")}
              className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                targetType === "individual"
                  ? "bg-white text-sky-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              კონკრეტული პირი
            </button>
            <button
              type="button"
              onClick={() => setTargetType("position")}
              className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                targetType === "position"
                  ? "bg-white text-sky-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              მთელი როლი / პოზიცია
            </button>
          </div>

          {targetType === "individual" ? (
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-sky-500 transition-all font-sans"
            >
              {activeEmployees.length === 0 ? (
                <option value="">თანამშრომელი არ არის (ან ყველა შვებულებაშია)</option>
              ) : (
                activeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.position})
                  </option>
                ))
              )}
            </select>
          ) : (
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value as PositionType)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-sky-500 transition-all font-sans"
            >
              {Array.from(new Set(employees.map((e) => e.position))).map((pos) => (
                <option key={pos} value={pos}>
                  ყველა: {pos}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Shift configuration parameters */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">სამუშაო საათები</label>
            <select
              value={shiftHours}
              onChange={(e) => setShiftHours(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-sky-500 transition-all font-mono"
            >
              <option value={24}>24 საათი</option>
              <option value={12}>12 საათი</option>
              <option value={8}>8 საათი</option>
              <option value={6}>6 საათი</option>
              <option value={0}>0 (ცარიელი)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">დაწყების რიცხვიდან</label>
            <input
              type="number"
              min={1}
              max={31}
              value={startDay}
              onChange={(e) => setStartDay(Math.max(1, Math.min(31, Number(e.target.value))))}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-850 focus:outline-none focus:border-sky-500 transition-all font-mono"
            />
          </div>
        </div>

        {/* Recurrence Rule type */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">განმეორების წესი</label>
          <select
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value as any)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-sky-500 transition-all font-sans"
          >
            <option value="everyday">ყოველდღე</option>
            <option value="every_second">ყოველ მეორე დღეს (დღეგამოშვებით)</option>
            <option value="every_third">ყოველ მესამე დღეს (1/3 რიტმით)</option>
            <option value="every_fourth">ყოველ მეოთხე დღეს (1/4 რიტმით)</option>
            <option value="weekdays">მხოლოდ სამუშაო დღეებში (შაბათ-კვირის გარეშე)</option>
            <option value="weekends">მხოლოდ შაბათ-კვირას</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow transition-all"
        >
          <RefreshCw size={14} />
          დარიტმვა / განრიგის შევსება
        </button>

        {showSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[11px] flex items-center gap-2 font-semibold">
            <CheckCircle2 size={15} />
            კოჰორტის გრაფიკი წარმატებით შეიცვალა!
          </div>
        )}
      </form>
    </div>
  );
}
