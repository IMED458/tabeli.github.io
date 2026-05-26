/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Employee } from "../types";
import { isHolidayOrWeekend } from "../constants";
import { BarChart3, Clock, Users, ShieldAlert, Award, CalendarDays, TrendingUp } from "lucide-react";

interface StatsDashboardProps {
  employees: Employee[];
  schedules: { [employeeId: string]: any };
  year: number;
  month: number;
  standardHoursNorm: number;
}

export default function StatsDashboard({
  employees,
  schedules,
  year,
  month,
  standardHoursNorm,
}: StatsDashboardProps) {
  const numDays = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: numDays }, (_, i) => i + 1);

  // General counts
  const totalEmployees = employees.length;
  const onLeaveCount = employees.filter((e) => !!e.specialStatus).length;
  const workingCount = totalEmployees - onLeaveCount;

  // Let's compute global aggregates
  let totalHoursWorked = 0;
  let totalNightHours = 0;
  let totalHolidayHours = 0;
  let totalWorkingDays = 0;
  let totalOvertimeHours = 0;

  const employeeStats = employees.map((emp) => {
    const sched = schedules[emp.id];
    const shifts = sched ? sched.shifts : {};

    let personalHours = 0;
    let personalNights = 0;
    let personalHolidays = 0;

    if (!emp.specialStatus) {
      daysArray.forEach((day) => {
        const s = shifts[day];
        if (s && s.hours && s.hours > 0) {
          const hrs = s.hours;
          personalHours += hrs;
          totalWorkingDays += 1;

          if (hrs === 24) {
            personalNights += 8;
          } else if (hrs === 12) {
            personalNights += 4;
          }

          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          if (isHolidayOrWeekend(dateStr)) {
            personalHolidays += hrs;
          }
        }
      });
    }

    const personalOvertime = personalHours > standardHoursNorm ? personalHours - standardHoursNorm : 0;

    totalHoursWorked += personalHours;
    totalNightHours += personalNights;
    totalHolidayHours += personalHolidays;
    totalOvertimeHours += personalOvertime;

    return {
      name: emp.name,
      position: emp.position,
      totalHours: personalHours,
      overtime: personalOvertime,
      onLeave: !!emp.specialStatus,
    };
  });

  // Calculate Average hours per Position Category
  const positionGroups: { [pos: string]: { sum: number; count: number } } = {};
  employeeStats.forEach((est) => {
    if (est.onLeave) return; // exclude those on leave from averaging
    if (!positionGroups[est.position]) {
      positionGroups[est.position] = { sum: 0, count: 0 };
    }
    positionGroups[est.position].sum += est.totalHours;
    positionGroups[est.position].count += 1;
  });

  const positionAverages = Object.keys(positionGroups).map((pos) => ({
    position: pos,
    averageHours: Math.round(positionGroups[pos].sum / positionGroups[pos].count),
    headcount: positionGroups[pos].count,
  }));

  return (
    <div className="space-y-6">
      {/* METRICS GRID SUMMARY OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total hours worked */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Clock size={22} />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400">საერთო საათები</span>
            <span className="text-xl font-black text-slate-800 font-mono">{totalHoursWorked} სთ</span>
            <span className="block text-[10px] text-slate-500 font-medium mt-0.5">ყველა თანამშრომლის ერთად</span>
          </div>
        </div>

        {/* Card 2: Employees Active / On Leave */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400">შემადგენლობა</span>
            <span className="text-xl font-black text-slate-800 font-mono">
              {workingCount} / {totalEmployees}
            </span>
            <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
              {onLeaveCount > 0 ? `${onLeaveCount} შვებულებაშია` : "ყველა აქტიურია"}
            </p>
          </div>
        </div>

        {/* Card 3: Total Night Hours */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400">ღამის საათები</span>
            <span className="text-xl font-black text-slate-800 font-mono">{totalNightHours} სთ</span>
            <span className="block text-[10px] text-slate-500 font-medium mt-0.5">ღამის მორიგეობის ტარიფი</span>
          </div>
        </div>

        {/* Card 4: Holiday Coverage Hours */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Award size={22} />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400">უქმე საათები</span>
            <span className="text-xl font-black text-slate-800 font-mono">{totalHolidayHours} სთ</span>
            <span className="block text-[10px] text-slate-500 font-medium mt-0.5">შაბათ-კვირის მორიგეობები</span>
          </div>
        </div>
      </div>

      {/* CHARTS LAYOUT ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Average hours per position */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-sky-600" />
            საშუალო საათები პოზიციების მიხედვით
          </h3>

          <div className="space-y-4">
            {positionAverages.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">მონაცემები არ მოიძებნა</div>
            ) : (
              positionAverages.map((avg) => {
                const percentage = Math.min(100, Math.round((avg.averageHours / standardHoursNorm) * 100));
                return (
                  <div key={avg.position} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-700">
                        {avg.position} <span className="text-[10px] text-slate-400">({avg.headcount} პირი)</span>
                      </span>
                      <span className="font-mono text-slate-800 font-semibold">
                        {avg.averageHours}სთ / norm ({percentage}%)
                      </span>
                    </div>
                    {/* Progress Bar styled directly */}
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          avg.averageHours > standardHoursNorm
                            ? "bg-amber-500" // overworked!
                            : "bg-sky-500" // fine
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-5 text-[10px] text-slate-400 font-medium leading-relaxed">
            * საათობრივი ნორმა განისაზღვრება კალენდარული თვის სამუშაო დღეებით. მიმდინარე თვის ნორმაა:{" "}
            <strong>{standardHoursNorm} საათი</strong>.
          </div>
        </div>

        {/* Chart 2: Individual Workloads list & Alerts */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-500" />
            გადატვირთვის მონიტორინგი (ზეგანაკვეთური)
          </h3>

          <div className="space-y-3.5 max-h-[210px] overflow-y-auto pr-1">
            {employeeStats
              .filter((e) => !e.onLeave)
              .sort((a, b) => b.totalHours - a.totalHours)
              .map((est) => {
                const isOverworked = est.totalHours > standardHoursNorm;
                return (
                  <div key={est.name} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-50 bg-slate-50/20 hover:border-slate-100">
                    <div>
                      <span className="block text-xs font-bold text-slate-800">{est.name}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{est.position}</span>
                    </div>
                    <div className="text-right">
                      <span className={`block text-xs font-bold font-mono ${isOverworked ? "text-amber-600" : "text-sky-700"}`}>
                        {est.totalHours} სთ
                      </span>
                      {isOverworked ? (
                        <span className="inline-block text-[9px] font-extrabold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full border border-amber-100 animate-pulse">
                          +{est.overtime}სთ ზეგანაკვეთური
                        </span>
                      ) : (
                        <span className="block text-[9px] text-emerald-600 font-semibold">ნორმის ფარგლებში</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
