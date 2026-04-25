import { useState } from 'react'
import { Sparkles, Loader2, Copy, Check } from 'lucide-react'

export default function GeminiCopilot({
  selectedObject,
  position,
  tleSource,
  missionPhase,
  captureMethod,
  onBriefGenerated,
}) {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (!apiKey) {
    return (
      <div className="panel-section copilot-section">
        <h3 className="section-title copilot-title">
          <Sparkles size={13} /> GUARDIAN AI Copilot
        </h3>
        <p className="copilot-desc">Explains the debris risk and cleanup plan using Gemini</p>
        <div className="copilot-missing-key">
          Add VITE_GEMINI_API_KEY in .env.local to enable GUARDIAN AI Copilot.
        </div>
      </div>
    )
  }

  const systemInstruction = `You are GUARDIAN, the AI mission assistant for AstroIntellect. AstroIntellect estimates the position, speed, altitude, and risk of tracked orbital objects using public TLE data and satellite.js propagation. You explain debris cleanup missions in simple language for hackathon judges. Never claim exact tracking. Never claim the prototype physically removes debris. Explain this as a conceptual cleanup planning demo. Keep answers clear, impressive, and honest. Keep the answer under 180 words. Mention that position and speed are estimates. Focus on cleanup planning. Avoid fake exact claims.`

  const getAppStateText = () => {
    return `
App State:
- Selected Object Name: ${selectedObject?.name || 'Unknown'}
- NORAD ID: ${selectedObject?.noradId || 'Unknown'}
- Object Type: ${selectedObject?.type || 'Unknown'}
- Risk Level: ${selectedObject?.riskLevel || 'Unknown'}
- Estimated Altitude: ${position?.altitude ? position.altitude.toFixed(1) + ' km' : 'Unknown'}
- Estimated Speed: ${position?.velocity ? position.velocity.toFixed(2) + ' km/s' : 'Unknown'}
- Latitude: ${position?.latitude ? position.latitude.toFixed(4) : 'Unknown'}
- Longitude: ${position?.longitude ? position.longitude.toFixed(4) : 'Unknown'}
- Data Source: ${tleSource || 'Unknown'}
- Selected Cleanup Method: ${captureMethod}
- Current Mission Phase: ${missionPhase}
`
  }

  const handlePrompt = async (promptType) => {
    setLoading(true)
    setError(null)
    setResponse(null)
    setCopied(false)

    let buttonPrompt = ''
    switch (promptType) {
      case 'explainRisk':
        buttonPrompt = 'Explain why this selected debris object is risky and why tracking it matters before attempting cleanup.'
        break
      case 'recommendCleanup':
        buttonPrompt = 'Explain why the selected cleanup method is suitable for this object. Compare briefly with one other method.'
        break
      case 'missionBrief':
        buttonPrompt = 'Write a 150-word mission brief for a cleanup satellite targeting this object using the selected cleanup method.'
        break
      case 'explainNew':
        buttonPrompt = "Explain this whole debris cleanup situation in very simple words for someone new to space technology."
        break
      default:
        break
    }

    const fullPrompt = `${systemInstruction}\n\n${getAppStateText()}\n\nUser Request: ${buttonPrompt}`

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to fetch from Gemini API.')
      }

      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.'
      setResponse(text)
      
      if (promptType === 'missionBrief' && onBriefGenerated) {
        onBriefGenerated(text)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (response) {
      navigator.clipboard.writeText(response)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="panel-section copilot-section">
      <h3 className="section-title copilot-title">
        <Sparkles size={13} /> GUARDIAN AI Copilot
      </h3>
      <p className="copilot-desc">Explains the debris risk and cleanup plan using Gemini</p>
      
      <div className="copilot-buttons">
        <button className="copilot-btn" onClick={() => handlePrompt('explainRisk')} disabled={loading}>Explain Risk</button>
        <button className="copilot-btn" onClick={() => handlePrompt('recommendCleanup')} disabled={loading}>Recommend Cleanup</button>
        <button className="copilot-btn" onClick={() => handlePrompt('missionBrief')} disabled={loading}>Generate Mission Brief</button>
        <button className="copilot-btn" onClick={() => handlePrompt('explainNew')} disabled={loading}>Explain Like I'm New</button>
      </div>

      {loading && (
        <div className="copilot-loading">
          <Loader2 className="spinner" size={16} /> Generating explanation...
        </div>
      )}

      {error && (
        <div className="copilot-error">
          {error}
        </div>
      )}

      {response && !loading && (
        <div className="copilot-response-card">
          <div className="copilot-response-content">{response}</div>
          <button className="copilot-copy-btn" onClick={handleCopy} title="Copy Response">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      )}
    </div>
  )
}
