# Memories (React + Vite + Three.js)

A walk through a curved 3D corridor of polaroids, one section per year. Light/dark mode (dark has a starry sky).

    npm install
    npm run dev       # http://localhost:5173   (use --port to change)
    npm run build     # output in dist/

Controls: scroll = walk, drag = look around, click a polaroid = step up to it, click again / VIEW MEMORY = read the story, Esc = back.
Top bar: a link per year jumps to that year; GALLERY / TIMELINE toggles the list view.

## Edit your memories
Everything lives in **`src/data/memories.js`** (hardcoded array, header comment explains the fields).
Add, remove or reorder entries — years, year cards, nav links, timeline and HUD are generated from it.

## Use real photos
1. Put images in `public/photos/` (e.g. `public/photos/da-lat.jpg`).
2. Set `photo: '/photos/da-lat.jpg'` on that memory. Leave `photo: null` for a generated placeholder scene.

## Code map
- `src/data/memories.js` your data · `src/data/layout.js` year grouping → gallery slots
- `src/three/skin.js` polaroid / year-card painting · `src/three/Gallery.js` generic 3D engine (path, corridor, streaming, camera, dark sky)
- `src/ui/` Nav, Hud, FocusBar, MemoryPanel, Timeline
