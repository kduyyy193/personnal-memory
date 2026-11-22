import { shortDate } from '../data/layout'

// Shown while the camera is standing in front of one memory.
export default function FocusBar({ item, onOpen, onBack }) {
  return (
    <div id="focus" className={"cond" + (item ? " show" : "")}>
      <div className="fn">{item ? item.title : ""}</div>
      <div className="fs">{item ? (item.place ? `${shortDate(item.date)} · ${item.place}` : shortDate(item.date)) : ""}</div>
      <button onClick={onOpen}>VIEW MEMORY</button>
      <button className="ghost" onClick={onBack}>BACK</button>
    </div>
  )
}
