import { useState, useEffect, useCallback, useRef } from 'react'
import OrbitViewer from './components/OrbitViewer'
import MissionPanel from './components/MissionPanel'
import StatusCards from './components/StatusCards'
import ErrorBoundary from './components/ErrorBoundary'
import { MissionPanelFallback } from './components/MissionControlFallback'
import { ORBITAL_OBJECTS, fetchTleData } from './data/orbitalObjects'
import './styles.css'

function PaneState({ title, detail, tone = 'loading' }) {
  return (
    <div className={`pane-state pane-state--${tone}`}>
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  )
}

export default function App() {
  const PHASE_DURATIONS = {
    TRACKING: 2000,
    INTERCEPT: 6000,
    NET_CAPTURE: 4000,
  }

  const METHOD_OPTIONS = {
    NET_CAPTURE: 'Net Capture',
    ROBOTIC_ARM: 'Robotic Arm',
    MAGNETIC_TETHER: 'Magnetic Tether',
    LASER_PUSH: 'Laser Push',
  }

  const [selectedId, setSelectedId] = useState('fengyun1c')
  const [tleData, setTleData] = useState(null)
  const [position, setPosition] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tleError, setTleError] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [cleanupMethod, setCleanupMethod] = useState('NET_CAPTURE')
  const [missionPhase, setMissionPhase] = useState('TRACKING')
  const [simulationActive, setSimulationActive] = useState(false)
  const [phaseStartedAt, setPhaseStartedAt] = useState(null)
  const phaseTimeoutsRef = useRef([])

  const selectedObject = ORBITAL_OBJECTS.find((o) => o.id === selectedId)

  const loadTle = useCallback(async (obj) => {
    setLoading(true)
    setTleError(null)
    setPosition(null)
    setTleData(null)
    try {
      const tle = await fetchTleData(obj)
      setTleData(tle)
    } catch (err) {
      const message = err?.message || 'Unable to fetch orbital data.'
      setTleError(message)
      console.error('[App] TLE load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedObject) loadTle(selectedObject)
  }, [selectedObject, loadTle])

  useEffect(() => {
    return () => {
      phaseTimeoutsRef.current.forEach((id) => clearTimeout(id))
      phaseTimeoutsRef.current = []
    }
  }, [])

  useEffect(() => {
    phaseTimeoutsRef.current.forEach((id) => clearTimeout(id))
    phaseTimeoutsRef.current = []
    setSimulationActive(false)
    setMissionPhase('TRACKING')
    setPhaseStartedAt(null)
  }, [selectedId])

  const handleSelect = (id) => {
    setSelectedId(id)
    setDropdownOpen(false)
  }

  const runCaptureSimulation = useCallback(() => {
    phaseTimeoutsRef.current.forEach((id) => clearTimeout(id))
    phaseTimeoutsRef.current = []

    const trackingStart = Date.now()
    setSimulationActive(true)
    setMissionPhase('TRACKING')
    setPhaseStartedAt(trackingStart)

    const interceptTimeout = setTimeout(() => {
      const interceptStart = Date.now()
      setMissionPhase('INTERCEPT')
      setPhaseStartedAt(interceptStart)
    }, PHASE_DURATIONS.TRACKING)

    const netTimeout = setTimeout(() => {
      const netStart = Date.now()
      setMissionPhase('NET CAPTURE')
      setPhaseStartedAt(netStart)
    }, PHASE_DURATIONS.TRACKING + PHASE_DURATIONS.INTERCEPT)

    const securedTimeout = setTimeout(() => {
      setMissionPhase('SECURED')
      setPhaseStartedAt(Date.now())
    }, PHASE_DURATIONS.TRACKING + PHASE_DURATIONS.INTERCEPT + PHASE_DURATIONS.NET_CAPTURE)

    phaseTimeoutsRef.current = [interceptTimeout, netTimeout, securedTimeout]
  }, [])

  const phaseMessageMap = {
    TRACKING: 'Tracking target and estimating orbit',
    INTERCEPT: 'CleanupSat-1 matching orbit and approaching target',
    'NET CAPTURE': 'NET DEPLOYED',
    SECURED: 'Target secured for controlled deorbit planning',
  }

  const RISK_COLORS = {
    CRITICAL: '#ff4757',
    HIGH: '#ff9f1c',
    MEDIUM: '#ffd32a',
    LOW: '#2ed573',
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-icon">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
              <circle cx="16" cy="16" r="7" stroke="#00d4ff" strokeWidth="2" />
              <ellipse cx="16" cy="16" rx="15" ry="6" stroke="#00d4ff" strokeWidth="1.5" opacity="0.5" />
              <ellipse cx="16" cy="16" rx="15" ry="6" stroke="#00d4ff" strokeWidth="1.5" opacity="0.5" transform="rotate(60 16 16)" />
              <circle cx="16" cy="4" r="2" fill="#ff4757" />
              <circle cx="9" cy="9" r="1.5" fill="#00d4ff" opacity="0.6" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">AstroIntellect</span>
            <span className="brand-sub">Orbital Capture Simulator</span>
          </div>
        </div>

        <div className="selector-wrapper">
          <div className="selector-label">TRACKING TARGET</div>
          <div className="selector-dropdown">
            <button
              className="selector-btn"
              onClick={() => setDropdownOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              <span
                className="selector-dot"
                style={{ background: RISK_COLORS[selectedObject?.riskLevel] }}
              />
              <span className="selector-current">{selectedObject?.name ?? '-'}</span>
              <svg
                className={`selector-chevron ${dropdownOpen ? 'open' : ''}`}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {dropdownOpen && (
              <ul className="selector-menu" role="listbox">
                {ORBITAL_OBJECTS.map((obj) => (
                  <li
                    key={obj.id}
                    className={`selector-item ${obj.id === selectedId ? 'selected' : ''}`}
                    onClick={() => handleSelect(obj.id)}
                    role="option"
                    aria-selected={obj.id === selectedId}
                  >
                    <span
                      className="selector-dot"
                      style={{ background: RISK_COLORS[obj.riskLevel] }}
                    />
                    <div className="selector-item-text">
                      <span className="selector-item-name">{obj.name}</span>
                      <span className="selector-item-type">{obj.type}</span>
                    </div>
                    <span
                      className="item-risk"
                      style={{ color: RISK_COLORS[obj.riskLevel] }}
                    >
                      {obj.riskLevel}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="topbar-right">
          <div className="live-indicator">
            <span className="live-dot" />
            LIVE TRACKING
          </div>
          <div className="mission-status">
            <span>MISSION: ALPHA-7</span>
          </div>
        </div>
      </header>

      <StatusCards selectedObject={selectedObject} position={position} />

      <main className="main-content">
        <div className="globe-area">
          {loading && (
            <div className="tle-loading">
              <div className="loading-spinner" />
              <span>Fetching orbital data...</span>
            </div>
          )}
          {!loading && tleError && (
            <PaneState
              title="Orbit Viewer Error"
              detail={tleError}
              tone="error"
            />
          )}
          {!loading && !tleError && !tleData && (
            <PaneState
              title="Orbit Viewer Loading"
              detail="Waiting for initial orbital data."
              tone="loading"
            />
          )}
          {!loading && tleData && (
            <ErrorBoundary
              fallback={(error) => (
                <PaneState
                  title="Orbit Viewer Error"
                  detail={error?.message || 'Orbit viewer crashed while rendering.'}
                  tone="error"
                />
              )}
            >
              <OrbitViewer
                selectedObject={selectedObject}
                tleData={tleData}
                onPositionUpdate={setPosition}
                missionPhase={missionPhase}
                simulationActive={simulationActive}
                phaseStartedAt={phaseStartedAt}
                captureMethod={cleanupMethod}
              />
            </ErrorBoundary>
          )}
        </div>

        <ErrorBoundary
          fallback={(error) => (
            <MissionPanelFallback
              detail={error?.message || 'Mission panel failed to render.'}
            />
          )}
        >
          <MissionPanel
            selectedObject={selectedObject}
            position={position}
            tleSource={tleData?.source}
            missionPhase={missionPhase}
            simulationActive={simulationActive}
            captureMethod={cleanupMethod}
            onCaptureMethodChange={setCleanupMethod}
            onRunCaptureSimulation={runCaptureSimulation}
            phaseMessage={phaseMessageMap[missionPhase]}
            methodLabel={METHOD_OPTIONS[cleanupMethod]}
          />
        </ErrorBoundary>
      </main>
    </div>
  )
}
