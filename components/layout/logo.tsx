export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="FinansialKit"
    >
      <rect x="16" y="16" width="480" height="480" rx="112" fill="#0e0f0c" />
      <rect x="88" y="216" width="336" height="176" rx="36" fill="#9fe870" />
      <path
        d="M124 216h264a36 36 0 0 1 36 36v22H88v-22a36 36 0 0 1 36-36z"
        fill="#e7ffd2"
      />
      <rect x="120" y="268" width="148" height="18" rx="9" fill="#0e0f0c" opacity="0.28" />
      <rect x="120" y="348" width="108" height="18" rx="9" fill="#0e0f0c" opacity="0.16" />
      <circle cx="362" cy="304" r="54" fill="#0e0f0c" />
      <circle cx="362" cy="304" r="36" fill="none" stroke="#9fe870" strokeWidth="9" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName = "h-7 w-7",
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={`flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark className={markClassName} />
      <span className="font-semibold">FinansialKit</span>
    </span>
  );
}
