import { MEMORIES, YEAR_COVERS, YEAR_NOTES } from './memories'

const MONTH = ["", "tháng 1", "tháng 2", "tháng 3", "tháng 4", "tháng 5", "tháng 6", "tháng 7", "tháng 8", "tháng 9", "tháng 10", "tháng 11", "tháng 12"]

// '2023-03-12' -> '12 tháng 3, 2023'
export function longDate(date) {
  const [y, m, d] = date.split("-").map(Number)
  return `${d} ${MONTH[m]}, ${y}`
}

// '2023-03-12' -> '12/03/2023'
export function shortDate(date) {
  const [y, m, d] = date.split("-")
  return `${d}/${m}/${y}`
}

// Flat slot list for the gallery: [yearCard, memory, memory, ..., yearCard, ...]
// slot j sits at station j>>1 (even j = left wall, odd j = right wall).
// The collage shows a few random photos of the year, so the pick is made ONCE per page load and cached:
// preloading and drawing must agree on which photos they use.
let cache = null
export function buildSlots() {
  if (!cache) cache = computeSlots()
  return cache
}

const COLLAGE_MAX = 4
function pickRandom(list, n) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a.slice(0, n)
}

function computeSlots() {
  const sorted = [...MEMORIES].sort((a, b) => a.date.localeCompare(b.date))
  const years = [...new Set(sorted.map((m) => m.date.slice(0, 4)))]
  const slots = []
  const groups = []     // [{year,name,sub,count}]  (years only, used by the timeline)
  for (const y of years) {
    const items = sorted.filter((m) => m.date.startsWith(y))
    const yearPhotos = items.flatMap((m) => (m.photos?.length ? m.photos : m.photo ? [m.photo] : []))
    const hero = YEAR_COVERS[y] || yearPhotos[0] || null
    const collage = pickRandom(yearPhotos.filter((p) => p !== hero), COLLAGE_MAX)
    const group = { year: y, name: y, sub: `${items.length} ${items.length === 1 ? "memory" : "memories"}`, count: items.length, cardSlot: slots.length, cover: hero, collage, note: YEAR_NOTES[y] || "" }
    groups.push(group)
    slots.push({ type: "card", group })
    for (const m of items) {
      // normalise: `photos` is the source of truth; `photo` (the cover) is the first of them
      const photos = m.photos?.length ? m.photos : m.photo ? [m.photo] : []
      slots.push({ type: "item", item: { ...m, year: y, photos, photo: photos[0] || null } })
    }
  }
  return { slots, groups }
}

// every photo the year cards paint on their canvas (must be loaded before the gallery is built)
export function cardPhotos() {
  return buildSlots().groups.flatMap((g) => [g.cover, ...g.collage]).filter(Boolean)
}

// station index of a year's title card (used by the nav links)
export function yearStation(layout, year) {
  const g = layout.groups.find((x) => x.year === String(year))
  return g ? g.cardSlot >> 1 : 0
}

// which year the HUD should show at a station; null once past the last memory
export function groupAt(layout, idx) {
  const a = layout.slots[idx * 2 + 1], b = layout.slots[idx * 2]
  const pick = (s) => (s ? (s.type === "card" ? s.group : layout.groups.find((g) => g.year === s.item.year)) : null)  // a title card on this station wins (we are entering that year); otherwise the right-hand memory
  if (b && b.type === "card") return pick(b)
  return pick(a) || pick(b)
}
