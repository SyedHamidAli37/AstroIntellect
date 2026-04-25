function PaneState({ title, detail, tone = 'loading' }) {
  return (
    <div className={`pane-state pane-state--${tone}`}>
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  )
}

export function MissionPanelFallback({ detail }) {
  return (
    <aside className="mission-panel mission-panel-fallback">
      <div className="panel-header">
        <h2 className="panel-obj-name">Mission Panel</h2>
        <p className="panel-obj-desc">{detail}</p>
      </div>
      <div className="panel-section">
        <PaneState
          title="Mission panel status"
          detail={detail}
          tone="error"
        />
      </div>
    </aside>
  )
}

export default function MissionControlFallback({ orbitDetail, missionDetail }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-text">
            <span className="brand-name">AstroIntellect</span>
            <span className="brand-sub">Mission Control Fallback</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="globe-area">
          <PaneState
            title="Orbit viewer status"
            detail={orbitDetail}
            tone="error"
          />
        </div>

        <MissionPanelFallback detail={missionDetail} />
      </main>
    </div>
  )
}
