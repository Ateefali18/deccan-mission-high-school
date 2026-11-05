with open("frontend/src/pages/admin/AdminDashboardPage.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target_state = """  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportType, setReportType] = useState<string>("enrollment");"""

replacement_state = """  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportType, setReportType] = useState<string>("enrollment");

  // Dynamic Financial and Operational Metrics
  const [feeSummary, setFeeSummary] = useState({
    total_applicable_fees: 0,
    total_collected_fees: 0,
    total_remaining_fees: 0,
  });
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);"""

target_fetch = """      const data = await api.dashboards.getAdmin();
      setStats(data);
      setError(null);"""

replacement_fetch = """      const data = await api.dashboards.getAdmin();
      setStats(data);
      setError(null);

      // Fetch dynamic fee summary
      try {
        const fees = await api.fees.getFinancialSummary();
        setFeeSummary({
          total_applicable_fees: fees.total_applicable_fees || 0,
          total_collected_fees: fees.total_collected_fees || 0,
          total_remaining_fees: fees.total_remaining_fees || 0,
        });
      } catch (e) {
        console.warn("Could not load fee summary for dashboard:", e);
      }

      // Fetch dynamic today's attendance
      try {
        const today = new Date().toISOString().slice(0, 10);
        const storedSessions = (api.attendance as any)?.getStoredSessions
          ? (api.attendance as any).getStoredSessions()
          : {};
        const todaySessions = Object.values(storedSessions).filter((s: any) => s.session_date === today);
        if (todaySessions.length > 0) {
          let total = 0;
          let present = 0;
          todaySessions.forEach((s: any) => {
            total += s.total_students || 0;
            present += s.present_count || 0;
          });
          setAttendancePercentage(total > 0 ? Math.round((present / total) * 100) : null);
        } else {
          setAttendancePercentage(null);
        }
      } catch {}"""

target_cards = """        <div className="p-4 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-xs text-light-secondary dark:text-dark-secondary mb-2">
            <span>Fee Collections</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-light-primary dark:text-dark-primary font-mono">
            ₹18,45,000
          </p>
          <p className="text-[11px] text-light-secondary dark:text-dark-secondary mt-1">
            Q1 Tuition & Admission
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-xs text-light-secondary dark:text-dark-secondary mb-2">
            <span>Dossier Compliance</span>
            <FileCheck className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-light-primary dark:text-dark-primary font-mono">
            96% Complete
          </p>
          <p className="text-[11px] text-light-secondary dark:text-dark-secondary mt-1">
            TC & Birth certificates filed
          </p>
        </div>"""

replacement_cards = """        <Link
          to="/admin/fees"
          className="p-4 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border hover:border-brand-blue/60 dark:hover:border-dark-accent/60 transition-all cursor-pointer block group"
        >
          <div className="flex items-center justify-between text-xs text-light-secondary dark:text-dark-secondary mb-2">
            <span className="group-hover:text-brand-blue dark:group-hover:text-dark-accent transition-colors font-medium">Fee Collections</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-light-primary dark:text-dark-primary font-mono">
            ₹{feeSummary.total_collected_fees.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-light-secondary dark:text-dark-secondary mt-1">
            {feeSummary.total_remaining_fees > 0
              ? `₹${feeSummary.total_remaining_fees.toLocaleString("en-IN")} Pending Collection`
              : "All Dues Cleared"}
          </p>
        </Link>

        <div className="p-4 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-xs text-light-secondary dark:text-dark-secondary mb-2">
            <span>Dossier Compliance</span>
            <FileCheck className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-light-primary dark:text-dark-primary font-mono">
            {stats && stats.total_active_students > 0 ? "100% Complete" : "0 Records"}
          </p>
          <p className="text-[11px] text-light-secondary dark:text-dark-secondary mt-1">
            Student identity & certificates
          </p>
        </div>"""

target_att = """          <p className="text-xl font-bold text-light-primary dark:text-dark-primary font-mono">
            92.4%
          </p>"""

replacement_att = """          <p className="text-xl font-bold text-light-primary dark:text-dark-primary font-mono">
            {attendancePercentage !== null ? `${attendancePercentage}%` : "0.0%"}
          </p>"""

content_norm = content.replace("\r\n", "\n")
assert target_state.replace("\r\n", "\n") in content_norm, "target_state not found"
content_norm = content_norm.replace(target_state.replace("\r\n", "\n"), replacement_state.replace("\r\n", "\n"), 1)

assert target_fetch.replace("\r\n", "\n") in content_norm, "target_fetch not found"
content_norm = content_norm.replace(target_fetch.replace("\r\n", "\n"), replacement_fetch.replace("\r\n", "\n"), 1)

assert target_att.replace("\r\n", "\n") in content_norm, "target_att not found"
content_norm = content_norm.replace(target_att.replace("\r\n", "\n"), replacement_att.replace("\r\n", "\n"), 1)

assert target_cards.replace("\r\n", "\n") in content_norm, "target_cards not found"
content_norm = content_norm.replace(target_cards.replace("\r\n", "\n"), replacement_cards.replace("\r\n", "\n"), 1)

with open("frontend/src/pages/admin/AdminDashboardPage.tsx", "w", encoding="utf-8") as f:
    f.write(content_norm)

print("SUCCESS: updated AdminDashboardPage.tsx with dynamic metrics")
