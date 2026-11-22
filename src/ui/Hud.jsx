import { useEffect, useState } from 'react'


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

  const title = shown.group ? shown.group.name : "Còn nhiều kỷ niệm đang chờ"
  const sub = shown.group ? shown.group.sub : "Những khung hình chờ được lấp đầy"

  return (
    <>
      <div id="progress" className="cond">{String(idx + 1).padStart(3, "0")}</div>
      <div id="title" className={"cond" + (hidden ? " hide" : "")}>
        <div className="k">NĂM</div>
        <div className="t" style={{ opacity: fade ? 0 : 1 }}>{title}</div>
        <div className="s">{sub}</div>
      </div>
      <div id="hint" className="cond">
        <span className="desk">Cuộn chuột để đi · Kéo để nhìn quanh<br />Bấm vào ảnh để đến gần</span>
        <span className="touch">Vuốt lên/xuống: đi tới/lùi<br />Vuốt ngang: nhìn quanh · Chạm ảnh để xem</span>
      </div>
    </>
  )
}
