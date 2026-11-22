const DS = 0.25
const PX = [0]
const PZ = [0]

export function phi(s) {
  return s <= 0 ? 0 : 0.62 * Math.sin(s / 38) + 0.30 * Math.sin(s / 17)
}

function ensurePath(s) {
  const n = Math.ceil(s / DS) + 2
  while (PX.length <= n) {
    const k = PX.length - 1, a = phi((k + 0.5) * DS)
    PX.push(PX[k] + Math.sin(a) * DS)
    PZ.push(PZ[k] - Math.cos(a) * DS)
  }
}

export function frame(s) {
  let px, pz
  if (s < 0) { px = 0; pz = -s }
  else {
    ensurePath(s)
    const n = Math.floor(s / DS), f = s / DS - n
    px = PX[n] + (PX[n + 1] - PX[n]) * f
    pz = PZ[n] + (PZ[n + 1] - PZ[n]) * f
  }
  const a = phi(s)
  return { x: px, z: pz, tx: Math.sin(a), tz: -Math.cos(a), rx: Math.cos(a), rz: Math.sin(a) }
}
