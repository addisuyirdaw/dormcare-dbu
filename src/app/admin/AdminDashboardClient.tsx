'use client';
import { useState } from 'react';

type BlockHealthMetric = {
  score: number;
  tier: 'CRITICAL' | 'MEDIUM' | 'GOOD';
  openEmergencies: number;
  openMaintenance: number;
  rejectedClearances: number;
  attendanceRate: number;
  weeklyIssues: number;
  aiVerdict: string;
  controlSuggestion: string;
};

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

type ResponseItem = {
  id: string;
  type: 'TICKET' | 'CLEARANCE';
  category: string;
  studentName: string;
  roomNumber: string;
  blockLabel: string;
  assignedProctor: string | null;
  status: string;
  createdAt: string;
  waitingMinutes: number;
};

type Proctor = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  managedBlocks: { id: string; name: string; number: number }[];
  isOnDuty: boolean;
  lastShiftAt: string | null;
};

export default function AdminDashboardClient({
  initialData,
  recentLogs,
  incidents = [],
  serviceAnalytics,
  responseItems = [],
  proctorList: initialProctorList = [],
  allBlocks = [],
}: {
  initialData: any;
  recentLogs: any;
  incidents?: IncidentRow[];
  serviceAnalytics?: ServiceAnalytics;
  responseItems?: ResponseItem[];
  proctorList?: Proctor[];
  allBlocks?: { id: string; name: string; number: number }[];
}) {
  const { blocks, stats } = initialData;
  const analytics = serviceAnalytics;
  const attendanceRate = Math.round((stats.todayAttendance / stats.totalStudents) * 100) || 0;

  const staffedBlocksCount = blocks.filter((b: any) => b.isStaffed).length;
  const activeStaffNames = new Set(blocks.filter((b: any) => b.isStaffed).map((b: any) => b.activeStaff));
  const efficiencyRatio = activeStaffNames.size > 0 ? (staffedBlocksCount / activeStaffNames.size).toFixed(1) : 0;

  // Proctor management state
  const [proctors, setProctors] = useState<Proctor[]>(initialProctorList);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New Collapsible & Bypass Action States
  const [expandedBlockIds, setExpandedBlockIds] = useState<string[]>([]);
  const [aiAnalyticsExpanded, setAiAnalyticsExpanded] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [expandedIncidentIds, setExpandedIncidentIds] = useState<string[]>([]);
  const [expandedProctorIds, setExpandedProctorIds] = useState<string[]>([]);

  const toggleBlockExpanded = (id: string) => {
    setExpandedBlockIds(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const toggleIncidentExpanded = (id: string) => {
    setExpandedIncidentIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleProctorExpanded = (id: string) => {
    setExpandedProctorIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleAdminApproveClearance = async (clearanceId: string) => {
    const confirmed = confirm(
      "⚠️ WARNING: By approving this final exit clearance, you confirm that the student is completely free from any illegal activity, missing assets, or outstanding curfew violations.\n\nAre you sure you want to bypass the proctor queue and approve this exit clearance?"
    );
    if (!confirmed) return;

    setApprovingId(clearanceId);
    try {
      const res = await fetch('/api/clearance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clearanceId, action: 'APPROVED' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve clearance.');
      alert("✅ Clearance successfully approved! Student exit token generated and student notified.");
      window.location.reload();
    } catch (e: any) {
      alert(`❌ Error: ${e.message}`);
    } finally {
      setApprovingId(null);
    }
  };

  const toggleBlock = (id: string) =>
    setSelectedBlocks(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);

  const handleCreateProctor = async () => {
    setCreating(true); setCreateError(''); setCreateSuccess('');
    try {
      const res = await fetch('/api/admin/proctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, phone: newPhone, blockIds: selectedBlocks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setProctors(prev => [...prev, { ...data, isOnDuty: false, lastShiftAt: null }]);
      setCreateSuccess(`✅ Proctor "${data.name}" created successfully!`);
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewPhone(''); setSelectedBlocks([]);
      setShowCreateForm(false);
    } catch (e: any) { setCreateError(e.message); }
    setCreating(false);
  };

  const handleDeleteProctor = async (id: string) => {
    if (!confirm('Remove this proctor account? This cannot be undone.')) return;
    setDeletingId(id);
    await fetch(`/api/admin/proctors?id=${id}`, { method: 'DELETE' });
    setProctors(prev => prev.filter(p => p.id !== id));
    setDeletingId(null);
  };

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
              {incidents.map((incident) => {
                const isExpanded = expandedIncidentIds.includes(incident.id);
                return (
                  <div
                    key={incident.id}
                    className={`border-l-4 border-red-500 bg-red-950/20 overflow-hidden transition-all duration-200 ${
                      incident.isAdminRouted
                        ? 'animate-pulse shadow-[inset_0_0_20px_rgba(255,79,79,0.12)]'
                        : ''
                    }`}
                  >
                    {/* Sleek Baseline Header Row */}
                    <div 
                      className="flex items-center justify-between px-6 py-4 cursor-pointer select-none hover:bg-red-950/30 transition-all"
                      onClick={() => toggleIncidentExpanded(incident.id)}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-red-400">🚨</span>
                        <span className="font-bold text-red-100 text-sm">{incident.title}</span>
                        <span className="text-xs text-slate-400">
                          Block {incident.blockLabel} · Room {incident.roomNumber}
                        </span>
                        {incident.isAdminRouted && (
                          <span className="rounded bg-red-600/30 px-2 py-0.5 text-[9px] font-bold uppercase text-red-200">
                            Bypass Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="inline-block rounded-md border border-red-500/60 bg-red-900/50 px-2.5 py-1 text-xs font-bold text-red-100">
                          [{incident.statusLabel}]
                        </span>
                        <span className="text-slate-400 font-mono text-xs">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>

                    {/* Isolated Conditional Details Panel */}
                    {isExpanded && (
                      <div className="border-t border-red-950/40 px-6 py-4 bg-black/40 text-sm text-slate-300 space-y-3 animate-in">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs text-slate-500 font-bold uppercase">Incident Reporting Student</p>
                            <p className="font-bold text-slate-200 mt-1">{incident.studentName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-bold uppercase">Last Updated / Logged At</p>
                            <p className="font-mono text-slate-200 mt-1">{new Date(incident.updatedAt).toLocaleString()}</p>
                          </div>
                        </div>

                        {incident.isAdminRouted && (
                          <div className="rounded border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-200">
                            <strong>⚠️ Admin Override Active:</strong> This incident was routed directly from the DormCare AI Assistant widget bypass and escalated straight to the administrative dashboard.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {analytics && (
        <section className="mb-8">
          <div 
            className="mb-4 flex items-center justify-between cursor-pointer select-none bg-slate-900/40 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-all"
            onClick={() => setAiAnalyticsExpanded(!aiAnalyticsExpanded)}
          >
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                📊 DormCare AI Service Optimization Analytics
                <span className="text-sm font-normal text-sec">
                  (Click to {aiAnalyticsExpanded ? 'Collapse' : 'Expand'})
                </span>
              </h2>
              <p className="text-sec text-xs mt-1">
                Compliance, utility reliability, and predictive maintenance intelligence
              </p>
            </div>
            <span className="text-sec font-mono text-lg transition-transform duration-200">
              {aiAnalyticsExpanded ? '▼' : '▶'}
            </span>
          </div>

          {aiAnalyticsExpanded && (
            <div className="grid gap-6 md:grid-cols-3 animate-in">
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
          )}
        </section>
      )}

      {/* ── AI Block Satisfaction Leaderboard ──────────────────────────── */}
      {blocks.some((b: any) => b.health) && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">🤖 AI Block Satisfaction Intelligence</h2>
              <p className="text-sec text-sm mt-1">Real-time student–staff interaction analysis · Metric-based tier ranking</p>
            </div>
          </div>

          {/* Tier Summary Badges */}
          {(() => {
            const critical = blocks.filter((b: any) => b.health?.tier === 'CRITICAL');
            const medium   = blocks.filter((b: any) => b.health?.tier === 'MEDIUM');
            const good     = blocks.filter((b: any) => b.health?.tier === 'GOOD');
            return (
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🔴</span>
                    <span className="font-bold text-red-300 text-sm uppercase tracking-wider">Critical Blocks ({critical.length})</span>
                  </div>
                  {critical.length === 0
                    ? <p className="text-xs text-red-400/70">No critical blocks. ✓</p>
                    : critical.map((b: any) => (
                        <div key={b.id} className="flex justify-between items-center text-sm py-1 border-b border-red-900/40 last:border-0">
                          <span className="font-bold text-white">Block {b.number} · {b.name}</span>
                          <span className="font-mono text-red-300 text-xs">{b.health.score}/100</span>
                        </div>
                      ))}
                </div>

                <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🟡</span>
                    <span className="font-bold text-amber-300 text-sm uppercase tracking-wider">Needs Attention ({medium.length})</span>
                  </div>
                  {medium.length === 0
                    ? <p className="text-xs text-amber-400/70">No medium-concern blocks. ✓</p>
                    : medium.map((b: any) => (
                        <div key={b.id} className="flex justify-between items-center text-sm py-1 border-b border-amber-900/40 last:border-0">
                          <span className="font-bold text-white">Block {b.number} · {b.name}</span>
                          <span className="font-mono text-amber-300 text-xs">{b.health.score}/100</span>
                        </div>
                      ))}
                </div>

                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🟢</span>
                    <span className="font-bold text-emerald-300 text-sm uppercase tracking-wider">Good Blocks ({good.length})</span>
                  </div>
                  {good.length === 0
                    ? <p className="text-xs text-emerald-400/70">No good-tier blocks yet.</p>
                    : good.map((b: any) => (
                        <div key={b.id} className="flex justify-between items-center text-sm py-1 border-b border-emerald-900/40 last:border-0">
                          <span className="font-bold text-white">Block {b.number} · {b.name}</span>
                          <span className="font-mono text-emerald-300 text-xs">{b.health.score}/100</span>
                        </div>
                      ))}
                </div>
              </div>
            );
          })()}

          {/* Detailed Block Cards — sorted most critical first */}
          <div className="flex flex-col gap-4">
            {[...blocks]
              .filter((b: any) => b.health)
              .sort((a: any, b: any) => a.health.score - b.health.score)
              .map((b: any) => {
                const h: BlockHealthMetric = b.health;
                const borderClass = h.tier === 'CRITICAL' ? 'border-red-500/30' : h.tier === 'MEDIUM' ? 'border-amber-500/30' : 'border-emerald-500/30';
                const bgClass = h.tier === 'CRITICAL' ? 'bg-red-950/10' : h.tier === 'MEDIUM' ? 'bg-amber-950/10' : 'bg-emerald-950/10';
                const isExpanded = expandedBlockIds.includes(b.id);
                return (
                  <div key={b.id} className={`rounded-xl border ${borderClass} ${bgClass} overflow-hidden transition-all duration-200`}>
                    {/* Collapsible Header Row */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-white/5 transition-all"
                      onClick={() => toggleBlockExpanded(b.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{h.tier === 'CRITICAL' ? '🔴' : h.tier === 'MEDIUM' ? '🟡' : '🟢'}</span>
                        <span className="font-bold text-slate-200">Block {b.number} · {b.name}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold" style={{
                          background: h.tier === 'CRITICAL' ? 'rgba(239,68,68,0.2)' : h.tier === 'MEDIUM' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                          color: h.tier === 'CRITICAL' ? '#f87171' : h.tier === 'MEDIUM' ? '#fbbf24' : '#34d399'
                        }}>
                          {h.tier}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-sm text-slate-300">
                          Satisfaction: <span className="font-black font-mono text-base" style={{ color: h.tier === 'CRITICAL' ? '#ef4444' : h.tier === 'MEDIUM' ? '#f59e0b' : '#10b981' }}>{h.score}/100</span>
                        </span>
                        <span className="text-sec font-mono text-xs">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>

                    {/* Collapsible Details Content */}
                    {isExpanded && (
                      <div className="border-t border-white/5 p-5 bg-black/20 animate-in">
                        <div className="flex flex-wrap items-start justify-between gap-6">
                          {/* Left: Score bar */}
                          <div className="min-w-[160px]">
                            <div className="text-xs text-muted mb-2 font-bold uppercase tracking-wider">Satisfaction Index</div>
                            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden mb-2">
                              <div
                                  className={`h-full rounded-full transition-all`}
                                  style={{ width: `${h.score}%`, background: h.tier === 'CRITICAL' ? '#ef4444' : h.tier === 'MEDIUM' ? '#f59e0b' : '#10b981' }}
                              />
                            </div>
                            <div className="text-xs text-slate-400">
                              Based on weekly infrastructure incident resolved-to-open ratios.
                            </div>
                          </div>

                          {/* Middle: Metrics grid */}
                          <div className="grid grid-cols-2 gap-3 text-xs flex-1 min-w-[200px]">
                            <div className="rounded-lg bg-black/30 p-3 border border-white/5">
                              <div className="text-muted mb-1">Open Emergencies</div>
                              <div className={`font-bold text-lg ${h.openEmergencies > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{h.openEmergencies}</div>
                            </div>
                            <div className="rounded-lg bg-black/30 p-3 border border-white/5">
                              <div className="text-muted mb-1">Maintenance Backlog</div>
                              <div className={`font-bold text-lg ${h.openMaintenance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{h.openMaintenance}</div>
                            </div>
                            <div className="rounded-lg bg-black/30 p-3 border border-white/5">
                              <div className="text-muted mb-1">Attendance Rate</div>
                              <div className={`font-bold text-lg ${h.attendanceRate < 60 ? 'text-red-400' : 'text-emerald-400'}`}>{h.attendanceRate}%</div>
                            </div>
                            <div className="rounded-lg bg-black/30 p-3 border border-white/5">
                              <div className="text-muted mb-1">Issues This Week</div>
                              <div className={`font-bold text-lg ${h.weeklyIssues > 2 ? 'text-amber-400' : 'text-slate-300'}`}>{h.weeklyIssues}</div>
                            </div>
                          </div>

                          {/* Right: AI verdict + action */}
                          <div className="flex flex-col gap-3 min-w-[220px] max-w-xs">
                            <div className="text-sm text-slate-300 leading-relaxed font-semibold bg-white/5 p-3 rounded-lg border border-white/5">
                              🤖 AI Verdict: <span className="font-normal text-slate-400">{h.aiVerdict}</span>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-slate-400">
                              <span className="font-bold text-white">📋 Suggested Action: </span>{h.controlSuggestion}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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

      {/* ── ⏱️ Proctor Response Time Monitor ── */}
      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-bold">⏱️ Proctor Response Time Monitor</h2>
          <p className="text-sec text-sm mt-1">Open tickets &amp; clearances sorted by longest wait — admin oversight of proctor responsiveness</p>
        </div>
        {responseItems.length === 0 ? (
          <div className="card card-p text-center text-sec text-sm py-8">🎉 No open tickets or pending clearances right now.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Type</th><th>Category</th><th>Student</th><th>Room</th><th>Block</th><th>Assigned Proctor</th><th>Status</th><th>Waiting</th><th>Urgency</th><th>Action</th></tr></thead>
              <tbody>
                {responseItems.map((item) => {
                  const hrs = item.waitingMinutes / 60;
                  const urgency = hrs < 1 ? { cls: 'badge-green', label: '🟢 On Time' } : hrs < 3 ? { cls: 'badge-amber', label: '🟡 Slow' } : { cls: 'badge-red', label: '🔴 Critical' };
                  const wait = item.waitingMinutes < 60 ? `${item.waitingMinutes}m` : `${Math.floor(item.waitingMinutes/60)}h ${item.waitingMinutes%60}m`;
                  return (
                    <tr key={item.id} style={hrs >= 3 ? { background: 'rgba(239,68,68,0.06)' } : undefined}>
                      <td><span className={`badge ${item.type === 'TICKET' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: '0.6rem' }}>{item.type}</span></td>
                      <td className="font-bold text-sm">{item.category}</td>
                      <td>{item.studentName}</td>
                      <td className="font-mono text-xs">{item.roomNumber}</td>
                      <td className="text-xs text-sec">{item.blockLabel}</td>
                      <td>{item.assignedProctor ? <span className="font-bold text-accent">{item.assignedProctor}</span> : <span className="text-muted italic">Unassigned</span>}</td>
                      <td><span className="badge badge-muted" style={{ fontSize: '0.6rem' }}>{item.status.replace(/_/g,' ')}</span></td>
                      <td className="font-mono font-bold">{wait}</td>
                      <td><span className={`badge ${urgency.cls}`} style={{ fontSize: '0.65rem' }}>{urgency.label}</span></td>
                      <td>
                        {item.type === 'CLEARANCE' && item.status.startsWith('PENDING') ? (
                          <button
                            type="button"
                            className="btn btn-primary animate-pulse"
                            style={{ 
                              fontSize: '0.65rem', 
                              padding: '4px 8px',
                              background: 'var(--accent)',
                              borderColor: 'var(--accent)',
                              boxShadow: '0 0 10px rgba(99,102,241,0.2)'
                            }}
                            disabled={approvingId === item.id}
                            onClick={() => handleAdminApproveClearance(item.id)}
                          >
                            {approvingId === item.id ? 'Approving...' : '✔️ Bypass & Approve'}
                          </button>
                        ) : (
                          <span className="text-muted italic">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 👥 Manage Proctors ── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">👥 Manage Proctors</h2>
            <p className="text-sec text-sm mt-1">Create, view, and remove proctor accounts. Each proctor receives student requests for their assigned blocks.</p>
          </div>
          <button id="create-proctor-btn" className="btn btn-primary" onClick={() => { setShowCreateForm(!showCreateForm); setCreateError(''); setCreateSuccess(''); }}>
            {showCreateForm ? '✕ Cancel' : '➕ Create Proctor'}
          </button>
        </div>

        {createSuccess && <div className="alert alert-success mb-4">{createSuccess}</div>}
        {createError && <div className="alert alert-error mb-4">{createError}</div>}

        {showCreateForm && (
          <div className="card card-p mb-6 animate-in" style={{ border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.05)' }}>
            <h3 className="mb-4">New Proctor Account</h3>
            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input id="proctor-name" className="form-input" placeholder="e.g. Ato Tadesse Worku" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input id="proctor-email" className="form-input" type="email" placeholder="teregna1@dbu.edu.et" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Password * (min 6 chars)</label>
                <input id="proctor-password" className="form-input" type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone (optional)</label>
                <input id="proctor-phone" className="form-input" placeholder="+251911..." value={newPhone} onChange={e => setNewPhone(e.target.value)} />
              </div>
            </div>
            <div className="form-group mt-4">
              <label className="form-label">Assign to Blocks (select one or more)</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {allBlocks.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBlock(b.id)}
                    className={`btn btn-sm ${selectedBlocks.includes(b.id) ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ border: selectedBlocks.includes(b.id) ? undefined : '1px solid var(--border)' }}
                  >
                    Block {b.number} · {b.name}
                  </button>
                ))}
              </div>
            </div>
            <button id="submit-create-proctor-btn" className="btn btn-primary btn-block mt-6 btn-lg" onClick={handleCreateProctor} disabled={creating || !newName || !newEmail || !newPassword}>
              {creating ? <><span className="spinner" /> Creating…</> : '✅ Create Proctor Account'}
            </button>
          </div>
        )}

        {proctors.length === 0 ? (
          <div className="card card-p text-center text-sec text-sm py-8">No proctors yet. Click "Create Proctor" to add one.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {proctors.map(p => {
              const isExpanded = expandedProctorIds.includes(p.id);
              return (
                <div 
                  key={p.id} 
                  className="rounded-xl border p-4 transition-all duration-200"
                  style={{ 
                    borderColor: 'var(--border)', 
                    background: p.isOnDuty ? 'rgba(16,185,129,0.03)' : 'var(--bg-raised)' 
                  }}
                >
                  {/* Unified Sleek Baseline Header Row */}
                  <div 
                    className="flex items-center justify-between cursor-pointer select-none hover:opacity-80 transition-all"
                    onClick={() => toggleProctorExpanded(p.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-slate-100">{p.name}</span>
                      <span className="text-sec text-xs">•</span>
                      <span>
                        {p.isOnDuty
                          ? <span className="badge badge-green" style={{ fontSize: '0.6rem' }}>🟢 On Duty</span>
                          : <span className="badge badge-muted" style={{ fontSize: '0.6rem' }}>⚫ Off Duty</span>}
                      </span>
                      <span className="text-sec text-xs">•</span>
                      <span className="text-xs text-muted">
                        {p.managedBlocks.length} Assigned {p.managedBlocks.length === 1 ? 'Block' : 'Blocks'}
                      </span>
                    </div>
                    <span className="text-sec font-mono text-xs">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>

                  {/* Isolated Conditional Details Panel */}
                  {isExpanded && (
                    <div className="border-t mt-4 pt-4 text-xs text-sec space-y-4 animate-in" style={{ borderColor: 'var(--border)' }}>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Email Address</p>
                          <p className="font-mono text-slate-200 font-bold">{p.email}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Phone Number</p>
                          <p className="text-slate-200 font-bold">{p.phone || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Last Active Shift</p>
                          <p className="text-slate-200">
                            {p.lastShiftAt ? new Date(p.lastShiftAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Detailed Block Assignments</p>
                        <div className="flex flex-wrap gap-2">
                          {p.managedBlocks.length > 0 ? p.managedBlocks.map(b => (
                            <span key={b.id} className="badge badge-muted" style={{ fontSize: '0.6rem' }}>Block {b.number} · {b.name}</span>
                          )) : <span className="text-muted text-xs italic">No blocks assigned.</span>}
                        </div>
                      </div>

                      <div className="flex justify-end border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ color: 'var(--red)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                          onClick={() => handleDeleteProctor(p.id)}
                          disabled={deletingId === p.id}
                        >
                          {deletingId === p.id ? 'Removing proctor…' : '🗑 Terminate shift & remove account'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
