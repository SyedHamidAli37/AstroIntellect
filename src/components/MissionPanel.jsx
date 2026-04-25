import { MapPin, Gauge, Layers, Zap, Clock, Shield, AlertTriangle } from 'lucide-react'

const RISK_META = {
  CRITICAL: { label: 'CRITICAL', color: '#ff4757', icon: '⚠' },
  HIGH: { label: 'HIGH', color: '#ff9f1c', icon: '▲' },
  MEDIUM: { label: 'MEDIUM', color: '#ffd32a', icon: '●' },
  LOW: { label: 'LOW', color: '#2ed573', icon: '✓' },
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

export default function MissionPanel({ selectedObject, position, tleSource }) {
  if (!selectedObject) return null

  const risk = RISK_META[selectedObject.riskLevel] || RISK_META.MEDIUM
  const lastUpdated = position?.timestamp
    ? new Date(position.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  return (
    <aside className="mission-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title-row">
          <div className="panel-obj-badge" style={{ borderColor: risk.color, color: risk.color }}>
            {selectedObject.type.toUpperCase()}
          </div>
        </div>
        <h2 className="panel-obj-name">{selectedObject.name}</h2>
        <p className="panel-obj-desc">{selectedObject.description}</p>
      </div>

      {/* Identity */}
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

      {/* Orbital State */}
      <div className="panel-section">
        <h3 className="section-title">
          <Gauge size={13} /> Estimated Orbital State
        </h3>
        <InfoRow
          icon={<Layers size={13} />}
          label="Altitude"
          value={position ? `${position.altitude.toFixed(1)} km` : '—'}
          valueClass="accent"
        />
        <InfoRow
          icon={<Gauge size={13} />}
          label="Speed"
          value={position ? `${position.velocity.toFixed(2)} km/s` : '—'}
          valueClass="accent"
        />
        <InfoRow
          icon={<MapPin size={13} />}
          label="Latitude"
          value={position ? `${position.latitude.toFixed(4)}°` : '—'}
          valueClass="mono"
        />
        <InfoRow
          icon={<MapPin size={13} />}
          label="Longitude"
          value={position ? `${position.longitude.toFixed(4)}°` : '—'}
          valueClass="mono"
        />
      </div>

      {/* Data Source */}
      <div className="panel-section">
        <h3 className="section-title">
          <Zap size={13} /> Data Source
        </h3>
        <div className={`source-badge ${tleSource?.startsWith('Fresh') ? 'source-live' : 'source-fallback'}`}>
          <span className="source-dot" />
          {tleSource || '—'}
        </div>
        <div className="info-row">
          <span className="info-icon"><Clock size={13} /></span>
          <span className="info-label">Last Updated</span>
          <span className="info-value mono">{lastUpdated}</span>
        </div>
      </div>

      {/* Cleanup Recommendation */}
      <div className="panel-section recommendation-box">
        <h3 className="section-title" style={{ color: '#00d4ff' }}>
          <Zap size={13} /> Cleanup Recommendation
        </h3>
        <div className="recommendation-method">Net Capture Recommended</div>
        <div className="recommendation-reason">
          <span className="reason-label">Reason:</span> Best for non-cooperative tumbling debris because it does not require precise docking.
        </div>
        <div className="recommendation-tags">
          <span className="tag">Active Debris Removal</span>
          <span className="tag">TRL 5–6</span>
          <span className="tag">ESA ClearSpace</span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="disclaimer">
        Prototype uses public TLE data and SGP4-style propagation. Values are estimates for demonstration, not official collision-avoidance data.
      </div>
    </aside>
  )
}
