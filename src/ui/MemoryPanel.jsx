import { useState } from 'react'
import { longDate } from '../data/layout'
import { skin } from '../three/skin'

// Full-screen story view for one memory. A trip with several photos gets a thumbnail strip under the big photo.
export default function MemoryPanel({ item, onClose }) {
  const photos = item.photos && item.photos.length ? item.photos : [skin.photoSrc(item)]
  const [i, setI] = useState(0)

  return (
    <>
      <button id="close" aria-label="close" onClick={onClose}>&times;</button>
      <div id="panel">
        <div className="wrap">
          <div className="gallery">
            <img className="main" src={photos[i]} alt={`${item.title} (${i + 1}/${photos.length})`} />
            {photos.length > 1 && (
              <div className="thumbs">
                {photos.map((src, k) => (
                  <button key={src} className={k === i ? "on" : ""} aria-label={`Photo ${k + 1}`} onClick={() => setI(k)}>
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="crumb cond">{item.year} · Memory</div>
            <div className="mdate cond">{longDate(item.date)}</div>
            <h1 className="cond">{item.title}</h1>
            {item.place && <h3 className="cond">{item.place}</h3>}
            {item.note && <p className="story">{item.note}</p>}
          </div>
        </div>
      </div>
    </>
  )
}
