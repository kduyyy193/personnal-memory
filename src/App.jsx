import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSlots, groupAt } from './data/layout'
import GalleryCanvas from './ui/GalleryCanvas'
import Nav from './ui/Nav'
import Hud from './ui/Hud'
import FocusBar from './ui/FocusBar'
import Timeline from './ui/Timeline'
import MemoryPanel from './ui/MemoryPanel'

const isNight = () => { const h = new Date().getHours(); return h >= 18 || h < 6 }

export default function App() {
  const gallery = useRef(null)
  const layout = useMemo(buildSlots, [])
  const [idx, setIdx] = useState(0)
  const [focus, setFocus] = useState(null)
  const devView = import.meta.env.DEV ? new URLSearchParams(location.search).get("view") : null
  const [panel, setPanel] = useState(() => (devView === "panel" ? layout.slots.find((s) => s.type === "item").item : null))
  const [listOpen, setListOpen] = useState(devView === "timeline")
  const [dark, setDark] = useState(() => {
    if (import.meta.env.DEV) { const t = new URLSearchParams(location.search).get("theme"); if (t) return t === "dark" }
    return isNight()
  })

  const blocked = !!panel || listOpen
  const group = groupAt(layout, idx)

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light"
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0a0c16" : "#f2f2f2")
  }, [dark])

  useEffect(() => {
    let night = isNight()
    const t = setInterval(() => {
      const now = isNight()
      if (now !== night) { night = now; setDark(now) }
    }, 60000)
    return () => clearInterval(t)
  }, [])


  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return
      if (panel) setPanel(null)
      else if (focus) gallery.current?.clearFocus()
      else if (listOpen) setListOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [panel, focus, listOpen])

  return (
    <>
      <GalleryCanvas ref={gallery} slots={layout.slots} blocked={blocked} dark={dark} onFocus={setFocus} onOpen={setPanel} onHud={setIdx} />

      <Nav listOpen={listOpen} onList={setListOpen} dark={dark} onTheme={() => setDark((d) => !d)} />
      <Hud idx={idx} group={group} hidden={!!focus} />
      <FocusBar item={focus} onOpen={() => gallery.current?.openFocused()} onBack={() => gallery.current?.clearFocus()} />

      <div id="arrows">
        <button aria-label="Lùi lại" onClick={() => gallery.current?.step(-1)}>&#9660;<span>Lùi</span></button>
        <button aria-label="Đi tiếp" onClick={() => gallery.current?.step(1)}>&#9650;<span>Tiến</span></button>
      </div>

      {listOpen && <Timeline layout={layout} onPick={setPanel} />}
      {panel && <MemoryPanel key={panel.id} item={panel} onClose={() => setPanel(null)} />}
    </>
  )
}
