with open("frontend/src/services/api.ts", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add baseline and helper functions before BASELINE_TEACHERS
target1 = """const BASELINE_TEACHERS: TeacherListItem[] = ["""

addition1 = """const DEFAULT_BASELINE_ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: 1,
    school_id: 1,
    name: "2026-2027",
    start_date: "2026-06-01",
    end_date: "2027-04-30",
    is_current: true,
    status: "active",
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: 2,
    school_id: 1,
    name: "2025-2026",
    start_date: "2025-06-01",
    end_date: "2026-04-30",
    is_current: false,
    status: "completed",
    created_at: "2025-06-01T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
  },
];

export const getStoredAcademicYears = (): AcademicYear[] => {
  try {
    if (typeof localStorage === "undefined") return DEFAULT_BASELINE_ACADEMIC_YEARS;
    const raw = localStorage.getItem("dmhs_academic_years");
    if (!raw) {
      localStorage.setItem("dmhs_academic_years", JSON.stringify(DEFAULT_BASELINE_ACADEMIC_YEARS));
      return DEFAULT_BASELINE_ACADEMIC_YEARS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_BASELINE_ACADEMIC_YEARS;
  } catch {
    return DEFAULT_BASELINE_ACADEMIC_YEARS;
  }
};

export const saveStoredAcademicYear = (ay: Partial<AcademicYear>): AcademicYear => {
  const current = getStoredAcademicYears();
  let updated = current;
  if (ay.is_current) {
    updated = updated.map((y) => ({ ...y, is_current: false }));
  }
  const newId = Date.now();
  const newYear: AcademicYear = {
    id: newId,
    school_id: 1,
    name: ay.name || "",
    start_date: ay.start_date || "",
    end_date: ay.end_date || "",
    is_current: ay.is_current ?? false,
    status: ay.status || "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  updated = [newYear, ...updated];
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("dmhs_academic_years", JSON.stringify(updated));
  }
  return newYear;
};

export const updateStoredAcademicYear = (id: string | number, ay: Partial<AcademicYear>): AcademicYear => {
  let current = getStoredAcademicYears();
  if (ay.is_current) {
    current = current.map((y) => ({ ...y, is_current: false }));
  }
  let updatedItem: AcademicYear | null = null;
  current = current.map((y) => {
    if (String(y.id) === String(id)) {
      updatedItem = {
        ...y,
        ...ay,
        updated_at: new Date().toISOString(),
      };
      return updatedItem;
    }
    return y;
  });
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("dmhs_academic_years", JSON.stringify(current));
  }
  return updatedItem || (current[0] as AcademicYear);
};

export const setStoredCurrentAcademicYear = (id: string | number): AcademicYear => {
  let current = getStoredAcademicYears();
  let updatedItem: AcademicYear | null = null;
  current = current.map((y) => {
    if (String(y.id) === String(id)) {
      updatedItem = {
        ...y,
        is_current: true,
        status: "active",
        updated_at: new Date().toISOString(),
      };
      return updatedItem;
    }
    return { ...y, is_current: false };
  });
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("dmhs_academic_years", JSON.stringify(current));
  }
  return updatedItem || (current[0] as AcademicYear);
};

const BASELINE_TEACHERS: TeacherListItem[] = ["""

# 2. Replace academicYears object
target2 = """  academicYears: {
    list: async (): Promise<AcademicYear[]> => {
      try {
        return await request<AcademicYear[]>("/academic-years/");
      } catch (err) {
        if (isSupabaseConfigured()) {
          return supabaseService.academicYears.list();
        }
        throw err;
      }
    },
    create: async (data: { name: string; start_date: string; end_date: string; is_current: boolean; status: string }) => {
      try {
        return await request<AcademicYear>("/academic-years/", {
          method: "POST",
          body: JSON.stringify(data),
        });
      } catch (err) {
        if (isSupabaseConfigured()) {
          return supabaseService.academicYears.create(data);
        }
        throw err;
      }
    },
  },"""

replacement2 = """  academicYears: {
    list: async (): Promise<AcademicYear[]> => {
      let remote: AcademicYear[] = [];
      try {
        remote = await request<AcademicYear[]>("/academic-years/");
      } catch (err) {
        if (isSupabaseConfigured()) {
          try {
            remote = await supabaseService.academicYears.list();
          } catch {}
        }
      }
      if (remote && remote.length > 0) {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("dmhs_academic_years", JSON.stringify(remote));
        }
        return remote;
      }
      return getStoredAcademicYears();
    },

    getCurrent: async (): Promise<AcademicYear | null> => {
      const all = await api.academicYears.list();
      return all.find((y) => y.is_current) || all[0] || null;
    },

    create: async (data: { name: string; start_date: string; end_date: string; is_current: boolean; status: string }) => {
      assertAdminRole();
      const all = await api.academicYears.list();
      if (all.some((y) => y.name.trim().toLowerCase() === data.name.trim().toLowerCase())) {
        throw new ApiError(`Academic session "${data.name}" already exists.`, 400);
      }
      if (new Date(data.end_date) <= new Date(data.start_date)) {
        throw new ApiError("End date must be after start date.", 400);
      }

      try {
        const res = await request<AcademicYear>("/academic-years/", {
          method: "POST",
          body: JSON.stringify(data),
        });
        saveStoredAcademicYear(res);
        return res;
      } catch (err) {
        if (isSupabaseConfigured()) {
          try {
            const res = await supabaseService.academicYears.create(data);
            saveStoredAcademicYear(res);
            return res;
          } catch (sbErr: any) {
            console.warn("Supabase academic_years create fallback:", sbErr);
          }
        }
        return saveStoredAcademicYear(data);
      }
    },

    update: async (id: string | number, data: Partial<{ name: string; start_date: string; end_date: string; is_current: boolean; status: string }>) => {
      assertAdminRole();
      if (data.start_date && data.end_date && new Date(data.end_date) <= new Date(data.start_date)) {
        throw new ApiError("End date must be after start date.", 400);
      }
      try {
        const res = await request<AcademicYear>(`/academic-years/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        updateStoredAcademicYear(id, res);
        return res;
      } catch (err) {
        if (isSupabaseConfigured()) {
          try {
            const res = await supabaseService.academicYears.update(id, data);
            updateStoredAcademicYear(id, res);
            return res;
          } catch (sbErr: any) {
            console.warn("Supabase academic_years update fallback:", sbErr);
          }
        }
        return updateStoredAcademicYear(id, data);
      }
    },

    setCurrent: async (id: string | number) => {
      assertAdminRole();
      try {
        const res = await request<AcademicYear>(`/academic-years/${id}/set-current`, {
          method: "PUT",
        });
        setStoredCurrentAcademicYear(id);
        return res;
      } catch (err) {
        if (isSupabaseConfigured()) {
          try {
            const res = await supabaseService.academicYears.setCurrent(id);
            setStoredCurrentAcademicYear(id);
            return res;
          } catch (sbErr: any) {
            console.warn("Supabase academic_years setCurrent fallback:", sbErr);
          }
        }
        return setStoredCurrentAcademicYear(id);
      }
    },
  },"""

content_norm = content.replace("\r\n", "\n")
target1_norm = target1.replace("\r\n", "\n")
addition1_norm = addition1.replace("\r\n", "\n")
target2_norm = target2.replace("\r\n", "\n")
replacement2_norm = replacement2.replace("\r\n", "\n")

assert target1_norm in content_norm, "Target 1 not found"
content_norm = content_norm.replace(target1_norm, addition1_norm, 1)

assert target2_norm in content_norm, "Target 2 not found"
content_norm = content_norm.replace(target2_norm, replacement2_norm, 1)

with open("frontend/src/services/api.ts", "w", encoding="utf-8") as f:
    f.write(content_norm)

print("SUCCESS: updated frontend/src/services/api.ts")
