interface RecrutasLogoProps {
  className?: string;
  size?: number;
}

// 8090.ai-inspired blocky geometric "R" — black and white variant
export default function RecrutasLogoBW({ className = "", size = 32 }: RecrutasLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="32" height="32" rx="3" fill="black" />
      <rect x="7" y="5" width="5" height="22" fill="white" />
      <rect x="12" y="5" width="9" height="5" fill="white" />
      <rect x="19" y="5" width="5" height="11" fill="white" />
      <rect x="12" y="11" width="7" height="5" fill="white" />
      <rect x="14" y="8" width="3" height="5" fill="black" />
      <rect x="15" y="16" width="5" height="5" fill="white" />
      <rect x="19" y="21" width="5" height="6" fill="white" />
    </svg>
  );
}
