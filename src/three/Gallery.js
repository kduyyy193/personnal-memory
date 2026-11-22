import * as THREE from 'three'
import { skin } from './skin'
import { phi, frame } from './path'

function tex(canvas) {
  const t = new THREE.CanvasTexture(canvas)
  t.anisotropy = 8
  return t
}

// Keep the same colour behaviour as the original single-file build (no sRGB conversion).
THREE.ColorManagement.enabled = false

const BG = 0xf2f2f2
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x) }

// Layout constants
const W = 4.4, H = 8, CH = 40, STEP = 0.4            // corridor half-width, wall height, chunk length, sample step
const SP = 8.5, S0 = 7, PW = 2.7, PH = 3.375, PY = 3.2, FOCUS_D = 5.0
const LOOK = 5, CAM_Y = 3.2

/**
 * Creates the whole 3D gallery on a canvas and returns a small imperative API for React.
 * handlers: { onFocus(item|null), onOpen(item), onHud(stationIndex) }
 */
export function createGallery(canvas, handlers, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(BG)
  scene.fog = new THREE.Fog(BG, 16, 68)
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200)
  const slots = opts.slots || []   // slot j -> station floor(j/2), left side for even j, right side for odd j

  /* ---------- theme (0 = light, 1 = dark) ---------- */
  const LIGHT = { bg: new THREE.Color(BG), corr: new THREE.Color(1, 1, 1), blank: new THREE.Color(0xffffff) }
  const DARK = { bg: new THREE.Color(0x0a0c16), corr: new THREE.Color(0.115, 0.125, 0.18), blank: new THREE.Color(0x22253a) }
  let themeT = opts.dark ? 1 : 0, themeTarget = themeT, texDark = themeT > 0.5

  /* ---------- starry sky (only visible in dark mode, follows the camera) ---------- */
  const sky = new THREE.Group()
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
    uniforms: { uOpacity: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vDir; uniform float uOpacity;
      void main(){
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(vec3(0.045,0.055,0.12), vec3(0.008,0.012,0.04), pow(h, 0.55));
        vec3 moonDir = normalize(vec3(-0.32, 0.5, -0.8));
        float d = dot(normalize(vDir), moonDir);
        col += vec3(0.95,0.96,1.0) * smoothstep(0.9984, 0.9990, d);          // moon disc
        col += vec3(0.45,0.5,0.75) * pow(max(d, 0.0), 160.0) * 0.4;          // glow
        gl_FragColor = vec4(col, uOpacity);
      }`,
  })
  const dome = new THREE.Mesh(new THREE.SphereGeometry(170, 64, 32), domeMat)
  dome.renderOrder = -3; dome.frustumCulled = false
  const STARS = 1600, sp = new Float32Array(STARS * 3), ss = new Float32Array(STARS), sph = new Float32Array(STARS), sc = new Float32Array(STARS * 3)
  for (let i = 0; i < STARS; i++) {
    const u = Math.random(), v = Math.random()
    const th = u * Math.PI * 2, y = -0.08 + v * 1.08, r = Math.sqrt(Math.max(0, 1 - y * y))
    sp[i * 3] = Math.cos(th) * r * 150; sp[i * 3 + 1] = y * 150; sp[i * 3 + 2] = Math.sin(th) * r * 150
    ss[i] = 1 + Math.pow(Math.random(), 4) * 3.2; sph[i] = Math.random() * 6.283
    const warm = Math.random(); sc[i * 3] = 0.8 + warm * 0.2; sc[i * 3 + 1] = 0.85 + warm * 0.05; sc[i * 3 + 2] = 1 - warm * 0.25
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3))
  starGeo.setAttribute("aSize", new THREE.BufferAttribute(ss, 1))
  starGeo.setAttribute("aPhase", new THREE.BufferAttribute(sph, 1))
  starGeo.setAttribute("aColor", new THREE.BufferAttribute(sc, 3))
  const starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      uniform float uTime; uniform float uPx; varying vec3 vCol; varying float vTw;
      void main(){
        vCol = aColor; vTw = 0.55 + 0.45 * sin(uTime * (0.8 + aSize * 0.35) + aPhase);
        gl_PointSize = aSize * uPx;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uOpacity; varying vec3 vCol; varying float vTw;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vTw * uOpacity;
        gl_FragColor = vec4(vCol, a);
      }`,
  })
  const stars = new THREE.Points(starGeo, starMat)
  stars.renderOrder = -2; stars.frustumCulled = false
  sky.add(dome, stars); sky.visible = false; scene.add(sky)

  /* ---------- corridor chunks (streamed) ---------- */
  const prof = []
  {
    const Rc = 1.5
    prof.push([-W, H]); prof.push([-W, Rc])
    for (let k = 1; k <= 6; k++) { const a = k / 6 * Math.PI / 2; prof.push([-W + Rc - Rc * Math.cos(a), Rc - Rc * Math.sin(a)]) }
    prof.push([0, 0])
    for (let k = prof.length - 2; k >= 0; k--) prof.push([-prof[k][0], prof[k][1]])
  }
  const corrMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
  const chunks = new Map()

  function buildChunk(c) {
    const N = Math.round(CH / STEP), M = prof.length, pos = [], col = [], idx = []
    for (let i = 0; i <= N; i++) {
      const f = frame(c * CH + i * STEP)
      for (let j = 0; j < M; j++) {
        const o = prof[j][0], y = prof[j][1], t = smooth(y / 4.5)
        const g = 0.80 + (0.955 - 0.80) * t + (1 - t) * 0.06 * (1 - Math.abs(o) / W)
        pos.push(f.x + f.rx * o, y, f.z + f.rz * o); col.push(g, g, g)
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M - 1; j++) {
      const a = i * M + j, b = a + 1, cc = a + M, d = cc + 1
      idx.push(a, cc, b, b, cc, d)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3))
    geo.setIndex(idx)
    const m = new THREE.Mesh(geo, corrMat)
    m.frustumCulled = false
    scene.add(m); chunks.set(c, m)
  }

  /* ---------- stations (streamed) ---------- */
  const PG = new THREE.PlaneGeometry(PW, PH)
  const LG = new THREE.PlaneGeometry(PW, PW * 110 / 520)
  const SG = new THREE.PlaneGeometry(PW + .18, PH + .18)
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .05 })
  const blankShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .11 })
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const tmpCam = new THREE.PerspectiveCamera()
  const stations = new Map()
  let hit = []

  function createStation(i) {
    const S = { groups: [], meshes: [], disp: [], themed: [] }   // themed: materials whose canvas texture depends on light/dark
    for (let side = -1; side <= 1; side += 2) {
      const fr = frame(S0 + i * SP + (side > 0 ? 2.2 : 0)), g = new THREE.Group()
      const slot = slots[i * 2 + (side > 0 ? 1 : 0)]     // data-driven: a title card, an item, or nothing yet
      let it = null, mat
      const blank = !slot
      if (blank) mat = whiteMat                         // nothing here yet: plain white frame
      else {
        let map, make = null
        if (slot.type === "card") { make = (d) => skin.drawCard(slot.group, d); map = tex(make(texDark)) }
        else {
          it = slot.item
          map = tex(skin.drawItem(it, () => { if (map) map.needsUpdate = true }))   // may redraw later (async image load)
        }
        mat = new THREE.MeshBasicMaterial({ map }); S.disp.push(mat)
        if (make) S.themed.push({ mat, make }); else S.disp.push(map)
      }
      const mesh = new THREE.Mesh(PG, mat); g.add(mesh)
      if (it) {
        if (skin.labels) {
        const make = (d) => skin.drawLabel(it, d)
        const lmat = new THREE.MeshBasicMaterial({ map: tex(make(texDark)), transparent: true })
        S.themed.push({ mat: lmat, make }); S.disp.push(lmat)
        const lab = new THREE.Mesh(LG, lmat); lab.position.set(0, -PH / 2 - 0.34, 0); g.add(lab)
        mesh.userData.label = lab
        }
        mesh.userData.item = it; S.meshes.push(mesh)
      }
      const sh = new THREE.Mesh(SG, blank ? blankShadowMat : shadowMat); sh.position.set(0, -.05, -.02); g.add(sh)
      const ox = fr.x + fr.rx * side * (W - 0.04), oz = fr.z + fr.rz * side * (W - 0.04)
      g.position.set(ox, PY, oz); g.lookAt(fr.x, PY, fr.z); scene.add(g); S.groups.push(g); mesh.userData.group = g
      if (it) { // camera pose for the "step up to the painting" view
        let nx = fr.x - ox, nz = fr.z - oz; const nl = Math.hypot(nx, nz); nx /= nl; nz /= nl
        const fp = new THREE.Vector3(ox + nx * FOCUS_D, PY, oz + nz * FOCUS_D)
        tmpCam.position.copy(fp); tmpCam.lookAt(ox, PY - 0.55, oz)
        mesh.userData.fpos = fp; mesh.userData.fquat = tmpCam.quaternion.clone()
      }
    }
    stations.set(i, S)
  }

  function removeStation(i) {
    const S = stations.get(i); if (!S) return
    S.groups.forEach((g) => scene.remove(g)); S.disp.forEach((d) => d.dispose())
    S.themed.forEach((t) => t.mat.map && t.mat.map.dispose())
    stations.delete(i)
  }

  // swap the text/card canvases to the current theme (called when the transition passes its midpoint)
  function retheme(S) {
    S.themed.forEach((t) => {
      const old = t.mat.map
      t.mat.map = tex(t.make(texDark)); t.mat.needsUpdate = true
      if (old) old.dispose()
    })
  }

  function applyTheme(dt) {
    const d = themeTarget - themeT
    themeT = Math.abs(d) < 0.002 ? themeTarget : themeT + d * (1 - Math.exp(-dt * 4))
    scene.background.copy(LIGHT.bg).lerp(DARK.bg, themeT)
    scene.fog.color.copy(scene.background)
    corrMat.color.copy(LIGHT.corr).lerp(DARK.corr, themeT)
    whiteMat.color.copy(LIGHT.blank).lerp(DARK.blank, themeT)
    shadowMat.opacity = 0.05 + 0.2 * themeT
    blankShadowMat.opacity = 0.11 + 0.25 * themeT
    sky.visible = themeT > 0.003
    domeMat.uniforms.uOpacity.value = themeT
    starMat.uniforms.uOpacity.value = themeT
    const wantDark = themeT > 0.5
    if (wantDark !== texDark) { texDark = wantDark; stations.forEach(retheme) }
  }

  function rebuildHit() { hit = []; stations.forEach((S) => S.meshes.forEach((m) => hit.push(m))) }

  /* ---------- state ---------- */
  let cur = 0, tgt = 0, focus = null
  let yaw = 0, pitch = 0, yawT = 0, pitchT = 0
  let mx = 0, my = 0, smx = 0, smy = 0
  let dragging = false, moved = 0, lastX = 0, lastY = 0, downY = 0, trans = 0
  let blocked = false, hovered = null, lastIdx = -1, raf = 0, disposed = false

  const setT = (s) => { tgt = Math.max(0, s) }
  const stationS = (i) => S0 + i * SP - LOOK
  const curIdx = () => Math.max(0, Math.round((cur + LOOK - S0) / SP))

  function updateWorld(budget) {
    const c0 = Math.max(-2, Math.floor((cur - 45) / CH)), c1 = Math.floor((cur + 110) / CH)
    for (let c = c0; c <= c1; c++) if (!chunks.has(c)) buildChunk(c)
    chunks.forEach((m, k) => { if (k < c0 - 1 || k > c1 + 1) { scene.remove(m); m.geometry.dispose(); chunks.delete(k) } })
    const i0 = Math.max(0, Math.ceil((cur - 35 - S0) / SP)), i1 = Math.floor((cur + 95 - S0) / SP)
    const need = []; let changed = false
    for (let i = i0; i <= i1; i++) if (!stations.has(i)) need.push(i)
    if (need.length) {
      const ref = cur + 12
      need.sort((a, b) => Math.abs(S0 + a * SP - ref) - Math.abs(S0 + b * SP - ref))
      for (let k = 0; k < need.length && k < budget; k++) { createStation(need[k]); changed = true }
    }
    stations.forEach((S, k) => {
      if (k < i0 - 3 || k > i1 + 3) {
        if (focus && S.meshes.includes(focus)) return
        removeStation(k); changed = true
      }
    })
    if (changed) rebuildHit()
  }

  /* ---------- focus ---------- */
  function setFocus(m) {
    if (focus && focus.userData.label) focus.userData.label.visible = true
    focus = m
    if (m && m.userData.label) m.userData.label.visible = false
    trans = 1.6
    handlers.onFocus(m ? m.userData.item : null)
  }

  /* ---------- input ---------- */
  const ray = new THREE.Raycaster(), mv = new THREE.Vector2()
  function pick(x, y) {
    mv.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1)
    ray.setFromCamera(mv, camera)
    const r = ray.intersectObjects(hit, false)
    return r.length ? r[0].object : null
  }
  function hover(x, y) { hovered = dragging ? null : pick(x, y); canvas.classList.toggle("hot", !!hovered) }

  const onWheel = (e) => {
    e.preventDefault(); if (blocked) return
    if (focus) setFocus(null)
    setT(tgt + e.deltaY * 0.05)
    const k = Math.max(0, 1 - Math.abs(e.deltaY) * 0.0035); yawT *= k; pitchT *= k   // walking re-centres the view
  }
  const onDown = (e) => {
    dragging = true; moved = 0; lastX = e.clientX; lastY = downY = e.clientY
    canvas.setPointerCapture(e.pointerId); canvas.classList.add("drag")
  }
  const onMove = (e) => {
    mx = (e.clientX / innerWidth) * 2 - 1; my = (e.clientY / innerHeight) * 2 - 1
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY
      lastX = e.clientX; lastY = e.clientY; moved += Math.abs(dx) + Math.abs(dy)
      if (focus) { if (moved > 8) setFocus(null) }
      else if (e.pointerType === "touch") { yawT = clamp(yawT - dx * 0.0035, -1.9, 1.9); setT(tgt - dy * 0.12) }   // touch: swipe sideways = look, swipe up = walk forward, down = back
      else { yawT = clamp(yawT - dx * 0.0035, -1.9, 1.9); pitchT = clamp(pitchT + dy * 0.003, -0.55, 0.95) }   // up to ~55° so the sky is reachable   // up to ~55° so the sky is reachable
    }
    hover(e.clientX, e.clientY)
  }
  const onUp = (e) => {
    dragging = false; canvas.classList.remove("drag")
    if (moved < 5) {
      const m = pick(e.clientX, e.clientY)
      if (focus) {
        if (m === focus) { if (trans < 1.1) handlers.onOpen(m.userData.item) }
        else if (m) setFocus(m)
        else setFocus(null)
      } else if (m) setFocus(m)
    }
  }
  const onKey = (e) => {
    if (blocked || (document.activeElement && document.activeElement.tagName === "INPUT")) return
    if (e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); step(1) }
    else if (e.key === "ArrowUp") { e.preventDefault(); step(-1) }
    else if (e.key === "ArrowLeft") { e.preventDefault(); if (focus) setFocus(null); yawT = clamp(yawT - 0.4, -1.9, 1.9) }
    else if (e.key === "ArrowRight") { e.preventDefault(); if (focus) setFocus(null); yawT = clamp(yawT + 0.4, -1.9, 1.9) }
  }
  const onResize = () => {
    renderer.setSize(innerWidth, innerHeight, false)
    camera.aspect = innerWidth / innerHeight
    camera.fov = camera.aspect < 1 ? 52 + (1 - camera.aspect) * 38 : 52   // portrait phones: widen the view so the corridor isn't cropped
    camera.updateProjectionMatrix()
  }
  canvas.addEventListener("wheel", onWheel, { passive: false })
  canvas.addEventListener("pointerdown", onDown)
  canvas.addEventListener("pointermove", onMove)
  canvas.addEventListener("pointerup", onUp)
  window.addEventListener("keydown", onKey)
  window.addEventListener("resize", onResize)
  onResize()

  /* ---------- public API ---------- */
  function step(d) {
    if (focus) setFocus(null)
    yawT = 0; pitchT = 0
    const i = Math.max(0, Math.round((tgt + LOOK - S0) / SP) + d)
    setT(stationS(i))
  }
  function goStation(i) { if (focus) setFocus(null); yawT = 0; pitchT = 0; setT(stationS(i)) }
  function goHome() { if (focus) setFocus(null); yawT = 0; pitchT = 0; setT(0) }

  /* ---------- camera + loop ---------- */
  const cp = new THREE.Vector3(), cq = new THREE.Quaternion()
  const Pd = new THREE.Vector3(), Qd = new THREE.Quaternion(), eul = new THREE.Euler(0, 0, 0, "YXZ")

  function walkPose(vel) {
    const f = frame(cur), psi = phi(cur + 5)
    Pd.set(f.x + f.rx * smx * 0.4, CAM_Y, f.z + f.rz * smx * 0.4)
    eul.set(-0.04 + pitch - smy * 0.05, -(psi + yaw + smx * 0.12), clamp(-vel * 0.0012, -0.03, 0.03), "YXZ")
    Qd.setFromEuler(eul)
  }

  applyTheme(0); updateWorld(999); rebuildHit()
  walkPose(0); cp.copy(Pd); cq.copy(Qd)
  let last = performance.now()

  function loop(now) {
    if (disposed) return
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now
    if (Math.abs(tgt - cur) > 150) cur = tgt - Math.sign(tgt - cur) * 150     // long jumps: don't stream hundreds of metres
    const prev = cur; cur += (tgt - cur) * (1 - Math.exp(-dt * 4.2)); const vel = (cur - prev) / dt
    yaw += (yawT - yaw) * (1 - Math.exp(-dt * 9)); pitch += (pitchT - pitch) * (1 - Math.exp(-dt * 9))
    smx += (mx - smx) * (1 - Math.exp(-dt * 3.5)); smy += (my - smy) * (1 - Math.exp(-dt * 3.5))
    updateWorld(2)
    if (focus) { Pd.copy(focus.userData.fpos); Qd.copy(focus.userData.fquat) } else walkPose(vel)
    const k = (focus || trans > 0) ? 3.4 : 22; trans = Math.max(0, trans - dt)
    const a = 1 - Math.exp(-dt * k); cp.lerp(Pd, a); cq.slerp(Qd, a)
    camera.position.copy(cp); camera.quaternion.copy(cq)
    applyTheme(dt)
    sky.position.copy(cp); starMat.uniforms.uTime.value = now / 1000
    for (const m of hit) {
      const g = m.userData.group, s = (m === hovered && !focus) ? 1.03 : 1
      g.scale.x += (s - g.scale.x) * Math.min(1, dt * 10); g.scale.y = g.scale.x
    }
    const idx = curIdx(); if (idx !== lastIdx) { lastIdx = idx; handlers.onHud(idx) }
    renderer.render(scene, camera)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  function dispose() {
    disposed = true; cancelAnimationFrame(raf)
    canvas.removeEventListener("wheel", onWheel); canvas.removeEventListener("pointerdown", onDown)
    canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerup", onUp)
    window.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize)
    Array.from(stations.keys()).forEach(removeStation)
    chunks.forEach((m) => { scene.remove(m); m.geometry.dispose() }); chunks.clear()
    ;[PG, LG, SG, starGeo, dome.geometry].forEach((g) => g.dispose())
    ;[domeMat, starMat].forEach((m) => m.dispose())
    ;[shadowMat, blankShadowMat, whiteMat, corrMat].forEach((m) => m.dispose())
    renderer.dispose()
  }

  return {
    step, goStation, goHome, dispose,
    clearFocus: () => { if (focus) setFocus(null) },
    openFocused: () => { if (focus) handlers.onOpen(focus.userData.item) },
    setBlocked: (b) => { blocked = b },
    setTheme: (dark) => { themeTarget = dark ? 1 : 0 },
    look: (y, p) => { yawT = clamp(y, -1.9, 1.9); pitchT = clamp(p, -0.55, 0.95) },
  }
}
