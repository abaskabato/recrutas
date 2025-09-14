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
      <defs>
        <linearGradient id="newLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#newLogoGradient)" />
      <path
        d="M12 10 L12 22 M12 10 L18 10 C20.2 10 22 11.8 22 14 C22 16.2 20.2 18 18 18 L12 18 M18 18 L22 22"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// Simplified version for small sizes
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
        <linearGradient id="newLogoGradientSimple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill="url(#newLogoGradientSimple)" />
      <path
        d="M9 7 L9 17 M9 7 L14 7 C15.65 7 17 8.35 17 10 C17 11.65 15.65 13 14 13 L9 13 M14 13 L17 17"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}