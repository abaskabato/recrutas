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
      {/* Background circle with gradient */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      
      {/* Outer circle */}
      <circle cx="16" cy="16" r="16" fill="url(#logoGradient)" />
      
      {/* Letter R design */}
      <path
        d="M10 8 L10 24 M10 8 L18 8 C20.2 8 22 9.8 22 12 C22 14.2 20.2 16 18 16 L10 16 M18 16 L22 24"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Connection dots representing networking */}
      <circle cx="8" cy="6" r="1" fill="white" opacity="0.8" />
      <circle cx="24" cy="6" r="1" fill="white" opacity="0.8" />
      <circle cx="6" cy="26" r="1" fill="white" opacity="0.8" />
      <circle cx="26" cy="26" r="1" fill="white" opacity="0.8" />
      
      {/* Subtle connection lines */}
      <line x1="8" y1="6" x2="10" y2="8" stroke="white" strokeWidth="0.5" opacity="0.6" />
      <line x1="24" y1="6" x2="22" y2="8" stroke="white" strokeWidth="0.5" opacity="0.6" />
      <line x1="6" y1="26" x2="10" y2="24" stroke="white" strokeWidth="0.5" opacity="0.6" />
      <line x1="26" y1="26" x2="22" y2="24" stroke="white" strokeWidth="0.5" opacity="0.6" />
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
        <linearGradient id="logoGradientSimple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      
      <circle cx="12" cy="12" r="12" fill="url(#logoGradientSimple)" />
      
      <path
        d="M8 6 L8 18 M8 6 L14 6 C15.5 6 16.5 7 16.5 8.5 C16.5 10 15.5 11 14 11 L8 11 M14 11 L16.5 18"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}