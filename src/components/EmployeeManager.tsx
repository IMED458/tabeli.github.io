/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Employee, PositionType, SpecialStatusType } from "../types";
import { POSITIONS, SPECIAL_STATUSES } from "../constants";
import { UserPlus, Trash2, Edit2, Check, X, ShieldAlert } from "lucide-react";

interface EmployeeManagerProps {
  employees: Employee[];
  onAddEmployee: (emp: Omit<Employee, "id" | "number">) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

export default function EmployeeManager({
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
}: EmployeeManagerProps) {
  const [name, setName] = useState("");
  const [personalId, setPersonalId] = useState("");
  const [position, setPosition] = useState<PositionType>("ექიმი");
  const [specialStatus, setSpecialStatus] = useState<SpecialStatusType | "regular">("regular");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPersonalId, setEditPersonalId] = useState("");
  const [editPosition, setEditPosition] = useState<PositionType>("ექიმი");
  const [editSpecialStatus, setEditSpecialStatus] = useState<SpecialStatusType | "regular">("regular");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState("");

  const isSeniorRole = (pos: PositionType) => pos === "უფროსი ექიმი" || pos === "უფროსი ექთანი";
  const hasSamePersonalIdAndPosition = (idNumber: string, pos: PositionType, ignoreId?: string) =>
    employees.some((emp) => emp.personalId === idNumber && emp.position === pos && emp.id !== ignoreId);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("გთხოვთ შეიყვანოთ თანამშრომლის სახელი და გვარი");
      return;
    }
    if (personalId.length !== 11 || !/^\d+$/.test(personalId)) {
      setErrorMsg("პირადი ნომერი უნდა შედგებოდეს ზუსტად 11 ციფრისგან");
      return;
    }
    if (hasSamePersonalIdAndPosition(personalId, position)) {
      setErrorMsg("ეს თანამშრომელი ამ პოზიციაზე უკვე დარეგისტრირებულია");
      return;
    }
    if (isSeniorRole(position) && (!newUsername.trim() || !newPassword.trim())) {
      setErrorMsg("უფროს ექიმს / ექთანს სავალდებულოა მომხმარებელი და პაროლი");
      return;
    }
    setErrorMsg("");
    onAddEmployee({
      name: name.trim(),
      personalId,
      position,
      specialStatus: specialStatus === "regular" ? null : specialStatus,
      ...(isSeniorRole(position) && { username: newUsername.trim(), password: newPassword }),
    });
    setName("");
    setPersonalId("");
    setPosition("ექიმი");
    setSpecialStatus("regular");
    setNewUsername("");
    setNewPassword("");
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditName(emp.name);
    setEditPersonalId(emp.personalId);
    setEditPosition(emp.position);
    setEditSpecialStatus(emp.specialStatus || "regular");
    setEditUsername(emp.username || "");
    setEditPassword(emp.password || "");
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) {
      setErrorMsg("სახელი ვერ იქნება ცარიელი");
      return;
    }
    if (editPersonalId.length !== 11 || !/^\d+$/.test(editPersonalId)) {
      setErrorMsg("პირადი ნომერი უნდა შედგებოდეს 11 ციფრისგან");
      return;
    }
    if (hasSamePersonalIdAndPosition(editPersonalId, editPosition, id)) {
      setErrorMsg("ეს თანამშრომელი ამ პოზიციაზე უკვე დარეგისტრირებულია");
      return;
    }
    if (isSeniorRole(editPosition) && (!editUsername.trim() || !editPassword.trim())) {
      setErrorMsg("უფროს ექიმს / ექთანს სავალდებულოა მომხმარებელი და პაროლი");
      return;
    }
    setErrorMsg("");
    onUpdateEmployee({
      id,
      number: employees.find((e) => e.id === id)?.number || 0,
      name: editName.trim(),
      personalId: editPersonalId,
      position: editPosition,
      specialStatus: editSpecialStatus === "regular" ? null : editSpecialStatus,
      ...(isSeniorRole(editPosition) && { username: editUsername.trim(), password: editPassword }),
    });
    setEditingId(null);
  };


  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
        <div>
          <h2 className="text-lg font-bold text-slate-800">თანამშრომლების მართვა</h2>
          <p className="text-xs text-slate-500">სამედიცინო პერსონალის სიის, პირადი მონაცემებისა და როლების მართვა</p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs flex items-center gap-2 border border-red-100">
          <ShieldAlert size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid Layout: Left is Form to add, Right is current list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ADD EMPLOYEE FORM */}
        <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100 h-fit">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <UserPlus size={16} className="text-sky-600" />
            ახალი თანამშრომლის დამატება
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">სახელი და გვარი</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="მაგ: გიორგი კალანდაძე"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">პირადი ნომერი (11 ციფრი)</label>
              <input
                type="text"
                maxLength={11}
                value={personalId}
                onChange={(e) => setPersonalId(e.target.value.replace(/\D/g, ""))}
                placeholder="მაგ: 01024012345"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">თანამდებობა</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as PositionType)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-sky-500 transition-all font-sans"
              >
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">სპეციალური სტატუსი (შვებულება, დეკრეტული...)</label>
              <select
                value={specialStatus}
                onChange={(e) => setSpecialStatus(e.target.value as SpecialStatusType | "regular")}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-sky-500 transition-all font-sans"
              >
                <option value="regular">თანამშრომელი მუშაობს ჩვეულებრივ რეჟიმში</option>
                {SPECIAL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status} (სრული თვე)
                  </option>
                ))}
              </select>
            </div>

            {isSeniorRole(position) && (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg space-y-3">
                <p className="text-[10px] font-black text-sky-800 uppercase tracking-wider">ადმინ შესვლის კრედენციალები</p>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">მომხმარებლის სახელი</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="მაგ: dr.giorgi"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-sky-500 transition-all font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">პაროლი</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="პაროლი"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-sky-500 transition-all font-mono"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow transition-all"
            >
              <UserPlus size={15} />
              თანამშრომლის დამატება
            </button>
          </form>
        </div>

        {/* EMPLOYEES GRID/LIST */}
        <div className="lg:col-span-2 space-y-3 max-h-[480px] overflow-y-auto pr-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-2">
            <span>სულ: {employees.length} თანამშრომელი</span>
          </div>

          <div className="space-y-2">
            {employees.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">თანამშრომლები არ არის დამატებული</div>
            ) : (
              employees.map((emp) => {
                const isEditing = editingId === emp.id;
                return (
                  <div
                    key={emp.id}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                      isEditing
                        ? "border-sky-200 bg-sky-50/20"
                        : "border-slate-100 bg-white hover:border-slate-200"
                    }`}
                  >
                    {isEditing ? (
                      /* EDITING MODE */
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">სახელი და გვარი</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-slate-800 bg-white focus:outline-none focus:border-sky-500 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">პირადი ნომერი</label>
                          <input
                            type="text"
                            maxLength={11}
                            value={editPersonalId}
                            onChange={(e) => setEditPersonalId(e.target.value.replace(/\D/g, ""))}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-slate-700 bg-white focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">თანამდებობა</label>
                          <select
                            value={editPosition}
                            onChange={(e) => setEditPosition(e.target.value as PositionType)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-slate-800 bg-white focus:outline-none focus:border-sky-500 font-sans"
                          >
                            {POSITIONS.map((pos) => (
                              <option key={pos} value={pos}>
                                {pos}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">თვიური სტატუსი</label>
                          <select
                            value={editSpecialStatus}
                            onChange={(e) => setEditSpecialStatus(e.target.value as SpecialStatusType | "regular")}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-slate-800 bg-white focus:outline-none focus:border-sky-500 font-sans"
                          >
                            <option value="regular">ჩვეულებრივი მუშაობა</option>
                            {SPECIAL_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                        {isSeniorRole(editPosition) && (
                          <>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">მომხმარებლის სახელი</label>
                              <input
                                type="text"
                                value={editUsername}
                                onChange={(e) => setEditUsername(e.target.value)}
                                placeholder="მაგ: dr.giorgi"
                                className="w-full px-2 py-1 border border-sky-200 rounded text-sm text-slate-800 bg-sky-50 focus:outline-none focus:border-sky-500 font-sans"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">პაროლი</label>
                              <input
                                type="password"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                                placeholder="პაროლი"
                                className="w-full px-2 py-1 border border-sky-200 rounded text-sm text-slate-800 bg-sky-50 focus:outline-none focus:border-sky-500 font-mono"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      /* DISPLAY MODE */
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 mt-0.5 shrink-0">
                          {emp.number}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-800">{emp.name}</span>
                            <span className="text-[10px] tracking-wide px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold">
                              {emp.position}
                            </span>
                            {emp.specialStatus && (
                              <span className="text-[10px] tracking-wide px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold animate-pulse">
                                {emp.specialStatus}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-1 font-mono">
                            პირადი №: <span className="text-slate-500">{emp.personalId}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ACTIONS BUTTONS */}
                    <div className="flex items-center justify-end gap-2 shrink-0 md:self-center">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdit(emp.id)}
                            className="p-1.5 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 rounded-lg border border-transparent hover:border-emerald-100 transition-all cursor-pointer"
                            title="შენახვა"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 hover:bg-slate-100 text-slate-450 hover:text-slate-600 rounded-lg border border-transparent transition-all cursor-pointer"
                            title="გაუქმება"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(emp)}
                            className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-sky-600 rounded-lg border border-transparent hover:border-slate-100 transition-all cursor-pointer"
                            title="რედაქტირება"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => onDeleteEmployee(emp.id)}
                            className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg border border-transparent hover:border-red-100 transition-all cursor-pointer"
                            title="წაშლა"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
