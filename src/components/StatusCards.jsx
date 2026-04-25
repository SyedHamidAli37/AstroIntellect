import { Satellite, Gauge, Layers, Target } from 'lucide-react'

const CLEANUP_MODES = {
  CRITICAL: 'NET CAPTURE — URGENT',
  HIGH: 'NET CAPTURE',
  MEDIUM: 'HARPOON / DRAG SAIL',
  LOW: 'MONITOR',
}

export default function StatusCards({ selectedObject, position }) {
  const speed = position ? `${position.velocity.toFixed(2)} km/s` : '—'
  const altitude = position ? `${position.altitude.toFixed(1)} km` : '—'
  const cleanupMode = selectedObject ? CLEANUP_MODES[selectedObject.riskLevel] || '—' : '—'

  const cards = [
    {
      id: 'tracked-object',
      icon: <Satellite size={18} />,
      label: 'Tracked Object',
      value: selectedObject?.name ?? '—',
      sub: selectedObject ? `NORAD #${selectedObject.noradId}` : '',
      accent: 'cyan',
    },
    {
      id: 'estimated-speed',
      icon: <Gauge size={18} />,
      label: 'Estimated Speed',
      value: speed,
      sub: 'Orbital velocity (km/s)',
      accent: 'cyan',
    },
    {
      id: 'altitude',
      icon: <Layers size={18} />,
      label: 'Altitude',
      value: altitude,
      sub: 'Above Earth surface',
      accent: selectedObject?.riskLevel === 'CRITICAL' ? 'danger' : 'cyan',
    },
    {
      id: 'cleanup-mode',
      icon: <Target size={18} />,
      label: 'Cleanup Mode',
      value: cleanupMode,
      sub: 'CleanupSat-1 strategy',
      accent: selectedObject?.riskLevel === 'CRITICAL' ? 'danger' : selectedObject?.riskLevel === 'HIGH' ? 'warning' : 'cyan',
    },
  ]

  return (
    <div className="status-cards">
      {cards.map(card => (
        <div key={card.id} className={`status-card status-card--${card.accent}`}>
          <div className="card-icon">{card.icon}</div>
          <div className="card-content">
            <div className="card-label">{card.label}</div>
            <div className="card-value">{card.value}</div>
            {card.sub && <div className="card-sub">{card.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
