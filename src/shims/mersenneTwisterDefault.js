class MersenneTwisterShim {
  constructor(seed = Date.now()) {
    this._state = (seed >>> 0) || 1
  }

  random() {
    // Deterministic 32-bit PRNG fallback for Cesium.Math usage.
    this._state = (1664525 * this._state + 1013904223) >>> 0
    return this._state / 4294967296
  }
}

export default MersenneTwisterShim
