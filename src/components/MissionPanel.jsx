import { MapPin, Gauge, Layers, Zap, Clock, Shield, AlertTriangle } from 'lucide-react'

const RISK_META = {
  CRITICAL: { label: 'CRITICAL', color: '#ff4757', icon: '!' },
  HIGH: { label: 'HIGH', color: '#ff9f1c', icon: '^' },
  MEDIUM: { label: 'MEDIUM', color: '#ffd32a', icon: 'o' },
  LOW: { label: 'LOW', color: '#2ed573', icon: 'OK' },
}

function InfoRow({ icon, label, value, valueClass }) {
  return (
    <div className="info-row">
      <span className="info-icon">{icon}</span>
      <span className="info-label">{label}</span>
      <span className={`info-value ${valueClass || ''}`}>{value}</span>
    </div>
  )
}

export default function MissionPanel({
  selectedObject,
  position,
  tleSource,
  missionPhase,
  simulationActive,
  captureMethod,
  onCaptureMethodChange,
  onRunCaptureSimulation,
  phaseMessage,
  methodLabel,
}) {
  if (!selectedObject) return null

  const risk = RISK_META[selectedObject.riskLevel] || RISK_META.MEDIUM
  const lastUpdated = position?.timestamp
    ? new Date(position.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '-'

  return (
    <aside className="mission-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <div className="panel-obj-badge" style={{ borderColor: risk.color, color: risk.color }}>
            {selectedObject.type.toUpperCase()}
          </div>
        </div>
        <h2 className="panel-obj-name">{selectedObject.name}</h2>
        <p className="panel-obj-desc">{selectedObject.description}</p>
      </div>

      <div className="panel-section">
        <h3 className="section-title">
          <Shield size={13} /> Identity
        </h3>
        <InfoRow icon={<Layers size={13} />} label="NORAD ID" value={`#${selectedObject.noradId}`} valueClass="mono" />
        <InfoRow icon={<Layers size={13} />} label="Object Type" value={selectedObject.type} />
        <div className="info-row">
          <span className="info-icon"><AlertTriangle size={13} /></span>
          <span className="info-label">Risk Level</span>
          <span className="info-value risk-badge" style={{ color: risk.color, borderColor: risk.color }}>
            {risk.icon} {risk.label}
          </span>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="section-title">
          <Gauge size={13} /> Estimated Orbital State
        </h3>
        <InfoRow icon={<Layers size={13} />} label="Altitude" value={position ? `${position.altitude.toFixed(1)} km` : '-'} valueClass="accent" />
        <InfoRow icon={<Gauge size={13} />} label="Speed" value={position ? `${position.velocity.toFixed(2)} km/s` : '-'} valueClass="accent" />
        <InfoRow icon={<MapPin size={13} />} label="Latitude" value={position ? `${position.latitude.toFixed(4)} deg` : '-'} valueClass="mono" />
        <InfoRow icon={<MapPin size={13} />} label="Longitude" value={position ? `${position.longitude.toFixed(4)} deg` : '-'} valueClass="mono" />
      </div>

      <div className="panel-section">
        <h3 className="section-title">
          <Zap size={13} /> Data Source
        </h3>
        <div className={`source-badge ${tleSource?.startsWith('Fresh') ? 'source-live' : 'source-fallback'}`}>
          <span className="source-dot" />
          {tleSource || '-'}
        </div>
        <div className="info-row">
          <span className="info-icon"><Clock size={13} /></span>
          <span className="info-label">Last Updated</span>
          <span className="info-value mono">{lastUpdated}</span>
        </div>
      </div>

      <div className="panel-section simulation-box">
        <h3 className="section-title" style={{ color: '#00d4ff' }}>
          <Zap size={13} /> Conceptual Cleanup Simulation
        </h3>
        <button className="run-sim-btn" onClick={onRunCaptureSimulation}>
          Run Capture Simulation
        </button>
        <div className="phase-chip-row">
          <span className="phase-chip">Phase: {missionPhase}</span>
          <span className={`phase-chip ${simulationActive ? 'phase-chip--active' : ''}`}>
            {simulationActive ? 'SIM ACTIVE' : 'READY'}
          </span>
        </div>
        <div className="phase-message">{phaseMessage}</div>
        <div className="phase-note">
          Using estimated position and velocity from public orbital data for a conceptual cleanup simulation.
        </div>
      </div>

      <div className="panel-section recommendation-box">
        <h3 className="section-title" style={{ color: '#00d4ff' }}>
          <Zap size={13} /> Cleanup Method
        </h3>
        <select className="method-select" value={captureMethod} onChange={(event) => onCaptureMethodChange(event.target.value)}>
          <option value="NET_CAPTURE">Net Capture</option>
          <option value="ROBOTIC_ARM">Robotic Arm</option>
          <option value="MAGNETIC_TETHER">Magnetic Tether</option>
          <option value="LASER_PUSH">Laser Push</option>
        </select>
        <div className="recommendation-method">{methodLabel}</div>
        <div className="recommendation-reason">
          {captureMethod === 'NET_CAPTURE' && (<><span className="reason-label">Net Capture:</span> Best for tumbling or non-cooperative debris because it avoids precise docking.</>)}
          {captureMethod === 'ROBOTIC_ARM' && (<><span className="reason-label">Robotic Arm:</span> Best for large stable debris.</>)}
          {captureMethod === 'MAGNETIC_TETHER' && (<><span className="reason-label">Magnetic Tether:</span> Best for metallic debris and deorbit support.</>)}
          {captureMethod === 'LASER_PUSH' && (<><span className="reason-label">Laser Push:</span> Best for small debris deflection concept.</>)}
        </div>
      </div>

      <div className="panel-section timeline-box">
        <h3 className="section-title">
          <Clock size={13} /> Mission Timeline
        </h3>
        <div className="timeline-card">
          Detect debris {'->'} Match orbit {'->'} Approach {'->'} Deploy net {'->'} Stabilize {'->'} Prepare deorbit
        </div>
      </div>

      <div className="panel-section recommendation-box">
        <h3 className="section-title" style={{ color: '#00d4ff' }}>
          <Zap size={13} /> Cleanup Recommendation
        </h3>
        <div className="recommendation-method">Net Capture Recommended</div>
        <div className="recommendation-reason">
          <span className="reason-label">Reason:</span> Best for non-cooperative tumbling debris because it does not require precise docking.
        </div>
        <div className="recommendation-tags">
          <span className="tag">Concept</span>
          <span className="tag">Public TLE Data</span>
          <span className="tag">Estimated Dynamics</span>
        </div>
      </div>

      <div className="disclaimer">
        Prototype uses estimated position and velocity from public orbital data and SGP4-style propagation. This is a conceptual cleanup simulation for demonstration and does not represent exact tracking or real physical debris removal.
      </div>
    </aside>
  )
}
