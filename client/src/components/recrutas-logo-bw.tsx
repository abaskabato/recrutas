interface RecrutasLogoProps {
  className?: string;
  size?: number;
}

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
      <path
        d="M16 0 C7.163 0 0 7.163 0 16 C0 24.837 7.163 32 16 32 C24.837 32 32 24.837 32 16 C32 7.163 24.837 0 16 0 Z M16 4 C22.627 4 28 9.373 28 16 C28 22.627 22.627 28 16 28 C9.373 28 4 22.627 4 16 C4 9.373 9.373 4 16 4 Z"
        fill="black"
      />
      <path
        d="M14 10 L14 22 L18 22 L18 16 L22 16 C24.209 16 26 14.209 26 12 C26 9.791 24.209 8 22 8 L14 8 L14 10 Z"
        fill="white"
      />
    </svg>
  );
}
