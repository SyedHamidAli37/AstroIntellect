import { Info, Globe, ShieldAlert, Target, Sparkles, AlertTriangle, BookOpen } from 'lucide-react'

export default function ImpactAbout() {
  return (
    <div className="tab-content impact-tab">
      <div className="brief-header">
        <h2>Impact & About</h2>
        <p className="brief-subtitle">Understanding AstroIntellect and the Space Debris Crisis</p>
      </div>

      <div className="impact-grid">
        <div className="impact-card">
          <div className="impact-card-header"><Info size={16} /> What AstroIntellect does</div>
          <div className="impact-card-body">
            AstroIntellect is a mission-planning prototype that visualizes estimated orbits of space debris using public data. It simulates conceptual cleanup operations to help visualize how we might remove dangerous junk from Earth's orbit.
          </div>
        </div>

        <div className="impact-card">
          <div className="impact-card-header"><ShieldAlert size={16} /> Why space debris is dangerous</div>
          <div className="impact-card-body">
            Even tiny pieces of debris travel at incredibly high speeds (over 25,000 km/h). A collision with an active satellite or the ISS can cause catastrophic damage and create even more debris in a chain reaction known as the Kessler Syndrome.
          </div>
        </div>

        <div className="impact-card">
          <div className="impact-card-header"><Target size={16} /> Why tracking comes before cleaning</div>
          <div className="impact-card-body">
            Space is vast, and objects move extremely fast. Before we can send a cleanup satellite to capture debris with a net or robotic arm, we must accurately calculate its orbit, speed, and trajectory to perform a precise orbital rendezvous.
          </div>
        </div>

        <div className="impact-card">
          <div className="impact-card-header"><Globe size={16} /> Why a 3D orbit view?</div>
          <div className="impact-card-body">
            Unlike cars on a flat map, satellites travel in complex 3D paths around a spherical Earth. A 3D view is essential to understand altitude, orbital inclination, and the true spatial relationship between cleanup satellites and debris targets.
          </div>
        </div>

        <div className="impact-card">
          <div className="impact-card-header"><Sparkles size={16} /> What Gemini does</div>
          <div className="impact-card-body">
            The GUARDIAN AI Copilot (powered by Gemini) acts as an intelligent mission assistant. It translates complex orbital parameters and cleanup methods into simple, beginner-friendly explanations for non-technical users and judges.
          </div>
        </div>

        <div className="impact-card warning-card">
          <div className="impact-card-header"><AlertTriangle size={16} /> Prototype Limitations</div>
          <div className="impact-card-body">
            This prototype estimates the motion of tracked orbital objects using public TLE data. It does not track unobserved tiny debris, does not provide official collision-avoidance accuracy, and does not physically remove debris. The cleanup sequence is a conceptual simulation for mission planning.
          </div>
        </div>
      </div>

      <div className="sdg-section">
        <h3 className="section-title"><BookOpen size={16} /> UN Sustainable Development Goals (SDGs)</h3>
        <div className="sdg-grid">
          <div className="sdg-card">
            <div className="sdg-title">SDG 9: Industry & Innovation</div>
            <p>Supports safer, resilient satellite infrastructure and communications.</p>
          </div>
          <div className="sdg-card">
            <div className="sdg-title">SDG 13: Climate Action</div>
            <p>Protects Earth-observation satellites that monitor climate change.</p>
          </div>
          <div className="sdg-card">
            <div className="sdg-title">SDG 17: Partnerships</div>
            <p>Encourages shared orbital safety intelligence between agencies.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
