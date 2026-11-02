import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { api, getStoredCustomTimetable } from "../../services/api";
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
  period: number;
  time: string;
  subject: string;
  teacher: string;
  room: string;
}

export const TimetablePage: React.FC = () => {
  const { role } = useAuth();
  const toast = useToast();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<number | string>("");
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay() || 1); // 1 = Monday
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

  // Allotment Modal State
  const [isAllotOpen, setIsAllotOpen] = useState(false);
  const [allotPeriod, setAllotPeriod] = useState<number>(1);
  const [allotTime, setAllotTime] = useState<string>("09:00 - 09:45");
  const [allotSubject, setAllotSubject] = useState<string>("Mathematics");
  const [allotTeacher, setAllotTeacher] = useState<string>("Ateef");
  const [allotRoom, setAllotRoom] = useState<string>("Room 301");
  const [isSubmittingAllot, setIsSubmittingAllot] = useState(false);


  // Days list
  const days = [
    { id: 1, name: "Monday" },
    { id: 2, name: "Tuesday" },
    { id: 3, name: "Wednesday" },
    { id: 4, name: "Thursday" },
    { id: 5, name: "Friday" },
    { id: 6, name: "Saturday" },
  ];

  // Standard SSC master schedule template for DMHS
  const standardPeriods: Record<number, TimetableSlot[]> = {
    1: [
      { period: 1, time: "09:00 - 09:45", subject: "Mathematics", teacher: "Fatima Zahra", room: "Room 301" },
      { period: 2, time: "09:45 - 10:30", subject: "General Science (Physics)", teacher: "Dr. K. R. Ahmed", room: "Lab A" },
      { period: 3, time: "10:30 - 11:15", subject: "English Core", teacher: "Amina Begum", room: "Room 301" },
      { period: 4, time: "11:30 - 12:15", subject: "Social Science (History)", teacher: "Mohsin Khan", room: "Room 301" },
      { period: 5, time: "12:15 - 01:00", subject: "Second Language (Hindi/Urdu)", teacher: "Rashid Ali", room: "Room 301" },
      { period: 6, time: "01:45 - 02:30", subject: "Computer Science", teacher: "Zainab Fatima", room: "Computer Lab" },
      { period: 7, time: "02:30 - 03:15", subject: "Physical Education", teacher: "Coach Vikram", room: "Playground" },
      { period: 8, time: "03:15 - 04:00", subject: "Library & Self-Study", teacher: "Librarian", room: "Central Library" },
    ],
    2: [
      { period: 1, time: "09:00 - 09:45", subject: "English Core", teacher: "Amina Begum", room: "Room 301" },
      { period: 2, time: "09:45 - 10:30", subject: "Mathematics", teacher: "Fatima Zahra", room: "Room 301" },
      { period: 3, time: "10:30 - 11:15", subject: "General Science (Chemistry)", teacher: "Dr. K. R. Ahmed", room: "Lab B" },
      { period: 4, time: "11:30 - 12:15", subject: "Social Science (Geography)", teacher: "Mohsin Khan", room: "Room 301" },
      { period: 5, time: "12:15 - 01:00", subject: "Second Language", teacher: "Rashid Ali", room: "Room 301" },
      { period: 6, time: "01:45 - 02:30", subject: "Mathematics Tutorial", teacher: "Fatima Zahra", room: "Room 301" },
      { period: 7, time: "02:30 - 03:15", subject: "Art & Craft", teacher: "Mrs. Shobha", room: "Art Studio" },
      { period: 8, time: "03:15 - 04:00", subject: "Moral Science & Value Ed", teacher: "Dr. K. R. Ahmed", room: "Room 301" },
    ],
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const [clsList, nextP] = await Promise.all([
          api.classes.list().catch(() => []),
          api.timetable.getNextPeriod().catch(() => null),
        ]);
        setClasses(clsList);
        if (clsList.length > 0) {
          setSelectedClassId(clsList[0].id);
          if (clsList[0].sections && clsList[0].sections.length > 0) {
            setSelectedSectionId(clsList[0].sections[0].id);
          }
        }
        if (nextP) setNextPeriodInfo(nextP);
        // Fetch teachers list & custom timetable
        const [tchRes, sched] = await Promise.all([
          api.teachers.list({ limit: 50 }).catch(() => ({ items: [] })),
          Promise.resolve(getStoredCustomTimetable()),
        ]);
        if (tchRes?.items) setTeachers(tchRes.items);
        if (sched) setCustomSchedule(sched);

      } catch {
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const customDaySlots = customSchedule[selectedDay] || [];
  const baseSlots = standardPeriods[selectedDay] || standardPeriods[1];
  const activeSlots = baseSlots.map((slot) => {
    const override = customDaySlots.find((c: any) => c.period === slot.period);
    return override ? { ...slot, ...override } : slot;
  });

  const handleOpenAllot = (slot?: TimetableSlot) => {
    if (slot) {
      setAllotPeriod(slot.period);
      setAllotTime(slot.time);
      setAllotSubject(slot.subject);
      setAllotTeacher(slot.teacher || (teachers[0]?.full_name || "Ateef"));
      setAllotRoom(slot.room);
    } else {
      setAllotPeriod(1);
      setAllotTime("09:00 - 09:45");
      setAllotSubject("Mathematics");
      setAllotTeacher(teachers[0]?.full_name || "Ateef");
      setAllotRoom("Room 301");
    }
    setIsAllotOpen(true);
  };

  const handleSaveAllotment = async () => {
    setIsSubmittingAllot(true);
    try {
      const selectedTch = teachers.find((t) => t.full_name === allotTeacher);
      await api.timetable.allotSlot({
        day: selectedDay,
        period: allotPeriod,
        time: allotTime,
        subject: allotSubject,
        teacher: allotTeacher,
        teacher_id: selectedTch?.id,
        room: allotRoom,
        class_name: activeClass?.name || "Class 10",
        section_name: activeSection?.name || "A",
      });

      // Also assign class to teacher if matched
      if (selectedTch) {
        await api.teachers.assignClass(selectedTch.id, {
          class_name: activeClass?.name || "Class 10",
          section_name: activeSection?.name || "A",
          subject_name: allotSubject,
          role_type: "Subject Teacher",
        }).catch(() => {});
      }

      setCustomSchedule(getStoredCustomTimetable());
      toast.success(`Period ${allotPeriod} allotted to Teacher ${allotTeacher} for ${activeClass?.name || "Class"}!`);
      setIsAllotOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to allot timetable slot");
    } finally {
      setIsSubmittingAllot(false);
    }
  };

  const activeClass = classes.find((c) => String(c.id) === String(selectedClassId));
  const activeSection = activeClass?.sections?.find((s) => String(s.id) === String(selectedSectionId));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Academic Timetable"
        subtitle="Telangana SSC bell schedule, daily room allocations, and period timings"
                action={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => handleOpenAllot()}
              >
                Allot Timetable Slot
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
      <Card className="p-5 bg-gradient-to-r from-brand-navy/5 via-brand-gold/10 to-brand-navy/5 border border-brand-gold/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-brand-gold text-brand-navy font-bold shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-light-primary dark:text-dark-primary">
                  Official School Clock & Timetable Synchronizer
                </h4>
                <Badge variant="gold" size="sm">Asia/Kolkata (IST)</Badge>
              </div>
              <p className="text-xs text-light-secondary dark:text-dark-secondary mt-1">
                {nextPeriodInfo?.message || "Operating within official academic hours (09:00 AM – 04:00 PM IST)."}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Class, Section, & Day Filter */}
      <div className="p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 font-semibold text-light-secondary dark:text-dark-secondary">
            <Layers className="w-4 h-4 text-brand-gold" />
            <span>Class:</span>
          </div>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              const found = classes.find((c) => String(c.id) === e.target.value);
              if (found && found.sections && found.sections.length > 0) {
                setSelectedSectionId(found.sections[0].id);
              }
            }}
            className="px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary focus:border-brand-gold focus:outline-none"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {activeClass?.sections && activeClass.sections.length > 0 && (
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary focus:border-brand-gold focus:outline-none"
            >
              {activeClass.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Day of Week Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {days.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDay(d.id)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                selectedDay === d.id
                  ? "bg-brand-gold text-brand-navy shadow-xs"
                  : "bg-gray-100 dark:bg-dark-elevated text-light-secondary hover:text-brand-gold"
              }`}
            >
              {d.name.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-light-border dark:border-dark-border bg-gray-50/70 dark:bg-dark-elevated/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-gold" />
            <h3 className="text-sm font-bold text-light-primary dark:text-dark-primary">
              Schedule for {activeClass?.name || "Class"} {activeSection ? `- Section ${activeSection.name}` : ""} (
              {days.find((d) => d.id === selectedDay)?.name})
            </h3>
          </div>
          <span className="text-xs font-mono text-light-secondary dark:text-dark-secondary">
            8 Periods • 45 Mins Each
          </span>
        </div>

        <div className="divide-y divide-light-border dark:divide-dark-border">
          {activeSlots.map((slot) => (
            <div
              key={slot.period}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-dark-elevated/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-gold/15 border border-brand-gold/30 text-brand-gold flex flex-col items-center justify-center shrink-0">
                  <span className="text-[9px] font-mono uppercase tracking-wider">P</span>
                  <span className="text-sm font-bold leading-none">{slot.period}</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-light-primary dark:text-dark-primary flex items-center gap-2">
                    <span>{slot.subject}</span>
                    <Badge variant="neutral" size="sm">{slot.room}</Badge>
                  </h4>
                  <p className="text-[11px] text-light-secondary dark:text-dark-secondary mt-0.5">
                    Faculty: <span className="font-medium text-light-primary dark:text-dark-primary">{slot.teacher}</span>
                  </p>
                </div>
              </div>

                            <div className="flex items-center gap-2 sm:text-right text-xs">
                <div className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-elevated font-mono font-semibold text-light-secondary dark:text-dark-secondary">
                  {slot.time}
                </div>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenAllot(slot)}
                    className="text-brand-gold border-brand-gold/40 hover:bg-brand-gold/10"
                    leftIcon={<Edit2 className="w-3.5 h-3.5 text-brand-gold" />}
                  >
                    Allot / Edit
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
          {/* Allot Timetable Period Dialog */}
      <Dialog
        isOpen={isAllotOpen}
        onClose={() => setIsAllotOpen(false)}
        title="Allot Timetable Period & Class to Faculty"
        description={`Configure period slot for ${activeClass?.name || "Class"} ${activeSection ? `- Section ${activeSection.name}` : ""} on ${days.find((d) => d.id === selectedDay)?.name}`}
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAllotOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveAllotment}
              isLoading={isSubmittingAllot}
            >
              Save & Allot Slot
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-light-secondary dark:text-dark-secondary">
                Period Number
              </label>
              <select
                value={allotPeriod}
                onChange={(e) => {
                  const p = Number(e.target.value);
                  setAllotPeriod(p);
                  const times = [
                    "09:00 - 09:45",
                    "09:45 - 10:30",
                    "10:30 - 11:15",
                    "11:30 - 12:15",
                    "12:15 - 01:00",
                    "01:45 - 02:30",
                    "02:30 - 03:15",
                    "03:15 - 04:00",
                  ];
                  if (times[p - 1]) setAllotTime(times[p - 1]);
                }}
                className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs text-light-primary dark:text-dark-primary focus:border-brand-gold focus:outline-none"
              >
                {Array.from({ length: 8 }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>Period {p}</option>
                ))}
              </select>
            </div>

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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-light-secondary dark:text-dark-secondary">
                Subject
              </label>
              <select
                value={allotSubject}
                onChange={(e) => setAllotSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs text-light-primary dark:text-dark-primary focus:border-brand-gold focus:outline-none"
              >
                <option value="Mathematics">Mathematics</option>
                <option value="General Science (Physics)">General Science (Physics)</option>
                <option value="General Science (Chemistry)">General Science (Chemistry)</option>
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
                className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs text-light-primary dark:text-dark-primary focus:border-brand-gold focus:outline-none"
              >
                <option value="Ateef">Ateef (EMP-ATEEF)</option>
                <option value="STA Khadri">STA Khadri (Principal / Admin)</option>
                <option value="Mrs. Fatima Zahra">Mrs. Fatima Zahra (EMP-1001)</option>
                <option value="Dr. Mohammed Tariq">Dr. Mohammed Tariq (EMP-1002)</option>
                <option value="Sana Fatima">Sana Fatima (EMP-1003)</option>
                {teachers
                  .filter((t) => !["Ateef", "STA Khadri", "Mrs. Fatima Zahra", "Dr. Mohammed Tariq", "Sana Fatima"].includes(t.full_name))
                  .map((t) => (
                    <option key={t.id} value={t.full_name}>
                      {t.full_name} ({t.employee_id})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-light-secondary dark:text-dark-secondary">
              Room / Location
            </label>
            <Input
              value={allotRoom}
              onChange={(e) => setAllotRoom(e.target.value)}
              placeholder="e.g. Room 301, Lab A, Computer Lab"
            />
          </div>
        </div>
      </Dialog>

    </div>
  );
};
