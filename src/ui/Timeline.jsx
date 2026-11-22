import { longDate } from '../data/layout'
import { skin } from '../three/skin'

export default function Timeline({ layout, onPick }) {
  return (
    <div id="list">
      {layout.groups.map((g) => (
        <section className="tl-year" key={g.year}>
          <h2 className="cond">{g.name}<span>{g.sub}</span></h2>
          <ol>
            {layout.slots
              .filter((s) => s.type === "item" && s.item.year === g.year)
              .map(({ item }) => (
                <li key={item.id} onClick={() => onPick(item)}>
                  <img src={skin.photoSrc(item)} alt="" loading="lazy" decoding="async" />
                  <div>
                    <div className="d cond">{longDate(item.date)}</div>
                    <div className="t cond">{item.title}</div>
                    {item.place && <div className="p">{item.place}</div>}
                  </div>
                </li>
              ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
