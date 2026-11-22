// ─────────────────────────────────────────────────────────────────────────────
//  YOUR MEMORIES — edit this file by hand, nothing else needs to change.
//
//  Each memory:
//    id      unique string
//    date    'YYYY-MM-DD'   (the year decides which year-section it lands in;
//                            memories are sorted by date automatically)
//    title   short caption written on the polaroid
//    place   where it happened
//    note    the story, shown when you open the memory
//    photos  list of image paths, e.g. ['/photos/a.jpg', '/photos/b.jpg']  (files live in public/photos/)
//            the FIRST one is the polaroid in the corridor; all of them show in the story view.
//            (a single  photo: '/photos/a.jpg'  also works; leave both out for a generated placeholder)
//    seed    any number — changes the look of the placeholder scene
//
//  Add / remove / reorder entries freely. The gallery and the timeline are generated from this array.
//  The old sample memories (2022–2024) are kept in memories.sample.js in case you want to borrow from them.
// ─────────────────────────────────────────────────────────────────────────────
// A year's title card is a collage: one big photo on top + a row of up to 4 small photos picked at random from the year's other memories (a new pick on every page load).
// The big photo is YEAR_COVERS[year], or else the first photo of that year.   { "2026": "/photos/some-photo.jpg" }
export const YEAR_COVERS = { 2026: "/photos/first-time-1505.jpg" }

// Optional one-line note written under the count on a year's title card.   { "2026": "26/10" }
export const YEAR_NOTES = { 2026: "26/10" }

export const MEMORIES = [
  { id: "2026-10-30-first-photo", date: "2026-10-30", seed: 40,
    photos: ["/photos/first-time-1505.jpg"],
    title: "Ảnh đầu tiên", place: "Đà Lạt", note: "" },

  // One day out to Bà Rịa – Vũng Tàu (7 Nov 2026), split into two trips.
  // Photo times / GPS: late morning around Bà Rịa, late afternoon in Vũng Tàu.
  { id: "2026-11-07-ba-ria", date: "2026-11-07", seed: 41,
    photos: ["/photos/ba-ria-1539.jpg", "/photos/ba-ria-1543.jpg"],
    title: "Một ngày ở Bà Rịa", place: "Bà Rịa",
    note: "Bóng hai người in trên tảng đá lớn giữa trưa nắng, và một bó hoa dại nhặt ven đường." },
  { id: "2026-11-07-vung-tau", date: "2026-11-07", seed: 42,
    photos: ["/photos/vung-tau-1547.jpg", "/photos/vung-tau-1557.jpg"],
    title: "Chiều ở Vũng Tàu", place: "Vũng Tàu",
    note: "Quán cà phê sát biển, nhìn ra con tàu nhỏ ở chân trời khi trời ngả chiều." },
]
