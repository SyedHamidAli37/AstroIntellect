/**
 * AstroIntellect — satellite.js pure-JS shim
 * Uses relative paths into node_modules to bypass the WASM sub-packages
 * (satellite.js/wasm/**) that cause Vite 8 / rolldown build failures.
 */
export { twoline2satrec, json2satrec } from '../../node_modules/satellite.js/dist/io.js'
export { propagate, sgp4, gstime } from '../../node_modules/satellite.js/dist/propagation.js'
export {
  eciToGeodetic,
  eciToEcf,
  ecfToEci,
  ecfToLookAngles,
  geodeticToEcf,
  radiansToDegrees,
  degreesToRadians,
} from '../../node_modules/satellite.js/dist/transforms.js'
export { jday, invjday } from '../../node_modules/satellite.js/dist/ext.js'
export * as constants from '../../node_modules/satellite.js/dist/constants.js'
