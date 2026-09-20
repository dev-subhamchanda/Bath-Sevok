import React from "react";

export const Logo: React.FC<{ className?: string; size?: number }> = ({
  className = "w-8 h-8",
  size = 32
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      fill="none"
      className={className}
    >
      <rect width="120" height="120" rx="24" fill="#174A73" />
      <path
        d="M28 88V32L60 66V32M60 32L92 88V32"
        stroke="#FFFFFF"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="92" cy="32" r="6" fill="#64B5F6" />
      <path
        d="M28 88H92"
        stroke="#90CAF9"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="4 6"
      />
    </svg>
  );
};
