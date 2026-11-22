import { shortDate } from '../data/layout'

// How things are painted onto canvases for this project: polaroid memories + big-numeral year cards.
const HAND = "'Playpen Sans', 'Segoe Print', cursive"   // handwritten captions (has Vietnamese; loaded in main.jsx)
const W = 520, H = 650

function rng(seed) {
  let s = seed >>> 0 || 1
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s >>> 0) / 4294967296 }
}

const SEASONS = {
  spring: { sky: ["#bfe3f2", "#f7e8c8"], hills: ["#8cc084", "#5aa469", "#3f8a58"], sun: "#ffd166" },
  summer: { sky: ["#7ec8f0", "#ffe9a8"], hills: ["#4caf6a", "#2e8f55", "#1f7547"], sun: "#ffb703" },
  autumn: { sky: ["#f4c38b", "#fbe3c0"], hills: ["#d9822b", "#a8501e", "#7d3a17"], sun: "#fff1c1" },
  winter: { sky: ["#a9bfd8", "#e8eef6"], hills: ["#f2f6fa", "#cfd9e6", "#aebdcf"], sun: "#fffaf0" },
}
function seasonOf(date) {
  const m = +date.slice(5, 7)
  return m >= 3 && m <= 5 ? SEASONS.spring : m >= 6 && m <= 8 ? SEASONS.summer : m >= 9 && m <= 11 ? SEASONS.autumn : SEASONS.winter
}

// Placeholder "photo": flat sky / sun / hills scene, deterministic per memory, season follows the month.
function drawScene(g, x, y, w, h, item) {
  const R = rng(item.seed * 977 + 5), S = seasonOf(item.date)
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip()
  const sky = g.createLinearGradient(0, y, 0, y + h)
  sky.addColorStop(0, S.sky[0]); sky.addColorStop(1, S.sky[1])
  g.fillStyle = sky; g.fillRect(x, y, w, h)
  g.fillStyle = S.sun; g.beginPath(); g.arc(x + w * (0.2 + R() * 0.6), y + h * (0.16 + R() * 0.2), w * 0.09, 0, 7); g.fill()
  g.fillStyle = "rgba(255,255,255,.75)"
  for (let i = 0; i < 3; i++) {
    const cx = x + R() * w, cy = y + h * (0.12 + R() * 0.25), r = 14 + R() * 12
    for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(cx + k * r * 0.9, cy + (k % 2) * 4, r, 0, 7); g.fill() }
  }
  for (let layer = 0; layer < 3; layer++) {
    const base = y + h * (0.52 + layer * 0.14), amp = h * (0.07 + R() * 0.05), ph = R() * 6.28, fr = 1.4 + R() * 1.6
    g.fillStyle = S.hills[layer]; g.beginPath(); g.moveTo(x, y + h)
    for (let px = 0; px <= w; px += 8) g.lineTo(x + px, base + Math.sin(px / w * fr * 3.14 + ph) * amp)
    g.lineTo(x + w, y + h); g.closePath(); g.fill()
  }
  // a little house or tree on the front hill
  const hx = x + w * (0.15 + R() * 0.65), hy = y + h * 0.84
  if (R() > 0.5) {
    g.fillStyle = "#f4ead7"; g.fillRect(hx, hy - 26, 34, 26)
    g.fillStyle = "#c2552d"; g.beginPath(); g.moveTo(hx - 5, hy - 26); g.lineTo(hx + 17, hy - 44); g.lineTo(hx + 39, hy - 26); g.closePath(); g.fill()
  } else {
    g.fillStyle = "#6b4a2b"; g.fillRect(hx + 8, hy - 18, 6, 18)
    g.fillStyle = S.hills[2]; g.beginPath(); g.arc(hx + 11, hy - 28, 18, 0, 7); g.fill()
  }
  g.restore()
}

function drawCover(g, img, x, y, w, h, fy = 0.5) {
  const s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip()
  g.drawImage(img, x + (w - dw) / 2, y + (h - dh) * fy, dw, dh); g.restore()
}

function fitFont(g, text, maxW, size, family, weight = "") {
  while (size > 14) { g.font = `${weight} ${size}px ${family}`; if (g.measureText(text).width <= maxW) break; size -= 1 }
}

const imgCache = new Map()   // path -> {img, ready}
function loadPhoto(src, cb) {
  let e = imgCache.get(src)
  if (!e) {
    e = { img: new Image(), ready: false, failed: false, cbs: [] }
    e.img.onload = () => { e.ready = true; e.cbs.forEach((f) => f()); e.cbs = [] }
    e.img.onerror = () => { e.failed = true }
    e.img.src = src; imgCache.set(src, e)
  }
  if (e.ready) cb(e.img)
  else if (!e.failed) e.cbs.push(() => cb(e.img))
}

function paintPolaroid(g, item, photo) {
  g.fillStyle = "#f7f4ec"; g.fillRect(0, 0, W, H)
  g.fillStyle = "rgba(0,0,0,.04)"; g.fillRect(0, H - 6, W, 6)
  const px = 34, py = 34, pw = W - 68, ph = 448
  if (photo) drawCover(g, photo, px, py, pw, ph); else drawScene(g, px, py, pw, ph, item)
  g.strokeStyle = "rgba(0,0,0,.08)"; g.lineWidth = 2; g.strokeRect(px, py, pw, ph)
  g.textBaseline = "alphabetic"; g.fillStyle = "#2b2a28"
  fitFont(g, item.title, pw, 34, HAND); g.fillText(item.title, px, py + ph + 56)
  const sub = item.place ? `${shortDate(item.date)} · ${item.place}` : shortDate(item.date)
  g.fillStyle = "#7a746a"; fitFont(g, sub, pw, 22, HAND)
  g.fillText(sub, px, py + ph + 92)
}

export const skin = {
  labels: false,   // caption is baked into the polaroid

  drawItem(item, onChange) {
    const c = document.createElement("canvas"); c.width = W; c.height = H
    const g = c.getContext("2d")
    paintPolaroid(g, item, null)
    if (item.photo) loadPhoto(item.photo, (img) => { paintPolaroid(g, item, img); onChange && onChange() })
    return c
  },

  drawCard(group, dark) {
    const c = document.createElement("canvas"); c.width = W; c.height = H
    const g = c.getContext("2d")
    if (group.cover) {   // year card with a representative photo: full-bleed, year + count on a soft shade at the top (keeps the subject clear)
      const HERO = group.collage && group.collage.length ? 430 : H, GAP = 6
      g.fillStyle = dark ? "#171a2b" : "#ebe7dd"; g.fillRect(0, 0, W, H)
      const e = imgCache.get(group.cover)
      if (e && e.ready) drawCover(g, e.img, 0, 0, W, HERO, 0.7)
      if (HERO < H) {   // the row of small photos (other memories of the year)
        const n = group.collage.length, tw = (W - GAP * (n - 1)) / n, ty = HERO + GAP, th = H - ty
        group.collage.forEach((src, i) => {
          const t = imgCache.get(src), tx = i * (tw + GAP)
          g.fillStyle = dark ? "#222640" : "#d8d2c3"; g.fillRect(tx, ty, tw, th)
          if (t && t.ready) drawCover(g, t.img, tx, ty, tw, th)
        })
      }
      const shade = g.createLinearGradient(0, 0, 0, HERO * 0.5)
      shade.addColorStop(0, "rgba(0,0,0,.62)"); shade.addColorStop(1, "rgba(0,0,0,0)")
      g.fillStyle = shade; g.fillRect(0, 0, W, HERO * 0.5)
      g.textBaseline = "alphabetic"; g.fillStyle = "#ffffff"
      fitFont(g, group.name, W - 64, 130, HAND, "700"); g.fillText(group.name, 30, 140)
      g.fillStyle = "rgba(255,255,255,.9)"; g.font = `28px ${HAND}`; g.fillText(group.sub, 34, 184)
      if (group.note) { g.font = `600 26px ${HAND}`; g.fillText(group.note, 34, 224) }
      return c
    }
    g.fillStyle = dark ? "#171a2b" : "#ebe7dd"; g.fillRect(0, 0, W, H)
    g.fillStyle = dark ? "#2a2f4a" : "#d8d2c3"; g.fillRect(40, 120, W - 80, 3)
    g.fillStyle = dark ? "#ececf4" : "#1d1c1a"; g.textBaseline = "alphabetic"
    fitFont(g, group.name, W - 80, 150, HAND, "700"); g.fillText(group.name, 36, 360)
    g.fillStyle = dark ? "#8b8fa8" : "#7a746a"; g.font = `34px ${HAND}`
    g.fillText(group.sub, 44, 430)
    if (group.note) { g.fillStyle = dark ? "#ececf4" : "#1d1c1a"; g.font = `600 28px ${HAND}`; g.fillText(group.note, 44, 478) }
    return c
  },

  drawLabel() { return document.createElement("canvas") },   // unused (labels:false)

  // load photos into the cache before the gallery is built (cards are drawn synchronously); never waits more than 4 s
  preload(srcs) {
    return Promise.all(srcs.filter(Boolean).map((s) => new Promise((res) => { loadPhoto(s, () => res()); setTimeout(res, 4000) })))
  },

  // image for the detail panel / timeline thumbnails: real photo path, or a rendered placeholder scene
  photoSrc(item) {
    if (item.photo) return item.photo
    if (!item._src) {
      const c = document.createElement("canvas"); c.width = 900; c.height = 700
      drawScene(c.getContext("2d"), 0, 0, 900, 700, item)
      item._src = c.toDataURL("image/jpeg", 0.9)
    }
    return item._src
  },
}
