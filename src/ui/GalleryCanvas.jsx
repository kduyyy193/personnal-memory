import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { createGallery } from '../three/Gallery'

// Owns the <canvas> and the imperative 3D gallery. React only talks to it through the ref API + callbacks.
const GalleryCanvas = forwardRef(function GalleryCanvas({ onFocus, onOpen, onHud, blocked, dark, slots }, ref) {
  const canvasRef = useRef(null)
  const galleryRef = useRef(null)
  const latest = useRef({ onFocus, onOpen, onHud, dark })
  latest.current = { onFocus, onOpen, onHud, dark }

  useEffect(() => {
    const g = createGallery(canvasRef.current, {
      onFocus: (it) => latest.current.onFocus(it),
      onOpen: (it) => latest.current.onOpen(it),
      onHud: (i) => latest.current.onHud(i),
    }, { dark: latest.current.dark, slots })
    galleryRef.current = g
    if (import.meta.env.DEV) {   // dev-only: ?look=yaw,pitch to start with the view turned (handy for screenshots)
      const q = new URLSearchParams(location.search).get("look")
      if (q) { const [y, p] = q.split(",").map(Number); g.look(y || 0, p || 0) }
    }
    return () => { g.dispose(); galleryRef.current = null }
  }, [slots])

  useEffect(() => { galleryRef.current?.setBlocked(blocked) }, [blocked])
  useEffect(() => { galleryRef.current?.setTheme(dark) }, [dark])

  useImperativeHandle(ref, () => ({
    step: (d) => galleryRef.current?.step(d),
    goStation: (i) => galleryRef.current?.goStation(i),
    goHome: () => galleryRef.current?.goHome(),
    clearFocus: () => galleryRef.current?.clearFocus(),
    openFocused: () => galleryRef.current?.openFocused(),
  }), [])

  return <canvas id="c" ref={canvasRef} />
})

export default GalleryCanvas
