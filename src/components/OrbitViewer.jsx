import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { parseTle, generateOrbitPath, propagateOrbit, getCleanupSatPosition, geodeticToVector3 } from '../utils/orbitMath'

const RISK_COLORS = {
  CRITICAL: 0xff4757,
  HIGH: 0xff9f1c,
  MEDIUM: 0xffd32a,
  LOW: 0x2ed573,
}

export default function OrbitViewer({ selectedObject, tleData, onPositionUpdate }) {
  const containerRef = useRef(null)
  const [viewerReady, setViewerReady] = useState(false)
  const [focused, setFocused] = useState(false)

  // Three.js refs
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const controlsRef = useRef(null)
  const debrisMeshRef = useRef(null)
  const cleanupMeshRef = useRef(null)
  const orbitLineRef = useRef(null)
  const interceptLineRef = useRef(null)
  const reqAnimFrameRef = useRef(null)
  const intervalRef = useRef(null)
  const satrec = useRef(null)

  useEffect(() => {
    if (!containerRef.current || rendererRef.current) return

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#050816')
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000)
    camera.position.set(0, 2, 5) // high above Earth
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 1.1
    controls.maxDistance = 20
    controlsRef.current = controls

    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
    scene.add(ambientLight)

    // Directional Light
    const dirLight = new THREE.DirectionalLight(0xffffff, 2)
    dirLight.position.set(5, 3, 5)
    scene.add(dirLight)

    // Earth Sphere
    const earthGeometry = new THREE.SphereGeometry(1, 64, 64)
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0x1e272e,
      emissive: 0x050a1f,
      specular: 0x111111,
      shininess: 10,
    })
    const earth = new THREE.Mesh(earthGeometry, earthMaterial)
    scene.add(earth)

    // Atmosphere glow
    const atmosGeometry = new THREE.SphereGeometry(1.03, 64, 64)
    const atmosMaterial = new THREE.MeshPhongMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    })
    const atmosphere = new THREE.Mesh(atmosGeometry, atmosMaterial)
    scene.add(atmosphere)

    // Stars
    const starGeometry = new THREE.BufferGeometry()
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.8 })
    const starVertices = []
    for (let i = 0; i < 2000; i++) {
      const x = (Math.random() - 0.5) * 100
      const y = (Math.random() - 0.5) * 100
      const z = (Math.random() - 0.5) * 100
      if (Math.abs(x) < 3 && Math.abs(y) < 3 && Math.abs(z) < 3) continue;
      starVertices.push(x, y, z)
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3))
    const stars = new THREE.Points(starGeometry, starMaterial)
    scene.add(stars)

    setViewerReady(true)

    // Resize handler
    const onResize = () => {
      if (!containerRef.current || !renderer || !camera) return
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // Animation Loop
    const animate = () => {
      reqAnimFrameRef.current = requestAnimationFrame(animate)
      
      // Rotate earth slowly
      earth.rotation.y += 0.0005
      atmosphere.rotation.y += 0.0005

      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      window.removeEventListener('resize', onResize)
      if (reqAnimFrameRef.current) cancelAnimationFrame(reqAnimFrameRef.current)
      if (rendererRef.current) {
        rendererRef.current.dispose()
        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement)
        }
      }
      rendererRef.current = null
    }
  }, [])

  // Update Entities
  const clearEntities = useCallback(() => {
    const scene = sceneRef.current
    if (!scene) return
    if (debrisMeshRef.current) { scene.remove(debrisMeshRef.current); debrisMeshRef.current = null }
    if (cleanupMeshRef.current) { scene.remove(cleanupMeshRef.current); cleanupMeshRef.current = null }
    if (orbitLineRef.current) { scene.remove(orbitLineRef.current); orbitLineRef.current = null }
    if (interceptLineRef.current) { scene.remove(interceptLineRef.current); interceptLineRef.current = null }
  }, [])

  useEffect(() => {
    if (!viewerReady || !tleData || !selectedObject) return
    const scene = sceneRef.current
    if (!scene) return

    clearEntities()
    if (intervalRef.current) clearInterval(intervalRef.current)

    satrec.current = parseTle(tleData.line1, tleData.line2)
    const riskColor = RISK_COLORS[selectedObject.riskLevel] || RISK_COLORS.MEDIUM

    // Orbit Path
    const now = new Date()
    const pathPositions = generateOrbitPath(satrec.current, now, 90, 60)
    
    // Create orbit line
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(pathPositions)
    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.5 })
    orbitLineRef.current = new THREE.Line(orbitGeometry, orbitMaterial)
    scene.add(orbitLineRef.current)

    // Debris Mesh
    const debrisGeom = new THREE.SphereGeometry(0.02, 16, 16)
    const debrisMat = new THREE.MeshBasicMaterial({ color: riskColor })
    debrisMeshRef.current = new THREE.Mesh(debrisGeom, debrisMat)
    scene.add(debrisMeshRef.current)

    // CleanupSat-1 Mesh
    const cleanupGeom = new THREE.SphereGeometry(0.015, 16, 16)
    const cleanupMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff })
    cleanupMeshRef.current = new THREE.Mesh(cleanupGeom, cleanupMat)
    scene.add(cleanupMeshRef.current)

    // Intercept Line
    const interceptGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    const interceptMat = new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.6 })
    interceptLineRef.current = new THREE.Line(interceptGeom, interceptMat)
    scene.add(interceptLineRef.current)

    const tick = () => {
      const currentNow = new Date()
      const info = propagateOrbit(satrec.current, currentNow)
      const cleanupInfo = getCleanupSatPosition(satrec.current, currentNow)
      
      if (!info || !cleanupInfo) return

      const debrisPos = geodeticToVector3(info.latitude, info.longitude, info.altitude)
      const cleanupPos = geodeticToVector3(cleanupInfo.latitude, cleanupInfo.longitude, cleanupInfo.altitude)

      debrisMeshRef.current.position.copy(debrisPos)
      cleanupMeshRef.current.position.copy(cleanupPos)
      
      interceptLineRef.current.geometry.setFromPoints([cleanupPos, debrisPos])

      if (onPositionUpdate) onPositionUpdate(info)

      if (focused && controlsRef.current && cameraRef.current) {
        controlsRef.current.target.copy(debrisPos)
      }
    }

    tick()
    intervalRef.current = setInterval(tick, 2000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [viewerReady, tleData, selectedObject, clearEntities, onPositionUpdate, focused])

  const handleFocusTarget = useCallback(() => {
    if (!debrisMeshRef.current || !cameraRef.current || !controlsRef.current) return
    setFocused(true)
    const targetPos = debrisMeshRef.current.position.clone()
    controlsRef.current.target.copy(targetPos)
    
    // Move camera to look at it from a close distance
    const dir = targetPos.clone().normalize()
    cameraRef.current.position.copy(targetPos).add(dir.multiplyScalar(0.5))
  }, [])

  const handleResetView = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return
    setFocused(false)
    controlsRef.current.target.set(0, 0, 0)
    cameraRef.current.position.set(0, 2, 5)
  }, [])

  return (
    <div className="orbit-viewer-wrapper">
      <div ref={containerRef} className="three-container" style={{ width: '100%', height: '100%' }} />
      <div className="orbit-controls">
        <button
          className={`orbit-btn ${focused ? 'orbit-btn--active' : ''}`}
          onClick={handleFocusTarget}
          title="Focus on debris target"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          Focus Target
        </button>
        <button className="orbit-btn" onClick={handleResetView} title="Reset view to Earth">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          Reset View
        </button>
      </div>
      {!viewerReady && (
        <div className="viewer-loading">
          <div className="loading-spinner" />
          <span>Initializing 3D Globe…</span>
        </div>
      )}
    </div>
  )
}
