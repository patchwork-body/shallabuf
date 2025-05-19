export const Logo = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer socket circle */}
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="4" fill="none" />

      {/* Oversized Lightning Bolt */}
      <path d="M38 8L24 36h10l-6 20 18-26h-10l6-22z" fill="currentColor" />
    </svg>
  );
};
