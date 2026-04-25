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

function createEarthCanvasTexture(renderer) {
  const width = 1024
  const height = 512
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) return null

  // Ocean base gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height)
  oceanGrad.addColorStop(0, '#0c2558')
  oceanGrad.addColorStop(0.45, '#123c7f')
  oceanGrad.addColorStop(1, '#091b44')
  ctx.fillStyle = oceanGrad
  ctx.fillRect(0, 0, width, height)

  // Subtle ocean glow patches
  for (let i = 0; i < 14; i += 1) {
    const x = (i * 79) % width
    const y = ((i * 137) % height)
    const r = 90 + (i % 5) * 26
    const g = ctx.createRadialGradient(x, y, 8, x, y, r)
    g.addColorStop(0, 'rgba(84, 180, 255, 0.18)')
    g.addColorStop(1, 'rgba(84, 180, 255, 0.0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const continentColorA = 'rgba(44, 168, 130, 0.85)'
  const continentColorB = 'rgba(58, 196, 148, 0.76)'
  const continentSets = [
    [[170, 130], [220, 92], [290, 102], [336, 142], [326, 202], [274, 242], [215, 232], [160, 186]],
    [[420, 192], [476, 160], [548, 170], [598, 216], [588, 272], [532, 304], [466, 286], [415, 236]],
    [[695, 132], [744, 101], [811, 108], [866, 142], [878, 201], [838, 244], [772, 252], [708, 210]],
    [[772, 325], [832, 296], [886, 314], [916, 360], [900, 410], [847, 432], [794, 418], [758, 372]],
    [[286, 320], [345, 298], [406, 318], [434, 364], [419, 411], [370, 432], [313, 416], [275, 370]],
  ]

  continentSets.forEach((poly, idx) => {
    ctx.beginPath()
    poly.forEach(([x, y], pIdx) => {
      if (pIdx === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fillStyle = idx % 2 === 0 ? continentColorA : continentColorB
    ctx.fill()
  })

  // Latitude / longitude grid
  ctx.strokeStyle = 'rgba(170, 220, 255, 0.16)'
  ctx.lineWidth = 1
  for (let x = 0; x <= width; x += 64) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y <= height; y += 48) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // Soft cloud-like strokes
  ctx.strokeStyle = 'rgba(230, 245, 255, 0.22)'
  ctx.lineWidth = 4
  for (let i = 0; i < 24; i += 1) {
    const x = (i * 113) % width
    const y = 40 + ((i * 67) % (height - 80))
    const w = 38 + (i % 4) * 12
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.bezierCurveTo(x + w * 0.35, y - 12, x + w * 0.7, y + 12, x + w, y)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true

  return texture
}

export default function OrbitViewer({
  selectedObject,
  tleData,
  onPositionUpdate,
  missionPhase,
  simulationActive,
  captureProgress,
  captureMethod = 'NET_CAPTURE',
}) {
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
  const netRingRef = useRef(null)
  const reqAnimFrameRef = useRef(null)
  const intervalRef = useRef(null)
  const satrec = useRef(null)
  const debrisPositionRef = useRef(new THREE.Vector3())
  const cleanupBasePositionRef = useRef(new THREE.Vector3())
  const debrisLabelRef = useRef(null)
  const cleanupLabelRef = useRef(null)
  const debrisHaloRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || rendererRef.current) return

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#050816')
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000)
    camera.position.set(0, 2, 5)
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

    // Ambient Light keeps nightside readable in demo mode.
    const ambientLight = new THREE.AmbientLight(0xa9c9ff, 0.48)
    scene.add(ambientLight)

    // Main sunlight
    const dirLight = new THREE.DirectionalLight(0xd6ecff, 1.9)
    dirLight.position.set(5, 3.5, 4.5)
    scene.add(dirLight)

    // Camera-side fill light for shape readability.
    const pointLight = new THREE.PointLight(0x8cc8ff, 0.5, 18)
    pointLight.position.set(0, 2.5, 4.5)
    scene.add(pointLight)

    // Earth Sphere
    const earthTexture = createEarthCanvasTexture(renderer)
    const earthGeometry = new THREE.SphereGeometry(1, 64, 64)
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture || null,
      color: 0x2d5ea8,
      emissive: 0x0b1f48,
      emissiveIntensity: 0.32,
      specular: 0x7fb4ff,
      shininess: 22,
    })
    const earth = new THREE.Mesh(earthGeometry, earthMaterial)
    scene.add(earth)

    // Atmosphere glow
    const atmosGeometry = new THREE.SphereGeometry(1.03, 64, 64)
    const atmosMaterial = new THREE.MeshPhongMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.17,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    })
    const atmosphere = new THREE.Mesh(atmosGeometry, atmosMaterial)
    scene.add(atmosphere)

    // Faint equator ring for spatial readability.
    const equatorGeometry = new THREE.TorusGeometry(1.015, 0.0035, 16, 180)
    const equatorMaterial = new THREE.MeshBasicMaterial({
      color: 0x8ad4ff,
      transparent: true,
      opacity: 0.25,
    })
    const equatorRing = new THREE.Mesh(equatorGeometry, equatorMaterial)
    equatorRing.rotation.x = Math.PI / 2
    scene.add(equatorRing)

    // Stars
    const starGeometry = new THREE.BufferGeometry()
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.8 })
    const starVertices = []
    for (let i = 0; i < 2000; i += 1) {
      const x = (Math.random() - 0.5) * 100
      const y = (Math.random() - 0.5) * 100
      const z = (Math.random() - 0.5) * 100
      if (Math.abs(x) < 3 && Math.abs(y) < 3 && Math.abs(z) < 3) continue
      starVertices.push(x, y, z)
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3))
    const stars = new THREE.Points(starGeometry, starMaterial)
    scene.add(stars)

    setViewerReady(true)

    const onResize = () => {
      if (!containerRef.current || !renderer || !camera) return
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener('resize', onResize)

    const animate = () => {
      reqAnimFrameRef.current = requestAnimationFrame(animate)

      earth.rotation.y += 0.0005
      atmosphere.rotation.y += 0.0005

      const debrisPos = debrisPositionRef.current
      const cleanupBasePos = cleanupBasePositionRef.current

      if (debrisMeshRef.current) {
        // Reset scale and color
        debrisMeshRef.current.scale.setScalar(1)
        if (missionPhase !== 'SECURED') {
           // We have a group now, find the core and halo
           debrisMeshRef.current.children[0].material.color.setHex(RISK_COLORS[selectedObject?.riskLevel] || RISK_COLORS.MEDIUM)
           debrisMeshRef.current.children[1].material.color.setHex(RISK_COLORS[selectedObject?.riskLevel] || RISK_COLORS.MEDIUM)
           debrisMeshRef.current.children[1].material.opacity = 0.3
        }
      }
      if (cleanupMeshRef.current) {
        cleanupMeshRef.current.scale.setScalar(1)
        cleanupMeshRef.current.material.color.setHex(0x00d4ff)
      }
      if (orbitLineRef.current?.material) {
        orbitLineRef.current.material.color.setHex(0x00d4ff)
        orbitLineRef.current.material.opacity = 0.5
      }
      if (interceptLineRef.current) {
        interceptLineRef.current.visible = Boolean(debrisMeshRef.current && cleanupMeshRef.current)
        interceptLineRef.current.material.opacity = 0.8
      }
      if (netRingRef.current) {
        netRingRef.current.visible = false
      }

      if (simulationActive && missionPhase === 'TRACKING') {
        const pulse = 1 + 0.4 * Math.sin(Date.now() * 0.008)
        if (debrisMeshRef.current) {
          debrisMeshRef.current.children[1].scale.setScalar(pulse)
          debrisMeshRef.current.children[1].material.opacity = 0.5 + 0.2 * Math.sin(Date.now() * 0.015)
        }
        if (orbitLineRef.current?.material) {
          orbitLineRef.current.material.color.setHex(0x74f4ff)
          orbitLineRef.current.material.opacity = 1.0
        }
        if (netRingRef.current) {
          netRingRef.current.visible = true
          netRingRef.current.position.copy(debrisPos)
          netRingRef.current.scale.setScalar(1.5 + 0.5 * Math.sin(Date.now() * 0.01))
          netRingRef.current.material.opacity = 0.15
        }
      }

      if (cleanupMeshRef.current && debrisMeshRef.current) {
        if (simulationActive && missionPhase === 'INTERCEPT') {
          // Move from trailing position to debris position based on captureProgress
          const approachFactor = Math.min(captureProgress * 1.5, 0.95)
          const simCleanup = cleanupBasePos.clone().lerp(debrisPos, approachFactor)
          cleanupMeshRef.current.position.copy(simCleanup)
          
          const pulse = 1 + 0.4 * Math.sin(Date.now() * 0.012)
          cleanupMeshRef.current.scale.setScalar(pulse)
          cleanupMeshRef.current.material.color.setHex(0x74f4ff)

          if (interceptLineRef.current) {
            const distance = simCleanup.distanceTo(debrisPos)
            interceptLineRef.current.position.copy(simCleanup)
            interceptLineRef.current.lookAt(debrisPos)
            interceptLineRef.current.scale.set(1, 1, distance)
            interceptLineRef.current.visible = true
            interceptLineRef.current.material.opacity = 0.6 + 0.4 * Math.sin(Date.now() * 0.02)
          }
        } else {
          cleanupMeshRef.current.position.copy(cleanupBasePos)
          if (interceptLineRef.current) {
            const distance = cleanupBasePos.distanceTo(debrisPos)
            interceptLineRef.current.position.copy(cleanupBasePos)
            interceptLineRef.current.lookAt(debrisPos)
            interceptLineRef.current.scale.set(1, 1, distance)
          }
        }
      }

      if (simulationActive && missionPhase === 'NET_CAPTURE' && netRingRef.current) {
        const ringScale = 0.5 + captureProgress * 4.0
        netRingRef.current.visible = true
        netRingRef.current.position.copy(debrisPos)
        netRingRef.current.scale.setScalar(ringScale)
        netRingRef.current.material.opacity = Math.max(0.6 * (1 - captureProgress), 0.15)
        
        // Ensure intercept line connects to debris accurately
        if (interceptLineRef.current) {
           const approachFactor = 0.95
           const simCleanup = cleanupBasePos.clone().lerp(debrisPos, approachFactor)
           cleanupMeshRef.current.position.copy(simCleanup)
           const distance = simCleanup.distanceTo(debrisPos)
           interceptLineRef.current.position.copy(simCleanup)
           interceptLineRef.current.lookAt(debrisPos)
           interceptLineRef.current.scale.set(1, 1, distance)
        }
      }

      if (missionPhase === 'SECURED') {
        if (netRingRef.current) {
          netRingRef.current.visible = true
          netRingRef.current.position.copy(debrisPos)
          netRingRef.current.scale.setScalar(3.5)
          netRingRef.current.material.opacity = 0.4 + 0.1 * Math.sin(Date.now() * 0.005)
        }
        if (debrisMeshRef.current) {
          // Change to green/cyan for secured
          debrisMeshRef.current.children[0].material.color.setHex(0x2ed573)
          debrisMeshRef.current.children[1].material.color.setHex(0x2ed573)
          debrisMeshRef.current.children[1].material.opacity = 0.2
        }
        if (interceptLineRef.current) {
          interceptLineRef.current.material.opacity = 0.2
        }
        if (cleanupMeshRef.current) {
           const approachFactor = 0.95
           const simCleanup = cleanupBasePos.clone().lerp(debrisPos, approachFactor)
           cleanupMeshRef.current.position.copy(simCleanup)
        }
      }

      // Update 2D labels
      if (cameraRef.current && rendererRef.current && containerRef.current) {
         const updateLabel = (meshRef, labelRef, isVisible) => {
           if (!labelRef.current) return
           // If meshRef is a group, position based on the group
           if (meshRef.current && isVisible) {
             const vector = meshRef.current.position.clone()
             vector.project(cameraRef.current)
             if (vector.z > 1) {
                labelRef.current.style.opacity = 0
                return
             }
             const x = (vector.x * 0.5 + 0.5) * containerRef.current.clientWidth
             const y = (vector.y * -0.5 + 0.5) * containerRef.current.clientHeight
             labelRef.current.style.transform = `translate(-50%, -150%) translate(${x}px, ${y}px)`
             labelRef.current.style.opacity = 1
           } else {
             labelRef.current.style.opacity = 0
           }
         }

         updateLabel(debrisMeshRef, debrisLabelRef, true)
         updateLabel(cleanupMeshRef, cleanupLabelRef, simulationActive && missionPhase !== 'SECURED' && missionPhase !== 'IDLE')
      }

      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      window.removeEventListener('resize', onResize)
      if (reqAnimFrameRef.current) cancelAnimationFrame(reqAnimFrameRef.current)
      if (rendererRef.current) {
        rendererRef.current.dispose()
        if (earthTexture) earthTexture.dispose()
        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement)
        }
      }
      rendererRef.current = null
    }
  }, [])

  const clearEntities = useCallback(() => {
    const scene = sceneRef.current
    if (!scene) return
    if (debrisMeshRef.current) { scene.remove(debrisMeshRef.current); debrisMeshRef.current = null }
    if (cleanupMeshRef.current) { scene.remove(cleanupMeshRef.current); cleanupMeshRef.current = null }
    if (orbitLineRef.current) { scene.remove(orbitLineRef.current); orbitLineRef.current = null }
    if (interceptLineRef.current) { scene.remove(interceptLineRef.current); interceptLineRef.current = null }
    if (netRingRef.current) { scene.remove(netRingRef.current); netRingRef.current = null }
  }, [])

  useEffect(() => {
    if (!viewerReady || !tleData || !selectedObject) return
    const scene = sceneRef.current
    if (!scene) return

    clearEntities()
    if (intervalRef.current) clearInterval(intervalRef.current)

    satrec.current = parseTle(tleData.line1, tleData.line2)
    const riskColor = RISK_COLORS[selectedObject.riskLevel] || RISK_COLORS.MEDIUM

    const now = new Date()
    const pathPositions = generateOrbitPath(satrec.current, now, 90, 60)

    const orbitCurve = new THREE.CatmullRomCurve3(pathPositions, true)
    const orbitGeometry = new THREE.TubeGeometry(orbitCurve, 128, 0.005, 8, true)
    const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.8 })
    orbitLineRef.current = new THREE.Mesh(orbitGeometry, orbitMaterial)
    scene.add(orbitLineRef.current)

    const debrisGroup = new THREE.Group()
    const debrisGeom = new THREE.SphereGeometry(0.05, 32, 32)
    const debrisMat = new THREE.MeshBasicMaterial({ color: riskColor })
    const debrisCore = new THREE.Mesh(debrisGeom, debrisMat)
    
    const haloGeom = new THREE.SphereGeometry(0.08, 32, 32)
    const haloMat = new THREE.MeshBasicMaterial({ color: riskColor, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending })
    const debrisHalo = new THREE.Mesh(haloGeom, haloMat)
    
    debrisGroup.add(debrisCore)
    debrisGroup.add(debrisHalo)
    debrisMeshRef.current = debrisGroup
    scene.add(debrisMeshRef.current)

    const cleanupGeom = new THREE.SphereGeometry(0.04, 32, 32)
    const cleanupMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff })
    cleanupMeshRef.current = new THREE.Mesh(cleanupGeom, cleanupMat)
    scene.add(cleanupMeshRef.current)

    const interceptGeom = new THREE.CylinderGeometry(0.004, 0.004, 1, 8)
    interceptGeom.translate(0, 0.5, 0)
    interceptGeom.rotateX(Math.PI / 2)
    const interceptMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.8 })
    interceptLineRef.current = new THREE.Mesh(interceptGeom, interceptMat)
    scene.add(interceptLineRef.current)

    const ringGeom = new THREE.SphereGeometry(0.04, 16, 16)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.28,
      wireframe: true,
    })
    netRingRef.current = new THREE.Mesh(ringGeom, ringMat)
    netRingRef.current.visible = false
    scene.add(netRingRef.current)

    const tick = () => {
      const currentNow = new Date()
      const info = propagateOrbit(satrec.current, currentNow)
      const cleanupInfo = getCleanupSatPosition(satrec.current, currentNow)

      if (!info || !cleanupInfo || !debrisMeshRef.current || !cleanupMeshRef.current || !interceptLineRef.current) return

      const debrisPos = geodeticToVector3(info.latitude, info.longitude, info.altitude)
      const cleanupPosBase = geodeticToVector3(cleanupInfo.latitude, cleanupInfo.longitude, cleanupInfo.altitude)
      
      // Offset highly outward from earth center to ensure clear demo visibility
      const outwardDir = cleanupPosBase.clone().normalize()
      const cleanupPos = cleanupPosBase.add(outwardDir.multiplyScalar(0.08))

      debrisPositionRef.current.copy(debrisPos)
      cleanupBasePositionRef.current.copy(cleanupPos)
      debrisMeshRef.current.position.copy(debrisPos)
      cleanupMeshRef.current.position.copy(cleanupPos)
      interceptLineRef.current.geometry.setFromPoints([cleanupPos, debrisPos])

      if (netRingRef.current) {
        netRingRef.current.position.copy(debrisPos)
      }

      if (onPositionUpdate) onPositionUpdate(info)

      if (focused && controlsRef.current) {
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

    const dir = targetPos.clone().normalize()
    cameraRef.current.position.copy(targetPos).add(dir.multiplyScalar(3.2))
  }, [])

  const handleResetView = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return
    setFocused(false)
    controlsRef.current.target.set(0, 0, 0)
    cameraRef.current.position.set(0, 2, 5)
  }, [])

  useEffect(() => {
    if (simulationActive && missionPhase === 'TRACKING') {
      handleFocusTarget()
    }
  }, [simulationActive, missionPhase, handleFocusTarget])

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
      <div className="simulation-labels">
        {simulationActive && missionPhase === 'TRACKING' && <div className="sim-label tracking">TARGET LOCKED</div>}
        {simulationActive && missionPhase === 'INTERCEPT' && <div className="sim-label intercept">INTERCEPTING</div>}
        {simulationActive && missionPhase === 'NET_CAPTURE' && (
          <div className="sim-label capture">
            {captureMethod === 'NET_CAPTURE' && 'NET DEPLOYED'}
            {captureMethod === 'ROBOTIC_ARM' && 'ARM GRAPPLED'}
            {captureMethod === 'MAGNETIC_TETHER' && 'TETHER ATTACHED'}
            {captureMethod === 'LASER_PUSH' && 'LASER FIRING'}
          </div>
        )}
        {missionPhase === 'SECURED' && <div className="sim-label secured">TARGET SECURED</div>}
      </div>
      <div className="sim-disclaimer-overlay">
        Visualized cleanup concept — sizes and motion exaggerated for demo clarity.
      </div>
      <div className="viewer-legend">
        <div className="legend-item"><span className="legend-dot debris" /> Debris Target</div>
        <div className="legend-item"><span className="legend-dot cleanup" /> CleanupSat-1</div>
        <div className="legend-item"><span className="legend-dot secured" /> Secured Target</div>
        <div className="legend-item"><span className="legend-line intercept" /> Intercept Path</div>
      </div>
      <div ref={debrisLabelRef} className="object-label debris-label" style={{ position: 'absolute', opacity: 0, top: 0, left: 0 }}>
        DEBRIS TARGET
      </div>
      <div ref={cleanupLabelRef} className="object-label cleanup-label" style={{ position: 'absolute', opacity: 0, top: 0, left: 0 }}>
        CLEANUPSAT-1
      </div>
      {!viewerReady && (
        <div className="viewer-loading">
          <div className="loading-spinner" />
          <span>Initializing 3D Globe...</span>
        </div>
      )}
    </div>
  )
}
