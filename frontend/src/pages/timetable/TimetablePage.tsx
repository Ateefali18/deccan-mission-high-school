import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Clock,
  Calendar,
  Layers,
  BookOpen,
  Filter,
  CheckCircle2,
  Printer,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  CalendarCheck,
  AlertTriangle,
  User,
  ShieldAlert,
} from "lucide-react";
import {
  api,
  getStoredCustomTimetable,
  checkTimetableConflicts,
  DEFAULT_BASELINE_TIMETABLE,
} from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import type { SchoolClass, ClassSection } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { useToast } from "../../components/ui/Toast";

interface TimetableSlot {
  id?: string | number;
  period: number;
  time: string;
  start_time?: string;
  end_time?: string;
  subject: string;
  teacher: string;
  teacher_id?: string | number;
  room: string;
  class_id?: string | number;
  class_name?: string;
  section_id?: string | number;
  section_name?: string;
  is_active?: boolean;
}

export const TimetablePage: React.FC = () => {
  const { role, session } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<number | string>("");
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const d = new Date().getDay();
    return d >= 1 && d <= 6 ? d : 1; // 1 = Monday
  });
  const [nextPeriodInfo, setNextPeriodInfo] = useState<{
    status: string;
    message: string;
    current_period?: any;
    next_period?: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = role === "ADMIN";
  const [teachers, setTeachers] = useState<any[]>([]);
  const [customSchedule, setCustomSchedule] = useState<Record<number, any[]>>({});

  // View Filter: "class" | "teacher"
  const [viewMode, setViewMode] = useState<"class" | "teacher">("class");
  const [filterTeacher, setFilterTeacher] = useState<string>("Ateef");

  // Allotment Modal State
  const [isAllotOpen, setIsAllotOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | number | null>(null);
  const [allotDay, setAllotDay] = useState<number>(1);
  const [allotPeriod, setAllotPeriod] = useState<number>(1);
  const [allotTime, setAllotTime] = useState<string>("09:00 - 09:45");
  const [allotSubject, setAllotSubject] = useState<string>("Mathematics");
  const [allotTeacher, setAllotTeacher] = useState<string>("Ateef");
  const [allotRoom, setAllotRoom] = useState<string>("Room 301");
  const [allotClassId, setAllotClassId] = useState<string>("cls_10");
  const [allotSectionId, setAllotSectionId] = useState<string>("sec_10_a");
  const [isSubmittingAllot, setIsSubmittingAllot] = useState(false);

  // Conflict warning state in modal
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Days list
  const days = [
    { id: 1, name: "Monday" },
    { id: 2, name: "Tuesday" },
    { id: 3, name: "Wednesday" },
    { id: 4, name: "Thursday" },
    { id: 5, name: "Friday" },
    { id: 6, name: "Saturday" },
  ];

  const standardTimes: Record<number, string> = {
    1: "09:00 - 09:45",
    2: "09:45 - 10:30",
    3: "10:30 - 11:15",
    4: "11:30 - 12:15",
    5: "12:15 - 01:00",
    6: "01:45 - 02:30",
    7: "02:30 - 03:15",
    8: "03:15 - 04:00",
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const [clsList, nextP, tchRes, sched] = await Promise.all([
          api.classes.list().catch(() => []),
          api.timetable.getNextPeriod().catch(() => null),
          api.teachers.list({ limit: 50 }).catch(() => ({ items: [] })),
          Promise.resolve(getStoredCustomTimetable()),
        ]);

        setClasses(clsList);
        if (clsList.length > 0) {
          setSelectedClassId(clsList[0].id);
          if (clsList[0].sections && clsList[0].sections.length > 0) {
            setSelectedSectionId(clsList[0].sections[0].id);
          }
        }
        if (nextP) setNextPeriodInfo(nextP);
        if (tchRes?.items) setTeachers(tchRes.items);
        if (sched) setCustomSchedule(sched);
      } catch {
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const activeClass = classes.find((c) => String(c.id) === String(selectedClassId));
  const activeSection = activeClass?.sections?.find((s) => String(s.id) === String(selectedSectionId));

  // Determine active slots for display
  const activeSlots = useMemo(() => {
    const daySlots = customSchedule[selectedDay] || DEFAULT_BASELINE_TIMETABLE[selectedDay] || [];
    let filtered = daySlots.filter((s: any) => s.is_active !== false);

    if (viewMode === "class" && activeClass) {
      filtered = filtered.filter(
        (s: any) =>
          s.class_name?.toLowerCase().includes(activeClass.name.toLowerCase()) ||
          String(s.class_id) === String(activeClass.id)
      );
    } else if (viewMode === "teacher" && filterTeacher) {
      filtered = filtered.filter(
        (s: any) =>
          s.teacher?.toLowerCase().includes(filterTeacher.toLowerCase()) ||
          (filterTeacher.toLowerCase() === "ateef" && s.teacher?.toLowerCase().includes("ateef"))
      );
    }

    filtered.sort((a: any, b: any) => a.period - b.period);
    return filtered;
  }, [customSchedule, selectedDay, viewMode, activeClass, filterTeacher]);

  // Live conflict checking inside modal
  useEffect(() => {
    if (!isAllotOpen) {
      setConflictWarning(null);
      return;
    }

    const allotCls = classes.find((c) => String(c.id) === String(allotClassId));
    const allotSec = allotCls?.sections?.find((s) => String(s.id) === String(allotSectionId));

    const check = checkTimetableConflicts({
      day: allotDay,
      period: allotPeriod,
      teacher: allotTeacher,
      class_name: allotCls?.name,
      section_name: allotSec?.name,
      section_id: allotSectionId,
      id: editingSlotId || undefined,
    });

    if (check.hasConflict) {
      setConflictWarning(check.reason || "Assignment conflict detected");
    } else {
      setConflictWarning(null);
    }
  }, [
    isAllotOpen,
    allotDay,
    allotPeriod,
    allotTeacher,
    allotClassId,
    allotSectionId,
    editingSlotId,
    classes,
  ]);

  const handleOpenAllot = (slot?: TimetableSlot) => {
    if (slot) {
      setEditingSlotId(slot.id || null);
      setAllotDay(selectedDay);
      setAllotPeriod(slot.period);
      setAllotTime(slot.time);
      setAllotSubject(slot.subject);
      setAllotTeacher(slot.teacher || "Ateef");
      setAllotRoom(slot.room);
      if (slot.class_id) setAllotClassId(String(slot.class_id));
      if (slot.section_id) setAllotSectionId(String(slot.section_id));
    } else {
      setEditingSlotId(null);
      setAllotDay(selectedDay);
      setAllotPeriod(1);
      setAllotTime(standardTimes[1] || "09:00 - 09:45");
      setAllotSubject("Mathematics");
      setAllotTeacher(teachers[0]?.full_name || "Ateef");
      setAllotRoom("Room 301");
      setAllotClassId(selectedClassId ? String(selectedClassId) : "cls_10");
      setAllotSectionId(selectedSectionId ? String(selectedSectionId) : "sec_10_a");
    }
    setIsAllotOpen(true);
  };

  const handleSaveAllotment = async () => {
    if (conflictWarning) {
      toast.error(conflictWarning);
      return;
    }

    setIsSubmittingAllot(true);
    try {
      const allotCls = classes.find((c) => String(c.id) === String(allotClassId));
      const allotSec = allotCls?.sections?.find((s) => String(s.id) === String(allotSectionId));
      const selectedTch = teachers.find(
        (t) => t.full_name?.toLowerCase() === allotTeacher.toLowerCase()
      );

      await api.timetable.allotSlot({
        id: editingSlotId || undefined,
        day: allotDay,
        period: allotPeriod,
        time: allotTime,
        subject: allotSubject,
        teacher: allotTeacher,
        teacher_id: selectedTch?.id,
        room: allotRoom,
        class_id: allotClassId,
        class_name: allotCls?.name || "Class 10",
        section_id: allotSectionId,
        section_name: allotSec?.name || "A",
      });

      // Update state
      setCustomSchedule(getStoredCustomTimetable());
      toast.success(
        `Period ${allotPeriod} allotted to ${allotTeacher} for ${allotCls?.name || "Class 10"} - Section ${
          allotSec?.name || "A"
        } successfully!`
      );
      setIsAllotOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to allot timetable slot");
    } finally {
      setIsSubmittingAllot(false);
    }
  };

  const handleDeleteSlot = async (slotId: string | number, period: number) => {
    if (!window.confirm(`Are you sure you want to deactivate Period ${period}?`)) return;
    try {
      await api.timetable.deleteSlot(slotId, selectedDay);
      setCustomSchedule(getStoredCustomTimetable());
      toast.success(`Period ${period} deactivated successfully.`);
    } catch (err: any) {
      toast.error("Failed to deactivate slot: " + err.message);
    }
  };

  const handleNavigateToAttendance = (slot: TimetableSlot) => {
    const today = new Date().toISOString().split("T")[0];
    const params = new URLSearchParams({
      class_id: String(slot.class_id || "cls_10"),
      section_id: String(slot.section_id || "sec_10_a"),
      subject_id: "sub_math",
      period: String(slot.period),
      date: today,
      class_name: slot.class_name || "Class 10",
      section_name: slot.section_name || "A",
      subject_name: slot.subject,
      teacher_name: slot.teacher,
    });
    navigate(`/teacher/attendance?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Academic Timetable"
        subtitle="Telangana SSC bell schedule, faculty allocations, and period management"
        action={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => handleOpenAllot()}
              >
                Assign Timetable Slot
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => window.print()}
            >
              Print Schedule
            </Button>
          </div>
        }
      />

      {/* Real-time Bell Status Ribbon */}
      <Card className="p-5 bg-gradient-to-r from-brand-navy/5 via-brand-blue/10 to-brand-navy/5 border border-brand-blue/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-brand-navy text-white font-bold shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-light-primary dark:text-dark-primary">
                  Official School Bell & Timetable Synchronizer
                </h4>
                <Badge variant="primary" size="sm">Asia/Kolkata (IST)</Badge>
              </div>
              <p className="text-xs text-light-secondary dark:text-dark-secondary mt-1">
                {nextPeriodInfo?.message || "Academic Hours: 09:00 AM – 04:00 PM IST (Periods 1 to 8)."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl p-1 bg-gray-100 dark:bg-dark-elevated border border-light-border dark:border-dark-border text-xs">
              <button
                type="button"
                onClick={() => setViewMode("class")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  viewMode === "class"
                    ? "bg-brand-navy text-white shadow-xs"
                    : "text-light-secondary dark:text-dark-secondary"
                }`}
              >
                By Class & Section
              </button>
              <button
                type="button"
                onClick={() => setViewMode("teacher")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  viewMode === "teacher"
                    ? "bg-brand-navy text-white shadow-xs"
                    : "text-light-secondary dark:text-dark-secondary"
                }`}
              >
                By Faculty
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Filters: Day of Week & Scope */}
      <Card className="p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
        {/* Day Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-light-border dark:border-dark-border mb-4">
          {days.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDay(d.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedDay === d.id
                  ? "bg-brand-navy text-white shadow-md ring-2 ring-brand-navy/30"
                  : "bg-gray-100 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary hover:bg-gray-200"
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>

        {/* Dynamic Selector Based on View Mode */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          {viewMode === "class" ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 font-semibold text-light-secondary dark:text-dark-secondary">
                <Layers className="w-4 h-4 text-brand-blue" />
                <span>Class:</span>
              </div>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-elevated font-bold text-xs"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 font-semibold text-light-secondary dark:text-dark-secondary">
                <span>Section:</span>
              </div>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-elevated font-bold text-xs"
              >
                {activeClass?.sections?.map((s) => (
                  <option key={s.id} value={s.id}>
                    Section {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 font-semibold text-light-secondary dark:text-dark-secondary">
                <User className="w-4 h-4 text-brand-blue" />
                <span>Select Faculty:</span>
              </div>
              <select
                value={filterTeacher}
                onChange={(e) => setFilterTeacher(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-elevated font-bold text-xs"
              >
                <option value="Ateef">Ateef (Senior Mathematics Faculty)</option>
                <option value="STA Khadri">STA Khadri (Administrator)</option>
                <option value="Mrs. Fatima Zahra">Mrs. Fatima Zahra</option>
                <option value="Dr. Mohammed Tariq">Dr. Mohammed Tariq</option>
                {teachers
                  .filter((t) => !["Ateef", "STA Khadri", "Mrs. Fatima Zahra", "Dr. Mohammed Tariq"].includes(t.full_name))
                  .map((t) => (
                    <option key={t.id} value={t.full_name}>
                      {t.full_name} ({t.employee_id})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="text-xs text-light-secondary dark:text-dark-secondary font-medium">
            Showing {activeSlots.length} allocated periods for {days.find((d) => d.id === selectedDay)?.name}
          </div>
        </div>
      </Card>

      {/* Period Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5 h-44 animate-pulse bg-gray-100 dark:bg-dark-card" />
          ))}
        </div>
      ) : activeSlots.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeSlots.map((slot: any) => (
            <Card
              key={slot.id || `slot-${slot.period}`}
              className="p-5 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border hover:border-brand-blue/50 transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-brand-navy text-white shadow-xs">
                    Period {slot.period}
                  </span>
                  <span className="text-[11px] font-semibold text-light-secondary dark:text-dark-secondary">
                    {slot.time}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-light-primary dark:text-dark-primary mt-2">
                  {slot.subject}
                </h3>

                <div className="mt-2 space-y-1 text-xs text-light-secondary dark:text-dark-secondary">
                  <p>
                    Class: <strong className="text-light-primary dark:text-dark-primary">{slot.class_name || activeClass?.name || "Class 10"} - Sec {slot.section_name || activeSection?.name || "A"}</strong>
                  </p>
                  <p>
                    Faculty: <strong className="text-brand-blue dark:text-dark-accent">{slot.teacher}</strong>
                  </p>
                  <p>Room: {slot.room || "Room 301"}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-light-border/70 dark:border-dark-border/70 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold"
                  leftIcon={<CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  onClick={() => handleNavigateToAttendance(slot)}
                >
                  Roll Call
                </Button>

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenAllot(slot)}
                      className="p-1.5 rounded-lg text-light-secondary hover:text-brand-blue hover:bg-gray-100 dark:hover:bg-dark-elevated"
                      title="Edit Period Assignment"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(slot.id || `slot-${selectedDay}-${slot.period}`, slot.period)}
                      className="p-1.5 rounded-lg text-light-secondary hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                      title="Deactivate Period Slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center bg-gray-50/50 dark:bg-dark-card/50 border border-dashed">
          <Clock className="w-10 h-10 text-light-secondary dark:text-dark-secondary mx-auto mb-2 opacity-50" />
          <h3 className="text-sm font-bold text-light-primary dark:text-dark-primary">
            No Timetable Slots Allocated For This Selection
          </h3>
          <p className="text-xs text-light-secondary dark:text-dark-secondary mt-1 max-w-sm mx-auto">
            Use the "Assign Timetable Slot" button above to allocate periods to teachers, classes, and subjects.
          </p>
        </Card>
      )}

      {/* Allotment & Edit Modal (Admin Feature) */}
      <Dialog
        isOpen={isAllotOpen}
        onClose={() => setIsAllotOpen(false)}
        title={editingSlotId ? `Edit Period ${allotPeriod} Timetable Assignment` : `Assign New Timetable Slot`}
        description="Allocate class, section, subject, faculty, period number, and start/end times with conflict detection."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAllotOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveAllotment}
              isLoading={isSubmittingAllot}
              disabled={Boolean(conflictWarning)}
            >
              Save Timetable Slot
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          {/* Conflict Alert Warning */}
          {conflictWarning && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Schedule Conflict Detected</p>
                <p className="mt-0.5">{conflictWarning}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-light-secondary dark:text-dark-secondary">
                Day of Week
              </label>
              <select
                value={allotDay}
                onChange={(e) => setAllotDay(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs text-light-primary dark:text-dark-primary focus:border-brand-blue focus:outline-none"
              >
                {days.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-light-secondary dark:text-dark-secondary">
                Period Number
              </label>
              <select
                value={allotPeriod}
                onChange={(e) => {
                  const p = Number(e.target.value);
                  setAllotPeriod(p);
                  if (standardTimes[p]) setAllotTime(standardTimes[p]);
                }}
                className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs text-light-primary dark:text-dark-primary focus:border-brand-blue focus:outline-none"
              >
                {Array.from({ length: 8 }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>Period {p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-light-secondary dark:text-dark-secondary">
                Class
              </label>
              <select
                value={allotClassId}
                onChange={(e) => {
                  setAllotClassId(e.target.value);
                  const cls = classes.find((c) => String(c.id) === e.target.value);
                  if (cls?.sections && cls.sections.length > 0) {
                    setAllotSectionId(String(cls.sections[0].id));
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs text-light-primary dark:text-dark-primary focus:border-brand-blue focus:outline-none"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-light-secondary dark:text-dark-secondary">
                Section
              </label>
              <select
                value={allotSectionId}
                onChange={(e) => setAllotSectionId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs text-light-primary dark:text-dark-primary focus:border-brand-blue focus:outline-none"
              >
                {classes.find((c) => String(c.id) === String(allotClassId))?.sections?.map((s) => (
                  <option key={s.id} value={s.id}>Section {s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-light-secondary dark:text-dark-secondary">
                Subject
              </label>
              <select
                value={allotSubject}
                onChange={(e) => setAllotSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs text-light-primary dark:text-dark-primary focus:border-brand-blue focus:outline-none"
              >
                <option value="Mathematics">Mathematics</option>
                <option value="General Science (Physics)">General Science (Physics)</option>
                <option value="General Science (Chemistry)">General Science (Chemistry)</option>
                <option value="General Science (Biology)">General Science (Biology)</option>
                <option value="English Core">English Core</option>
                <option value="Social Science (History)">Social Science (History)</option>
                <option value="Social Science (Geography)">Social Science (Geography)</option>
                <option value="Second Language (Hindi/Urdu)">Second Language (Hindi/Urdu)</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Physical Education">Physical Education</option>
                <option value="Library & Self-Study">Library & Self-Study</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-light-secondary dark:text-dark-secondary">
                Assigned Faculty Member
              </label>
              <select
                value={allotTeacher}
                onChange={(e) => setAllotTeacher(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs text-light-primary dark:text-dark-primary focus:border-brand-blue focus:outline-none"
              >
                <option value="Ateef">Ateef (Senior Mathematics Faculty)</option>
                <option value="STA Khadri">STA Khadri (Administrator / Principal)</option>
                <option value="Mrs. Fatima Zahra">Mrs. Fatima Zahra</option>
                <option value="Dr. Mohammed Tariq">Dr. Mohammed Tariq</option>
                <option value="Dr. K. R. Ahmed">Dr. K. R. Ahmed (Science)</option>
                <option value="Amina Begum">Amina Begum (English)</option>
                <option value="Mohsin Khan">Mohsin Khan (Social Science)</option>
                <option value="Rashid Ali">Rashid Ali (Languages)</option>
                <option value="Zainab Fatima">Zainab Fatima (Computer)</option>
                {teachers
                  .filter((t) => !["Ateef", "STA Khadri", "Mrs. Fatima Zahra", "Dr. Mohammed Tariq", "Dr. K. R. Ahmed", "Amina Begum", "Mohsin Khan", "Rashid Ali", "Zainab Fatima"].includes(t.full_name))
                  .map((t) => (
                    <option key={t.id} value={t.full_name}>
                      {t.full_name} ({t.employee_id})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-light-secondary dark:text-dark-secondary">
                Time Window
              </label>
              <Input
                value={allotTime}
                onChange={(e) => setAllotTime(e.target.value)}
                placeholder="e.g. 09:00 - 09:45"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-light-secondary dark:text-dark-secondary">
                Room / Location
              </label>
              <Input
                value={allotRoom}
                onChange={(e) => setAllotRoom(e.target.value)}
                placeholder="e.g. Room 301, Lab A"
              />
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default TimetablePage;
