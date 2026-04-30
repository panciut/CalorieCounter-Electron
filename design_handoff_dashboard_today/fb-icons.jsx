// Lucide-style line icons. 24x24, currentColor, 1.6px stroke.

const FBIcon = ({ d, size = 18, stroke = 1.6, fill = "none", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

// Multi-path icons need to pass children
const FBI = {
  // nav
  today:    <FBIcon d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />,
  foods:    <FBIcon d="M3 2l2 7h14l2-7 M7 9c0 6 2 9 5 13M17 9c0 6-2 9-5 13" />,
  pantry:   <FBIcon d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8 M10 12h4" />,
  recipes:  <FBIcon d="M6 2h12l-1 7H7zM5 22h14M7 13c-1.5 1.5-2 3-2 5h14c0-2-.5-3.5-2-5z" />,
  week:     <FBIcon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  history:  <FBIcon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  net:      <FBIcon d="M12 2v20M2 12h20 M7 7l10 10M17 7L7 17" />,
  exercise: <FBIcon d="M6.5 6.5a5 5 0 000 11M17.5 6.5a5 5 0 010 11M3 12h3m12 0h3M6.5 12h11" />,
  measurements: <FBIcon d="M2 12h20 M12 2v20 M4.93 4.93l14.14 14.14 M19.07 4.93L4.93 19.07" />,
  compare:  <FBIcon d="M8 6h13M8 12h8M8 18h5 M3 6h.01M3 12h.01M3 18h.01" />,
  body:     <FBIcon d="M12 4a3 3 0 100 6 3 3 0 000-6zM9 13c-2 0-4 1.5-4 4v3h14v-3c0-2.5-2-4-4-4z" />,
  goals:    <FBIcon d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7z" />,
  notifications: <FBIcon d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 003.4 0" />,
  data:     <FBIcon d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3" />,
  settings: <FBIcon d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />,
  supplements: <FBIcon d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7 7-7z" />,

  // actions
  plus:     <FBIcon d="M12 5v14M5 12h14" stroke={2} />,
  search:   <FBIcon d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" />,
  bell:     <FBIcon d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 003.4 0" />,
  chevL:    <FBIcon d="M15 18l-6-6 6-6" stroke={2} />,
  chevR:    <FBIcon d="M9 18l6-6-6-6" stroke={2} />,
  chevD:    <FBIcon d="M6 9l6 6 6-6" stroke={2} />,
  chevU:    <FBIcon d="M6 15l6-6 6 6" stroke={2} />,
  close:    <FBIcon d="M18 6L6 18M6 6l12 12" stroke={2} />,
  edit:     <FBIcon d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4z" />,
  more:     <FBIcon d="M12 5v.01M12 12v.01M12 19v.01" stroke={2.5} />,
  copy:     <FBIcon d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2 M9 2h6a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V3a1 1 0 011-1z" />,
  swap:     <FBIcon d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />,
  flame:    <FBIcon d="M8.5 14.5A4.5 4.5 0 1117 14c0 5-5 6-5 8 0-2-5-3-5-8 0-3 2-5 4-7 0 4 4 4 4 4-1-4 0-7-2.5-8.5C13 4 14 7 14 7" />,
  drop:     <FBIcon d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />,
  steps:    <FBIcon d="M14 5a2 2 0 11-4 0 2 2 0 014 0zM10 22l1-8 4 2-3 5 1 1zM5 13a2 2 0 100-4 2 2 0 000 4z M5 17l5-3" />,
  fork:     <FBIcon d="M5 2v8a3 3 0 003 3h0v9 M11 2v6 M8 2v6 M19 2c-1.5 1-3 3-3 6v3a2 2 0 002 2h1v9" />,
  scale:    <FBIcon d="M3 20h18 M5 12h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 002 2zM12 5v15 M9 8l3-3 3 3" />,
  heart:    <FBIcon d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />,
  star:     <FBIcon d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7z" />,
  starF:    <FBIcon d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7z" fill="currentColor" />,
  check:    <FBIcon d="M5 12l5 5L20 7" stroke={2.2} />,
  arrowUp:  <FBIcon d="M12 19V5M5 12l7-7 7 7" />,
  arrowDn:  <FBIcon d="M12 5v14M19 12l-7 7-7-7" />,
  trend:    <FBIcon d="M3 18l6-6 4 4 8-9" />,
  filter:   <FBIcon d="M3 6h18M6 12h12M10 18h4" stroke={2} />,
  trash:    <FBIcon d="M3 6h18 M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6 M10 11v6M14 11v6" />,
  zap:      <FBIcon d="M13 2L3 14h9l-1 8 10-12h-9z" />,
  apple:    <FBIcon d="M12 6c0-2 1-4 3-4M8 8c-3 0-5 2-5 6 0 5 3 8 6 8 1 0 2-1 3-1s2 1 3 1c3 0 6-3 6-8 0-4-2-6-5-6-1 0-2 .5-3 1-1-.5-2-1-3-1-1 0-2 0-2 0z" />,
  pill:     <FBIcon d="M10.5 4.5a4.95 4.95 0 117 7l-7 7a4.95 4.95 0 01-7-7zM7 11l6 6" />,
  clock:    <FBIcon d="M12 6v6l4 2 M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  layers:   <FBIcon d="M12 2L2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
};

window.FBIcon = FBIcon;
window.FBI = FBI;
