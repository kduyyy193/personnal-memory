import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource/playpen-sans/latin-400.css'
import '@fontsource/playpen-sans/vietnamese-400.css'
import '@fontsource/playpen-sans/latin-600.css'
import '@fontsource/playpen-sans/vietnamese-600.css'
import '@fontsource/playpen-sans/latin-700.css'
import '@fontsource/playpen-sans/vietnamese-700.css'

import App from './App'
import { cardPhotos } from './data/layout'
import { skin } from './three/skin'
import './styles.css'

const SAMPLE = "Aa 2023 Đà Lạt, Huế, Nguyễn, ướt át, ngưỡng mộ ẵ ệ"
const FACES = ["400 20px 'Playpen Sans'", "600 20px 'Playpen Sans'", "700 20px 'Playpen Sans'"]
const fontsReady = Promise.race([
  Promise.all(FACES.map((f) => document.fonts.load(f, SAMPLE))).catch(() => {}),
  new Promise((r) => setTimeout(r, 3000)),
])

fontsReady.then(() => skin.preload(cardPhotos())).then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
})
