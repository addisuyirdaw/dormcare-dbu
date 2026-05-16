'use client';

type IncidentRow = {
  id: string;
  title: string;
  blockLabel: string;
  roomNumber: string;
  studentName: string;
  studentId?: string | null;
  statusLabel: string;
  updatedAt: string;
  isAdminRouted: boolean;
};

type ServiceAnalytics = {
  utilityStabilityPct: number;
  primaryBlockLabel: string;
  compliancePct: number;
  reportingSpeedLabel: string;
  recognitionCount: number;
  communityRecognitionPct: number;
  cleanlinessIndex: number;
  aiRecommendation: string;
  waterSpikePct: number;
  openCriticalCount: number;
};

export default function AdminDashboardClient({
  initialData,
  recentLogs,
  incidents = [],
  serviceAnalytics,
}: {
  initialData: any;
  recentLogs: any;
  incidents?: IncidentRow[];
  serviceAnalytics?: ServiceAnalytics;
}) {
  const { blocks, stats } = initialData;
  const analytics = serviceAnalytics;
  const attendanceRate = Math.round((stats.todayAttendance / stats.totalStudents) * 100) || 0;

  const staffedBlocksCount = blocks.filter((b: any) => b.isStaffed).length;
  const activeStaffNames = new Set(blocks.filter((b: any) => b.isStaffed).map((b: any) => b.activeStaff));
  const efficiencyRatio = activeStaffNames.size > 0 ? (staffedBlocksCount / activeStaffNames.size).toFixed(1) : 0;

  return (
    <div className="container section animate-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1>Proctor Command Center</h1>
          <p className="text-sec mt-1">Campus Overview & Monitoring</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              window.location.href = '/admin/shifts';
            }}
          >
            📡 Track Staff Shifts
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>
            🔄 Refresh Data
          </button>
        </div>
      </div>

      <div className="grid-4 mb-8">
        <div className="stat-card">
          <div className="stat-label flex items-center justify-between">
            Active Shifts <span className="text-green">●</span>
          </div>
          <div className="stat-value">
            {stats.activeShifts}{' '}
            <span className="text-sec text-sm text-normal">staff covering {staffedBlocksCount} blocks</span>
          </div>
          <div className="text-xs text-green mt-1">Efficiency: {efficiencyRatio}x (Blocks per Staff)</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center justify-between">
            Curfew Attendance <span className="text-blue">🛡️</span>
          </div>
          <div className="stat-value">{attendanceRate}%</div>
          <div className="text-xs text-sec">
            {stats.todayAttendance} of {stats.totalStudents} checked in
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center justify-between">
            Open Emergencies <span className="text-red">🚨</span>
          </div>
          <div className="stat-value text-red">{stats.openTickets}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center justify-between">
            Pending Audits <span className="text-amber">📦</span>
          </div>
          <div className="stat-value text-amber">{stats.pendingClearances}</div>
        </div>
      </div>

      <section className="card mb-8 border-2 border-red-500/40 shadow-[0_0_30px_rgba(255,79,79,0.15)]">
        <div className="card-header flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-red-950/80 to-slate-900/80">
          <div>
            <h2 className="text-lg font-bold text-red-100">
              🚨 Real-Time Critical Infrastructure Incident Board
            </h2>
            <p className="text-xs text-red-200/80 mt-1">
              Live feed from DormCare Assistant · widget → ADMIN_DASHBOARD routing
            </p>
          </div>
          <span className="animate-pulse rounded-full border border-red-500 bg-red-950 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-300">
            {incidents.length} Active
          </span>
        </div>
        <div className="card-p p-0">
          {incidents.length === 0 ? (
            <p className="text-sec text-sm text-center py-10 px-6">
              No open infrastructure incidents. Student widget reports will appear here instantly.
            </p>
          ) : (
            <div className="divide-y divide-red-900/30">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className={`flex flex-col gap-2 border-l-4 border-red-500 bg-red-950/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between ${
                    incident.isAdminRouted
                      ? 'animate-pulse shadow-[inset_0_0_20px_rgba(255,79,79,0.12)]'
                      : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-200">
                      <span className="font-bold text-red-100">{incident.title}</span>
                      {' → '}
                      Block <span className="font-semibold text-white">{incident.blockLabel}</span>, Room{' '}
                      <span className="font-mono text-amber-200">{incident.roomNumber}</span>{' '}
                      <span className="text-slate-400">(Student: {incident.studentName})</span>
                    </p>
                    {incident.isAdminRouted && (
                      <span className="mt-2 inline-block rounded bg-red-600/30 px-2 py-0.5 text-[10px] font-bold uppercase text-red-200">
                        ADMIN_DASHBOARD
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-block rounded-md border border-red-500/60 bg-red-900/50 px-3 py-1.5 text-xs font-bold text-red-100">
                      Status: [{incident.statusLabel}]
                    </span>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {new Date(incident.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {analytics && (
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold">📊 DormCare AI Service Optimization Analytics</h2>
            <p className="text-sec text-sm mt-1">
              Compliance, utility reliability, and predictive maintenance intelligence
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="card border border-blue-500/20">
              <div className="card-header">
                <h3 className="text-sm font-bold text-blue-200">Card 1 · Utility Reliability Index</h3>
              </div>
              <div className="card-p">
                <p className="text-xs text-sec uppercase tracking-wide mb-2">Power / Water Uptime Model</p>
                <p className="text-3xl font-black text-blue-300">{analytics.utilityStabilityPct}%</p>
                <p className="text-sm text-slate-300 mt-2">
                  Block {analytics.primaryBlockLabel} Utility Stability
                </p>
                <div className="mt-4 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                    style={{ width: `${analytics.utilityStabilityPct}%` }}
                  />
                </div>
                <p className="text-xs text-muted mt-3">
                  Water spike {analytics.waterSpikePct}% · {analytics.openCriticalCount} open critical
                </p>
              </div>
            </div>

            <div className="card border border-emerald-500/20">
              <div className="card-header">
                <h3 className="text-sm font-bold text-emerald-200">Card 2 · Student Compliance & Recognition</h3>
              </div>
              <div className="card-p space-y-3">
                <div>
                  <p className="text-xs text-sec">Compliance index</p>
                  <p className="text-2xl font-black text-emerald-300">{analytics.compliancePct}%</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-900/80 p-3 border border-slate-700">
                    <p className="text-muted">Reporting speed</p>
                    <p className="font-bold text-white mt-1">{analytics.reportingSpeedLabel}</p>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 p-3 border border-slate-700">
                    <p className="text-muted">Room cleanliness index</p>
                    <p className="font-bold text-white mt-1">{analytics.cleanlinessIndex}%</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Community recognition: <strong className="text-emerald-300">{analytics.recognitionCount}</strong>{' '}
                  key custodians ({analytics.communityRecognitionPct}% of residents)
                </p>
              </div>
            </div>

            <div className="card border border-amber-500/20">
              <div className="card-header">
                <h3 className="text-sm font-bold text-amber-200">Card 3 · AI Predictive Maintenance Engine</h3>
              </div>
              <div className="card-p">
                <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 text-sm leading-relaxed text-amber-50/90 min-h-[180px]">
                  {analytics.aiRecommendation}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid-3 gap-8">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2">
                Dorm Block Matrix <span className="badge badge-amber">Multi-Block Mode</span>
              </h3>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span style={{ color: 'var(--green)' }}>●</span> Staffed
              </span>
              <span className="flex items-center gap-1">
                <span style={{ color: 'var(--red)' }}>●</span> Unstaffed
              </span>
            </div>
          </div>
          <div className="card-p">
            <div className="block-grid">
              {blocks.map((b: any) => (
                <div
                  key={b.id}
                  className={`block-cell ${b.isStaffed ? 'staffed' : 'unstaffed'}`}
                  title={b.isStaffed ? `Managed by: ${b.activeStaff}` : 'No staff currently assigned & active'}
                >
                  <div className="mb-1" style={{ fontSize: '1rem' }}>
                    {b.number}
                  </div>
                  <div style={{ opacity: 0.8, fontSize: '0.65rem' }}>{b.name}</div>
                  {b.isStaffed && (
                    <div
                      style={{
                        fontSize: '0.5rem',
                        marginTop: 4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {b.activeStaff?.split(' ')[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {staffedBlocksCount < blocks.length && (
              <div className="alert alert-error mt-6">
                <strong>Alert:</strong> {blocks.length - staffedBlocksCount} blocks are currently unstaffed.
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Live Check-ins</h3>
          </div>
          <div className="card-p p-0">
            {recentLogs?.length === 0 ? (
              <p className="text-sec text-sm text-center py-8">No check-ins today.</p>
            ) : (
              <div className="flex flex-col">
                {recentLogs?.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between py-3 px-6 border-b"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div>
                      <div className="font-bold text-sm">{log.student.name}</div>
                      <div className="text-xs text-muted flex gap-2 mt-1">
                        <span className="font-mono">{log.student.studentId}</span>
                        <span>•</span>
                        <span>Block {log.dormBlock.number}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-sec">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <span className="badge badge-muted mt-1" style={{ fontSize: '0.55rem' }}>
                        {log.method.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
