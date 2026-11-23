export default function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#1e2e8a" />
      <rect x="7" y="9" width="18" height="11" rx="1.5" fill="none" stroke="#f5c542" strokeWidth="2" />
      <rect x="4" y="22" width="24" height="2.5" rx="1" fill="#f5c542" />
    </svg>
  )
}
