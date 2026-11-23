// Illustration shown when a laptop has no uploaded photo yet (or the photo fails to load). See LaptopImage.jsx.
// The screen tint is picked from the id so neighbours in the grid look different.
const SCREENS = ['#c9d1f2', '#d6dde3', '#e6e1cc', '#cfe2dc']

export default function LaptopArt({ seed = 0, className }) {
  const screen = SCREENS[Math.abs(seed) % SCREENS.length]
  return (
    <svg viewBox="0 0 160 100" className={className} role="img" aria-label="Laptop illustration">
      <rect x="30" y="10" width="100" height="64" rx="5" fill="#2a2f36" />
      <rect x="35" y="15" width="90" height="54" rx="2" fill={screen} />
      <rect x="44" y="24" width="38" height="4" rx="2" fill="#1e2e8a" opacity=".75" />
      <rect x="44" y="33" width="60" height="3" rx="1.5" fill="#15181c" opacity=".25" />
      <rect x="44" y="40" width="50" height="3" rx="1.5" fill="#15181c" opacity=".25" />
      <path d="M14 78h132l-9 12a4 4 0 0 1-3 1.5H26a4 4 0 0 1-3-1.5z" fill="#9aa2ab" />
      <rect x="66" y="78" width="28" height="3" rx="1.5" fill="#6f7882" />
    </svg>
  )
}
