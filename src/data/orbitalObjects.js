// Orbital objects with fallback TLE data
// TLE lines sourced from CelesTrak public data (educational/demonstration purposes)

export const ORBITAL_OBJECTS = [
  {
    id: 'iss',
    name: 'ISS (ZARYA)',
    noradId: 25544,
    type: 'Space Station',
    riskLevel: 'LOW',
    description: 'International Space Station — used as a live verification reference for orbital propagation accuracy.',
    fallbackTle: {
      line1: '1 25544U 98067A   24115.50000000  .00010000  00000-0  18000-3 0  9994',
      line2: '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.49948467000000',
    },
  },
  {
    id: 'fengyun1c',
    name: 'FENGYUN 1C DEB',
    noradId: 25730,
    type: 'Debris Fragment',
    riskLevel: 'CRITICAL',
    description: 'Fragment from the 2007 Chinese ASAT test that destroyed FENGYUN 1C. One of the largest debris-generating events in history.',
    fallbackTle: {
      line1: '1 25730U 99025A   24115.50000000  .00000000  00000-0  00000-0 0  9991',
      line2: '2 25730  98.6400  85.2300 0010000  45.0000 315.1800 14.20100000000000',
    },
  },
  {
    id: 'envisat',
    name: 'ENVISAT',
    noradId: 27386,
    type: 'Dead Satellite',
    riskLevel: 'HIGH',
    description: 'ESA\'s 8-tonne Earth observation satellite, defunct since 2012. One of the largest pieces of trackable debris in LEO.',
    fallbackTle: {
      line1: '1 27386U 02009A   24115.50000000  .00000000  00000-0  00000-0 0  9996',
      line2: '2 27386  98.1720  45.6890 0001200  90.5430 269.5870 14.37900000000000',
    },
  },
  {
    id: 'iridium33',
    name: 'IRIDIUM 33 DEB',
    noradId: 33442,
    type: 'Collision Remnant',
    riskLevel: 'HIGH',
    description: 'Fragment from the 2009 Kosmos-2251 / Iridium 33 collision — the first-ever accidental satellite collision in orbit.',
    fallbackTle: {
      line1: '1 33442U 09005B   24115.50000000  .00000000  00000-0  00000-0 0  9999',
      line2: '2 33442  86.3900 122.4500 0014000 200.5600 159.5200 14.12100000000000',
    },
  },
]

/**
 * Attempts to fetch fresh TLE data from CelesTrak for a given NORAD ID.
 * Falls back to hardcoded TLE if network request fails.
 * @param {object} obj - Orbital object from ORBITAL_OBJECTS
 * @returns {Promise<{line1: string, line2: string, source: string}>}
 */
export async function fetchTleData(obj) {
  try {
    const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${obj.noradId}&FORMAT=TLE`
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const text = await response.text()
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
    // TLE format: name line, line1, line2
    if (lines.length >= 3) {
      return {
        line1: lines[1],
        line2: lines[2],
        source: 'Fresh CelesTrak TLE',
      }
    }
    throw new Error('Invalid TLE format from CelesTrak')
  } catch (err) {
    console.warn(`[AstroIntellect] CelesTrak fetch failed for ${obj.name} (NORAD ${obj.noradId}): ${err.message}. Using fallback TLE.`)
    return {
      ...obj.fallbackTle,
      source: 'Fallback Demo TLE',
    }
  }
}
