import { Copy, Check, FileText, Target, Activity } from 'lucide-react'
import { useState } from 'react'

export default function MissionBrief({
  selectedObject,
  position,
  captureMethod,
  missionPhase,
  geminiBrief
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const textToCopy = geminiBrief || staticBrief
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const staticBrief = "AstroIntellect estimates the selected object's orbital state using public TLE data, visualizes a conceptual intercept, and simulates a cleanup method for deorbit planning."

  return (
    <div className="tab-content brief-tab">
      <div className="brief-header">
        <h2>Mission Brief: Operation {selectedObject?.name || 'Unknown'}</h2>
        <p className="brief-subtitle">Executive summary and conceptual deorbit parameters</p>
      </div>

      <div className="brief-grid">
        <div className="brief-card">
          <div className="brief-card-header"><Target size={16} /> Target Profile</div>
          <div className="brief-card-body">
            <div className="brief-stat"><span>Name:</span> <strong>{selectedObject?.name}</strong></div>
            <div className="brief-stat"><span>NORAD ID:</span> <strong>{selectedObject?.noradId}</strong></div>
            <div className="brief-stat"><span>Risk Level:</span> <strong style={{color: 'var(--warning)'}}>{selectedObject?.riskLevel}</strong></div>
            <div className="brief-stat"><span>Type:</span> <strong>{selectedObject?.type}</strong></div>
          </div>
        </div>

        <div className="brief-card">
          <div className="brief-card-header"><Activity size={16} /> Estimated State & Parameters</div>
          <div className="brief-card-body">
            <div className="brief-stat"><span>Altitude:</span> <strong>{position ? position.altitude.toFixed(1) + ' km' : '-'}</strong></div>
            <div className="brief-stat"><span>Speed:</span> <strong>{position ? position.velocity.toFixed(2) + ' km/s' : '-'}</strong></div>
            <div className="brief-stat"><span>Cleanup Method:</span> <strong style={{color: 'var(--accent)'}}>{captureMethod}</strong></div>
            <div className="brief-stat"><span>Current Phase:</span> <strong>{missionPhase}</strong></div>
          </div>
        </div>
      </div>

      <div className="brief-summary-section">
        <div className="brief-summary-header">
          <h3><FileText size={18} /> Official Mission Summary</h3>
          <button className="copilot-btn brief-copy-btn" onClick={handleCopy}>
            {copied ? <><Check size={14}/> Copied</> : <><Copy size={14}/> Copy Mission Brief</>}
          </button>
        </div>
        <div className="brief-summary-content">
          <div className="static-brief">
            <strong>System Generated:</strong>
            <p>{staticBrief}</p>
          </div>
          {geminiBrief && (
            <div className="gemini-brief">
              <strong>GUARDIAN AI Generated:</strong>
              <p>{geminiBrief}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
