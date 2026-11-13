type IconProps = { size?: number; className?: string }

export function VouchMark({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
      <rect width="36" height="36" rx="9" fill="var(--ink)" />
      <path d="M10 11L18 25L26 11" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 11L18 18.5" stroke="rgba(255,255,255,0.4)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export function ArrowRight({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ArrowLeft({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M12 7H2M6 11L2 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ShieldCheck({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 2L4 5v5c0 4 2.7 7.1 6 8 3.3-.9 6-4 6-8V5L10 2z"
        stroke="currentColor" strokeWidth="1.5" fill="rgba(10,158,114,.12)" strokeLinejoin="round" />
      <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Shield({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 2L4 5v5c0 4 2.7 7.1 6 8 3.3-.9 6-4 6-8V5L10 2z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export function TEEIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3" y="3" width="14" height="14" rx="3" stroke="var(--blue)" strokeWidth="1.4" fill="rgba(20,72,232,.08)" />
      <path d="M7 10h6M10 7v6" stroke="var(--blue)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function UploadCloud({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 15s-1 0-1-1 1-4 5-4c.34 0 .67.02 1 .06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 15s1 0 1-1a7 7 0 00-11.65-5.45" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 12v7M9 16l3-4 3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function FileText({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M5 2h7l4 4v12H5V2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12 2v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7 9h6M7 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function CheckCircle({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 10l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function XCircle({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function AlertTriangle({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 3L2 17h16L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 9v3M10 14.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function Info({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 7v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="5" r=".6" fill="currentColor" />
    </svg>
  )
}

export function Lock({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="7" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function ClipboardList({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="6" y="4" width="20" height="24" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 4a4 4 0 008 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 13h10M11 18h7M11 23h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function Ban({ size = 40 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.4 9.4l21.2 21.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function Clock({ size = 40 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 12v8l5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function HelpCircle({ size = 40 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15.5 16a4.5 4.5 0 018 2c0 2.5-4 3-4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="20" cy="27.5" r="1" fill="currentColor" />
    </svg>
  )
}

export function ChevronDown({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronUp({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M11 9L7 5l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Copy({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="4.5" y="4.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 9.5H3A1.5 1.5 0 011.5 8V3A1.5 1.5 0 013 1.5h5A1.5 1.5 0 019.5 3v1.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

export function Check({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function X({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function Plus({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function Trash({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2.5 4h9M5 4V2.5h4V4M11 4l-.8 7.5a.5.5 0 01-.5.5H4.3a.5.5 0 01-.5-.5L3 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ExternalLink({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M6 2H2v10h10V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 2h3v3M12 2L7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function RefreshCw({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M13 2v4H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 12v-4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 5.5A5.5 5.5 0 0113 6M11.5 8.5A5.5 5.5 0 011 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function TrendingUp({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M2 14l5-5 4 4 7-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 5h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CreditCard({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 8h16" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 12h3M12 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function CalendarRange({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 9h16M6 2v4M14 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 13h2M9 13h2M13 13h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function Home({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 7L8 2l6 5v7h-4v-4H6v4H2V7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

export function Building({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3" y="4" width="14" height="14" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 8h14" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 12h2M11 12h2M7 15.5h2M11 15.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M7 2v2M13 2v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function Globe({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 10h16M10 2c-2 2-3 5-3 8s1 6 3 8M10 2c2 2 3 5 3 8s-1 6-3 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function Briefcase({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2" y="7" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M13 7V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 12h16" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

export function Fingerprint({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M6 10a4 4 0 014-4 4 4 0 014 4v1a7 7 0 01-.6 2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M4 8.4A6 6 0 0110 4a6 6 0 016 6v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2 7A8 8 0 0110 2a8 8 0 018 8v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10 11v3M13 12.5v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function EyeOff({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M13 7c.3.5.5 1 .5 1-.5 2-3 4.5-5.5 4.5-1 0-2-.3-2.8-.8M3 9C2.2 8.3 1.7 7.5 1.5 7c.5-2 3-4.5 5.5-4.5 1 0 2 .3 2.8.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6 6a2 2 0 002.8 2.8M2 2l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function Zap({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M13 2L4 11h7l-4 7 9-9h-7l4-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

export function Search({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function Users({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 3.5a3 3 0 010 5M18 17c0-2.8-2-5-4.5-5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function Heart({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 16.5S2 11.5 2 6.5A4 4 0 0110 4.9 4 4 0 0118 6.5c0 5-8 10-8 10z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

const LIS_D = "M55.00,32.00L54.94,33.11L54.76,34.22L54.46,35.32L54.04,36.42L53.51,37.50L52.86,38.58L52.10,39.63L51.24,40.67L50.28,41.69L49.22,42.69L48.07,43.66L46.83,44.60L45.52,45.52L44.14,46.40L42.69,47.25L41.19,48.07L39.63,48.84L38.04,49.58L36.42,50.28L34.77,50.93L33.11,51.54L31.44,52.10L29.78,52.62L28.13,53.09L26.50,53.51L24.89,53.87L23.33,54.19L21.81,54.46L20.34,54.67L18.93,54.83L17.60,54.94L16.34,54.99L15.16,54.99L14.07,54.94L13.07,54.83L12.17,54.67L11.38,54.46L10.70,54.19L10.13,53.87L9.67,53.51L9.33,53.09L9.11,52.62L9.01,52.10L9.03,51.54L9.17,50.93L9.43,50.28L9.81,49.58L10.30,48.84L10.91,48.07L11.63,47.25L12.46,46.40L13.39,45.52L14.42,44.60L15.54,43.66L16.75,42.69L18.04,41.69L19.40,40.67L20.82,39.63L22.31,38.58L23.84,37.50L25.42,36.42L27.04,35.32L28.68,34.22L30.33,33.11L32.00,32.00L33.67,30.89L35.32,29.78L36.96,28.68L38.58,27.58L40.16,26.50L41.69,25.42L43.18,24.37L44.60,23.33L45.96,22.31L47.25,21.31L48.46,20.34L49.58,19.40L50.61,18.48L51.54,17.60L52.37,16.75L53.09,15.93L53.70,15.16L54.19,14.42L54.57,13.72L54.83,13.07L54.97,12.46L54.99,11.90L54.89,11.38L54.67,10.91L54.33,10.49L53.87,10.13L53.30,9.81L52.62,9.54L51.83,9.33L50.93,9.17L49.93,9.06L48.84,9.01L47.66,9.01L46.40,9.06L45.07,9.17L43.66,9.33L42.19,9.54L40.67,9.81L39.11,10.13L37.50,10.49L35.87,10.91L34.22,11.38L32.56,11.90L30.89,12.46L29.23,13.07L27.58,13.72L25.96,14.42L24.37,15.16L22.81,15.93L21.31,16.75L19.86,17.60L18.48,18.48L17.17,19.40L15.93,20.34L14.78,21.31L13.72,22.31L12.76,23.33L11.90,24.37L11.14,25.42L10.49,26.50L9.96,27.58L9.54,28.68L9.24,29.78L9.06,30.89L9.00,32.00L9.06,33.11L9.24,34.22L9.54,35.32L9.96,36.42L10.49,37.50L11.14,38.58L11.90,39.63L12.76,40.67L13.72,41.69L14.78,42.69L15.93,43.66L17.17,44.60L18.48,45.52L19.86,46.40L21.31,47.25L22.81,48.07L24.37,48.84L25.96,49.58L27.58,50.28L29.23,50.93L30.89,51.54L32.56,52.10L34.22,52.62L35.87,53.09L37.50,53.51L39.11,53.87L40.67,54.19L42.19,54.46L43.66,54.67L45.07,54.83L46.40,54.94L47.66,54.99L48.84,54.99L49.93,54.94L50.93,54.83L51.83,54.67L52.62,54.46L53.30,54.19L53.87,53.87L54.33,53.51L54.67,53.09L54.89,52.62L54.99,52.10L54.97,51.54L54.83,50.93L54.57,50.28L54.19,49.58L53.70,48.84L53.09,48.07L52.37,47.25L51.54,46.40L50.61,45.52L49.58,44.60L48.46,43.66L47.25,42.69L45.96,41.69L44.60,40.67L43.18,39.63L41.69,38.58L40.16,37.50L38.58,36.42L36.96,35.32L35.32,34.22L33.67,33.11L32.00,32.00L30.33,30.89L28.68,29.78L27.04,28.68L25.42,27.58L23.84,26.50L22.31,25.42L20.82,24.37L19.40,23.33L18.04,22.31L16.75,21.31L15.54,20.34L14.42,19.40L13.39,18.48L12.46,17.60L11.63,16.75L10.91,15.93L10.30,15.16L9.81,14.42L9.43,13.72L9.17,13.07L9.03,12.46L9.01,11.90L9.11,11.38L9.33,10.91L9.67,10.49L10.13,10.13L10.70,9.81L11.38,9.54L12.17,9.33L13.07,9.17L14.07,9.06L15.16,9.01L16.34,9.01L17.60,9.06L18.93,9.17L20.34,9.33L21.81,9.54L23.33,9.81L24.89,10.13L26.50,10.49L28.13,10.91L29.78,11.38L31.44,11.90L33.11,12.46L34.77,13.07L36.42,13.72L38.04,14.42L39.63,15.16L41.19,15.93L42.69,16.75L44.14,17.60L45.52,18.48L46.83,19.40L48.07,20.34L49.22,21.31L50.28,22.31L51.24,23.33L52.10,24.37L52.86,25.42L53.51,26.50L54.04,27.58L54.46,28.68L54.76,29.78L54.94,30.89L55.00,32.00Z"

export function LisLoader({ size = 96, color = '#14100b', style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size} fill="none" role="img" aria-label="Loading" style={{ color, ...style }}>
      <g className="lis-rig">
        <path className="lis-track" d={LIS_D} />
        <path className="lis-tail"  d={LIS_D} pathLength="100" />
        <path className="lis-mid"   d={LIS_D} pathLength="100" />
        <path className="lis-head"  d={LIS_D} pathLength="100" />
      </g>
    </svg>
  )
}
