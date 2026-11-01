import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...props }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export function Mail(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M4 4h16v16H4z" />
      <path d="M12 12l-4-4M12 12l4-4" />
    </svg>
  );
}

export function Flame(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 2.5c2.6 3 4.2 5.4 4.2 8a4.2 4.2 0 0 1-8.4 0c0-1.2.5-2.4 1.4-3.6" />
      <path d="M12 21.5a5.5 5.5 0 0 0 5.5-5.5c0-2.4-1.6-4.4-2.9-6" />
      <path d="M12 21.5A5.5 5.5 0 0 1 6.5 16c0-1.4.6-2.8 1.6-4.1" />
    </svg>
  );
}

export function Check(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

export function ArrowLeft(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function ArrowRight(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function Download(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 3v12M7.5 10.5L12 15l4.5-4.5M4 20h16" />
    </svg>
  );
}

export function Camera(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M3 8.5h3l1.6-2.2h8.8L18 8.5h3V19H3z" />
      <circle cx="12" cy="13.5" r="3.2" />
    </svg>
  );
}

export function Alert(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 3.2L21.2 20H2.8z" />
      <path d="M12 9.2v4.6M12 17.2h.01" />
    </svg>
  );
}

export function AlertTriangle(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.34a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function Clock(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.2v5.2l3.4 2" />
    </svg>
  );
}

export function Shield(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 3l7.2 2.8v6.1c0 4.2-3 7.7-7.2 9.1-4.2-1.4-7.2-4.9-7.2-9.1V5.8z" />
      <path d="M8.8 11.8l2.3 2.3 4.2-4.4" />
    </svg>
  );
}

export function Plus(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function Trash2(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
    </svg>
  );
}

export function User(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function Users(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <path d="M18 13a6 6 0 0 0-12 0c0 2 2 4 4 4h4a4 4 0 0 0 4-4z" />
      <circle cx="18" cy="7" r="3" />
    </svg>
  );
}

export function Building(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M3 21h18M3 7v14M21 7v14M9 21V12h6v9M5 7v-4h2v4M15 7v-4h2v4M3 7l9-5 9 5v4H3V7z" />
    </svg>
  );
}

export function X(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function Doc(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M7 3h7l4.5 4.5V21H7z" />
      <path d="M14 3v4.5h4.5M10 12h6M10 16h6" />
    </svg>
  );
}

export function Send(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

export function Settings(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33-1.8l-1.1-1.1" />
      <path d="M4.6 15a1.65 1.65 0 0 1-.33-1.8l1.1-1.1" />
      <path d="M15 4.6a1.65 1.65 0 0 1 1.8.33l1.1 1.1" />
      <path d="M9 4.6a1.65 1.65 0 0 0-1.8.33l-1.1 1.1" />
      <path d="M12 2v2M12 20v2M4.6 12h-2M20.6 12h2" />
    </svg>
  );
}
