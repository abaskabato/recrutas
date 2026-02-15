interface RecrutasLogoProps {
  className?: string;
  size?: number;
}

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
      {/* Background with gradient */}
      <defs>
        <linearGradient id="tetrisGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="4" fill="url(#tetrisGradient)" />
      
      {/* Tetris-style block "R" */}
      {/* Vertical bar of R */}
      <rect x="7" y="7" width="5" height="18" fill="white" rx="1" />
      {/* Top of R */}
      <rect x="12" y="7" width="13" height="5" fill="white" rx="1" />
      {/* Middle of R */}
      <rect x="12" y="12" width="10" height="5" fill="white" rx="1" />
      {/* Right vertical top */}
      <rect x="22" y="7" width="4" height="5" fill="white" rx="1" />
      {/* Diagonal leg - blocks */}
      <rect x="18" y="17" width="4" height="4" fill="white" rx="1" />
      <rect x="22" y="21" width="4" height="4" fill="white" rx="1" />
    </svg>
  );
}

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
      <defs>
        <linearGradient id="tetrisGradientSimple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="3" fill="url(#tetrisGradientSimple)" />
      
      {/* Tetris-style block "R" - smaller */}
      <rect x="5" y="5" width="4" height="14" fill="white" rx="1" />
      <rect x="9" y="5" width="10" height="4" fill="white" rx="1" />
      <rect x="9" y="9" width="8" height="4" fill="white" rx="1" />
      <rect x="17" y="5" width="3" height="4" fill="white" rx="1" />
      <rect x="13" y="13" width="3" height="3" fill="white" rx="1" />
      <rect x="16" y="16" width="3" height="3" fill="white" rx="1" />
    </svg>
  );
}

// Compact version for navbar
export function RecrutasLogoCompact({ className = "", size = 32 }: RecrutasLogoProps) {
  return (
    <svg
      width={size * 2.5}
      height={size}
      viewBox="0 0 80 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Tetris-style R icon */}
      <rect x="2" y="2" width="4" height="28" fill="#10B981" rx="1" />
      <rect x="6" y="2" width="10" height="6" fill="#10B981" rx="1" />
      <rect x="6" y="8" width="6" height="6" fill="#10B981" rx="1" />
      <rect x="12" y="2" width="3" height="6" fill="#10B981" rx="1" />
      <rect x="12" y="14" width="3" height="3" fill="#10B981" rx="1" />
      <rect x="15" y="17" width="3" height="3" fill="#10B981" rx="1" />
      <rect x="18" y="20" width="3" height="3" fill="#10B981" rx="1" />
      <rect x="21" y="23" width="3" height="5" fill="#10B981" rx="1" />
      
      {/* Text: RECRUTAS */}
      <text 
        x="30" 
        y="22" 
        fontFamily="monospace" 
        fontSize="14" 
        fontWeight="bold" 
        fill="#10B981"
        style={{ letterSpacing: '2px' }}
      >
        RECRUTAS
      </text>
    </svg>
  );
}
