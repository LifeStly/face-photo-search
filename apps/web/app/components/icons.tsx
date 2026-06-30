import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement>;
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  width: '1em',
  height: '1em',
};

export function IconCamera(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <path d="M14.5 4h-5L8 6H4.5A1.5 1.5 0 0 0 3 7.5v11A1.5 1.5 0 0 0 4.5 20h15a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 19.5 6H16l-1.5-2Z" />
      <circle cx="12" cy="13" r="3.75" />
    </svg>
  );
}

export function IconUpload(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

export function IconDownload(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <path d="M12 4v12M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

export function IconSearch(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

export function IconCheck(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <path d="m5 12 5 5 9-11" />
    </svg>
  );
}

export function IconArrowLeft(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function IconArrowRight(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconX(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function IconRefresh(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

export function IconUser(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

// แม่กรอบใบหน้าโค้งเหมือนใน camera selfie guide
export function IconFaceFrame(p: Props) {
  return (
    <svg {...base} strokeWidth={1.5} aria-hidden="true" {...p}>
      <ellipse cx="12" cy="12" rx="7" ry="9" />
      <circle cx="9" cy="11" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11" r="0.6" fill="currentColor" stroke="none" />
      <path d="M9.5 15.5c1.2 1 3.8 1 5 0" />
    </svg>
  );
}

export function IconImage(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m4 18 5-5 4 4 3-3 4 4" />
    </svg>
  );
}

export function IconSparkles(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8" />
    </svg>
  );
}

export function IconShield(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z" />
    </svg>
  );
}

export function IconQR(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3M21 14v3M14 21h3M21 17v4" />
    </svg>
  );
}

export function IconChevronRight(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function IconExternal(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <path d="M14 4h6v6" />
      <path d="m20 4-9 9" />
      <path d="M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

// Drive logo เป็น tri-color triangle/quad — simplified ทรง currentColor
export function IconDrive(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <path d="m7.5 3 5 8.5h-5L3 11l4.5-8Z" />
      <path d="M16.5 3h-4l5 8.5h4L16.5 3Z" />
      <path d="m12 11.5-4.5 8h9l4.5-8h-9Z" />
    </svg>
  );
}

export function IconFolderOpen(p: Props) {
  return (
    <svg {...base} aria-hidden="true" {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1" />
      <path d="M3 9h18l-2.5 9a2 2 0 0 1-2 1.5H5.5a2 2 0 0 1-2-1.5L3 9Z" />
    </svg>
  );
}
