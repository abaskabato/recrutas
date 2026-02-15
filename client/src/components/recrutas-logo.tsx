interface RecrutasLogoProps {
  className?: string;
  size?: number;
}

// 8090.ai-inspired blocky geometric "R" icon
export default function RecrutasLogo({ className = "", size = 32 }: RecrutasLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="32" height="32" rx="3" fill="#10B981" />
      {/* Blocky R — stem + bump + leg, 8090-style */}
      <rect x="7" y="5" width="5" height="22" fill="white" />
      <rect x="12" y="5" width="9" height="5" fill="white" />
      <rect x="19" y="5" width="5" height="11" fill="white" />
      <rect x="12" y="11" width="7" height="5" fill="white" />
      {/* Bowl hole — punched through */}
      <rect x="14" y="8" width="3" height="5" fill="#10B981" />
      {/* Diagonal leg */}
      <rect x="15" y="16" width="5" height="5" fill="white" />
      <rect x="19" y="21" width="5" height="6" fill="white" />
    </svg>
  );
}

// Smaller simple icon variant
export function RecrutasLogoSimple({ className = "", size = 24 }: RecrutasLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="24" height="24" rx="2" fill="#10B981" />
      <rect x="5" y="4" width="4" height="16" fill="white" />
      <rect x="9" y="4" width="7" height="4" fill="white" />
      <rect x="14" y="4" width="4" height="8" fill="white" />
      <rect x="9" y="8" width="5" height="4" fill="white" />
      <rect x="10" y="6" width="2" height="4" fill="#10B981" />
      <rect x="11" y="12" width="4" height="4" fill="white" />
      <rect x="14" y="16" width="4" height="4" fill="white" />
    </svg>
  );
}

// Compact wordmark for navbar — 8090.ai-style blocky geometric letterforms
// Each letter built purely from rectangles, no curves
export function RecrutasLogoCompact({ className = "", size = 32 }: RecrutasLogoProps) {
  const w = size * 6.5;
  const h = size;

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 208 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Icon: blocky R in a green box */}
      <rect x="0" y="0" width="28" height="28" rx="3" fill="#10B981" />
      <rect x="5" y="4" width="4" height="20" fill="white" />
      <rect x="9" y="4" width="8" height="4" fill="white" />
      <rect x="15" y="4" width="4" height="10" fill="white" />
      <rect x="9" y="10" width="6" height="4" fill="white" />
      <rect x="11" y="7" width="2" height="4" fill="#10B981" />
      <rect x="12" y="14" width="4" height="4" fill="white" />
      <rect x="15" y="18" width="4" height="6" fill="white" />

      {/* ===  R E C R U T A S  wordmark === */}
      {/* Grid: 4-unit stroke, letters ~16w, 24h, 6-unit gaps */}

      {/* R (x=36) */}
      <rect x="36" y="2" width="4" height="24" fill="#10B981" />
      <rect x="40" y="2" width="8" height="4" fill="#10B981" />
      <rect x="46" y="2" width="4" height="12" fill="#10B981" />
      <rect x="40" y="10" width="6" height="4" fill="#10B981" />
      <rect x="43" y="14" width="4" height="5" fill="#10B981" />
      <rect x="46" y="18" width="4" height="8" fill="#10B981" />

      {/* E (x=58) */}
      <rect x="58" y="2" width="4" height="24" fill="#10B981" />
      <rect x="62" y="2" width="12" height="4" fill="#10B981" />
      <rect x="62" y="11" width="10" height="4" fill="#10B981" />
      <rect x="62" y="22" width="12" height="4" fill="#10B981" />

      {/* C (x=80) */}
      <rect x="80" y="2" width="4" height="24" fill="#10B981" />
      <rect x="84" y="2" width="12" height="4" fill="#10B981" />
      <rect x="84" y="22" width="12" height="4" fill="#10B981" />

      {/* R (x=102) */}
      <rect x="102" y="2" width="4" height="24" fill="#10B981" />
      <rect x="106" y="2" width="8" height="4" fill="#10B981" />
      <rect x="112" y="2" width="4" height="12" fill="#10B981" />
      <rect x="106" y="10" width="6" height="4" fill="#10B981" />
      <rect x="109" y="14" width="4" height="5" fill="#10B981" />
      <rect x="112" y="18" width="4" height="8" fill="#10B981" />

      {/* U (x=124) */}
      <rect x="124" y="2" width="4" height="20" fill="#10B981" />
      <rect x="128" y="22" width="8" height="4" fill="#10B981" />
      <rect x="134" y="2" width="4" height="20" fill="#10B981" />

      {/* T (x=146) */}
      <rect x="146" y="2" width="16" height="4" fill="#10B981" />
      <rect x="152" y="6" width="4" height="20" fill="#10B981" />

      {/* A (x=168) */}
      <rect x="168" y="2" width="4" height="24" fill="#10B981" />
      <rect x="172" y="2" width="8" height="4" fill="#10B981" />
      <rect x="178" y="2" width="4" height="24" fill="#10B981" />
      <rect x="172" y="11" width="6" height="4" fill="#10B981" />

      {/* S (x=190) */}
      <rect x="190" y="2" width="14" height="4" fill="#10B981" />
      <rect x="190" y="6" width="4" height="5" fill="#10B981" />
      <rect x="190" y="11" width="14" height="4" fill="#10B981" />
      <rect x="200" y="15" width="4" height="7" fill="#10B981" />
      <rect x="190" y="22" width="14" height="4" fill="#10B981" />
    </svg>
  );
}
