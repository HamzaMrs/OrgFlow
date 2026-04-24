import React from "react";

export function LogoIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="14" fill="#0f172a" />
      <path d="M14 16H34" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M14 24H30" stroke="url(#paint0_linear)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M14 32H22" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
      <defs>
        <linearGradient
          id="paint0_linear"
          x1="14"
          y1="24"
          x2="30"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LogoText({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight text-neutral-900 ${className}`}>
      Org<span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Flow</span>
    </span>
  );
}
