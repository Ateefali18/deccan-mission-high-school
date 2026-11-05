with open("frontend/src/services/supabaseService.ts", "r", encoding="utf-8") as f:
    content = f.read()

target = """      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },
  },

  // --------------------------------------------------------------------------
  // CLASSES & SECTIONS"""

replacement = """      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },

    async update(id: string | number, payload: Partial<{
      name: string;
      start_date: string;
      end_date: string;
      is_current: boolean;
      status: string;
    }>): Promise<AcademicYear> {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      if (payload.is_current) {
        await supabase.from("academic_years").update({ is_current: false }).neq("id", id);
      }
      const { data, error } = await supabase
        .from("academic_years")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },

    async setCurrent(id: string | number): Promise<AcademicYear> {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      await supabase.from("academic_years").update({ is_current: false }).neq("id", id);
      const { data, error } = await supabase
        .from("academic_years")
        .update({ is_current: true, status: "active" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },
  },

  // --------------------------------------------------------------------------
  // CLASSES & SECTIONS"""

content_norm = content.replace("\r\n", "\n")
target_norm = target.replace("\r\n", "\n")
replacement_norm = replacement.replace("\r\n", "\n")

if target_norm in content_norm:
    new_content = content_norm.replace(target_norm, replacement_norm, 1)
    with open("frontend/src/services/supabaseService.ts", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("SUCCESS: updated supabaseService.ts")
else:
    print("ERROR: target not found in supabaseService.ts")
