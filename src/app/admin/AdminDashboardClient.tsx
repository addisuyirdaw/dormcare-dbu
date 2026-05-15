'use client';

export default function AdminDashboardClient({ initialData, recentLogs }: any) {
  const { blocks, stats } = initialData;
  const attendanceRate = Math.round((stats.todayAttendance / stats.totalStudents) * 100) || 0;

  // Calculate efficiency
  const staffedBlocksCount = blocks.filter((b: any) => b.isStaffed).length;
  // unique active staff members across the blocks
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
            className="btn btn-primary" 
            onClick={() => window.location.href = '/admin/shifts'}
          >
            📡 Track Staff Shifts
          </button>
          <button className="btn btn-ghost" onClick={() => window.location.reload()}>🔄 Refresh Data</button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid-4 mb-8">
        <div className="stat-card">
          <div className="stat-label flex items-center justify-between">Active Shifts <span className="text-green">●</span></div>
          <div className="stat-value">{stats.activeShifts} <span className="text-sec text-sm text-normal">staff covering {staffedBlocksCount} blocks</span></div>
          <div className="text-xs text-green mt-1">Efficiency: {efficiencyRatio}x (Blocks per Staff)</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center justify-between">Curfew Attendance <span className="text-blue">🛡️</span></div>
          <div className="stat-value">{attendanceRate}%</div>
          <div className="text-xs text-sec">{stats.todayAttendance} of {stats.totalStudents} checked in</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center justify-between">Open Emergencies <span className="text-red">🚨</span></div>
          <div className="stat-value text-red">{stats.openTickets}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center justify-between">Pending Audits <span className="text-amber">📦</span></div>
          <div className="stat-value text-amber">{stats.pendingClearances}</div>
        </div>
      </div>

      <div className="grid-3 gap-8">
        {/* 90-Block Matrix (Span 2) */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2">Dorm Block Matrix <span className="badge badge-amber">Multi-Block Mode</span></h3>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span style={{ color: 'var(--green)' }}>●</span> Staffed</span>
              <span className="flex items-center gap-1"><span style={{ color: 'var(--red)' }}>●</span> Unstaffed</span>
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
                  <div className="mb-1" style={{ fontSize: '1rem' }}>{b.number}</div>
                  <div style={{ opacity: 0.8, fontSize: '0.65rem' }}>{b.name}</div>
                  {b.isStaffed && (
                    <div style={{ fontSize: '0.5rem', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

        {/* Live Attendance Feed (Span 1) */}
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
                  <div key={log.id} className="flex items-center justify-between py-3 px-6 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <div className="font-bold text-sm">{log.student.name}</div>
                      <div className="text-xs text-muted flex gap-2 mt-1">
                        <span className="font-mono">{log.student.studentId}</span>
                        <span>•</span>
                        <span>Block {log.dormBlock.number}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-sec">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className={`badge badge-muted mt-1`} style={{ fontSize: '0.55rem' }}>{log.method.replace('_', ' ')}</div>
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
