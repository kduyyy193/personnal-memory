import { useEffect, useState } from 'react'

// Current year (fades on change), station counter and the control hint. group=null means past the last memory.
export default function Hud({ idx, group, hidden }) {
  const key = group ? (group.year ?? group.name) : "end"
  const [shown, setShown] = useState({ key, group })
  const [fade, setFade] = useState(false)

  useEffect(() => {
    if (key === shown.key) return
    setFade(true)
    const t = setTimeout(() => { setShown({ key, group }); setFade(false) }, 160)
    return () => clearTimeout(t)
  }, [key, group, shown.key])

  const title = shown.group ? shown.group.name : "More memories to come"
  const sub = shown.group ? shown.group.sub : "Frames waiting to be filled"

  return (
    <>
      <div id="progress" className="cond">{String(idx + 1).padStart(3, "0")}</div>
      <div id="title" className={"cond" + (hidden ? " hide" : "")}>
        <div className="k">THE YEAR</div>
        <div className="t" style={{ opacity: fade ? 0 : 1 }}>{title}</div>
        <div className="s">{sub}</div>
      </div>
      <div id="hint" className="cond">
        <span className="desk">Scroll to walk · Drag to look around<br />Click a polaroid to step up to it</span>
        <span className="touch">Vuốt lên/xuống: đi tới/lùi<br />Vuốt ngang: nhìn quanh · Chạm ảnh để xem</span>
      </div>
    </>
  )
}
