import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSlots, groupAt } from './data/layout'
import GalleryCanvas from './ui/GalleryCanvas'
import Nav from './ui/Nav'
import Hud from './ui/Hud'
import FocusBar from './ui/FocusBar'
import Timeline from './ui/Timeline'
import MemoryPanel from './ui/MemoryPanel'

export default function App() {
  const gallery = useRef(null)
  const layout = useMemo(buildSlots, [])            // memoized: the gallery is rebuilt whenever `slots` changes identity
  const [idx, setIdx] = useState(0)                 // station the camera is at
  const [focus, setFocus] = useState(null)          // memory the camera is standing in front of
  const devView = import.meta.env.DEV ? new URLSearchParams(location.search).get("view") : null   // dev-only: ?view=timeline|panel for screenshots
  const [panel, setPanel] = useState(() => (devView === "panel" ? layout.slots.find((s) => s.type === "item").item : null))   // memory shown in the story panel
  const [listOpen, setListOpen] = useState(devView === "timeline")
  const [dark, setDark] = useState(() => {
    if (import.meta.env.DEV) { const t = new URLSearchParams(location.search).get("theme"); if (t) return t === "dark" }   // dev-only override for screenshots
    try { const s = localStorage.getItem("gallery-theme"); if (s) return s === "dark" } catch { /* storage unavailable */ }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
  })

  const blocked = !!panel || listOpen
  const group = groupAt(layout, idx)

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light"
    try { localStorage.setItem("gallery-theme", dark ? "dark" : "light") } catch { /* ignore */ }
  }, [dark])

  // Esc: close panel -> leave focus -> close timeline
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
