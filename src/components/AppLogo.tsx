/**
 * Logo de «Pedidos»: un tazón de ceviche con una velita de cumpleaños (Cevichao + cumpleaños).
 * SVG en línea: se ve nítido a cualquier tamaño y en modo claro y oscuro.
 */
export default function AppLogo({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Pedidos: ceviche y cumpleaños" className={className} style={style}>
      <defs>
        <linearGradient id="logo-bowl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2fb8a4" />
          <stop offset="1" stopColor="#0e5c52" />
        </linearGradient>
        <linearGradient id="logo-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde047" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>

      {/* Confeti */}
      <g opacity="0.95">
        <circle cx="16" cy="26" r="3" fill="#f472b6" />
        <rect x="100" y="20" width="6" height="6" rx="1.5" fill="#34d399" transform="rotate(20 103 23)" />
        <circle cx="106" cy="46" r="2.5" fill="#fbbf24" />
        <rect x="10" y="50" width="5" height="5" rx="1.2" fill="#a78bfa" transform="rotate(-25 12.5 52.5)" />
        <circle cx="30" cy="12" r="2.2" fill="#2fb8a4" />
        <rect x="84" y="8" width="5" height="5" rx="1.2" fill="#f472b6" transform="rotate(35 86.5 10.5)" />
      </g>

      {/* Velita */}
      <rect x="56" y="24" width="8" height="26" rx="2.5" fill="#fef3c7" />
      <path d="M56 33 L64 29 M56 41 L64 37 M56 49 L64 45" stroke="#f472b6" strokeWidth="2.2" strokeLinecap="round" />
      <path className="logo-flame" d="M60 6 C67 15 69 20 60 27 C51 20 53 15 60 6 Z" fill="url(#logo-flame)" />
      <path d="M60 15 C63 19 63 21 60 24 C57 21 57 19 60 15 Z" fill="#fff7ed" opacity="0.9" />

      {/* Ceviche (montoncito sobre el borde) */}
      <ellipse cx="60" cy="56" rx="34" ry="12" fill="#fdba74" />
      <circle cx="42" cy="52" r="7" fill="#fb923c" />
      <circle cx="56" cy="47" r="6.5" fill="#fdba74" />
      <circle cx="73" cy="51" r="7" fill="#fb923c" />
      <circle cx="84" cy="56" r="5" fill="#fdba74" />
      <path d="M46 58 q6 -9 12 0" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M66 59 q6 -9 12 0" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="62" cy="55" r="4.5" fill="#86efac" />
      <circle cx="62" cy="55" r="2" fill="#4ade80" />

      {/* Tazón */}
      <path d="M18 60 H102 C102 90 84 106 60 106 C36 106 18 90 18 60 Z" fill="url(#logo-bowl)" />
      <ellipse cx="60" cy="60" rx="42" ry="8" fill="#8fdccf" />
      <path d="M30 70 C34 84 44 92 56 95" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" fill="none" />
      <ellipse cx="60" cy="112" rx="22" ry="3.5" fill="#000" opacity="0.18" />
    </svg>
  )
}
