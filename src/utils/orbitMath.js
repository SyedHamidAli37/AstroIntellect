import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
} from './satelliteShim.js'
import * as THREE from 'three'
const DEG = 180 / Math.PI

/**
 * Parse TLE lines into a satellite record.
 * @param {string} line1
 * @param {string} line2
 * @returns {object} satrec
 */
export function parseTle(line1, line2) {
  return twoline2satrec(line1, line2)
}

/**
 * Propagate a satellite to the given Date and return geodetic info.
 * @param {object} satrec
 * @param {Date} date
 * @returns {{ latitude: number, longitude: number, altitude: number, velocity: number, timestamp: Date } | null}
 */
export function propagateOrbit(satrec, date) {
  const posVel = propagate(satrec, date)
  if (!posVel || !posVel.position || posVel.position === true) return null

  const { position, velocity } = posVel
  const gmst = gstime(date)
  const geodetic = eciToGeodetic(position, gmst)

  const lat = geodetic.latitude * DEG
  const lon = geodetic.longitude * DEG
  const alt = geodetic.height // km

  // Velocity magnitude (km/s)
  const vel = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2)

  return {
    latitude: lat,
    longitude: lon,
    altitude: alt,
    velocity: vel,
    timestamp: date,
  }
}

/**
 * Convert geodetic coordinates to Three.js Vector3.
 * Earth radius is 1 unit. Altitude is exaggerated for visibility.
 */
export function geodeticToVector3(lat, lon, alt) {
  const R = 1;
  const altScaled = alt / 6371; 
  const r = R + altScaled * 2; // exaggerated altitude scale
  const phi = (90 - lat) * (Math.PI / 180);
  // Three.js spherical to cartesian conversion (Y up)
  // adding offset to align with typical Earth texture maps
  const theta = (lon + 90) * (Math.PI / 180); 

  const x = -(r * Math.sin(phi) * Math.cos(theta));
  const z = (r * Math.sin(phi) * Math.sin(theta));
  const y = (r * Math.cos(phi));

  return new THREE.Vector3(x, y, z);
}

/**
 * Convert ECI position to Three.js Vector3.
 */
function eciToVector3(posEci, gmst) {
  const geo = eciToGeodetic(posEci, gmst)
  const lat = geo.latitude * DEG;
  const lon = geo.longitude * DEG;
  return geodeticToVector3(lat, lon, geo.height);
}

/**
 * Generate the next orbital path as Three.js Vector3 positions.
 * @param {object} satrec
 * @param {Date} startTime
 * @param {number} minutes - how many minutes ahead to compute (default 90)
 * @param {number} stepSeconds - time resolution in seconds (default 60)
 * @returns {THREE.Vector3[]}
 */
export function generateOrbitPath(satrec, startTime, minutes = 90, stepSeconds = 60) {
  const positions = []
  const steps = Math.floor((minutes * 60) / stepSeconds)

  for (let i = 0; i <= steps; i++) {
    const t = new Date(startTime.getTime() + i * stepSeconds * 1000)
    const posVel = propagate(satrec, t)
    if (!posVel || !posVel.position || posVel.position === true) continue
    const gmst = gstime(t)
    try {
      const vec = eciToVector3(posVel.position, gmst)
      positions.push(vec)
    } catch {
      // skip degenerate positions
    }
  }

  return positions
}

/**
 * Get a position ~45 seconds behind the debris — simulates CleanupSat-1.
 */
export function getCleanupSatPosition(satrec, date) {
  const behindDate = new Date(date.getTime() - 45 * 1000)
  return propagateOrbit(satrec, behindDate)
}
