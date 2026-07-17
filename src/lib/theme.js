// Color tokens for the WaitQR dashboard. Keeping this as a plain object (rather than CSS
// variables) lets components pass colors directly into inline styles and SVG props, which is
// used heavily throughout (e.g. <FillBorder color={C.amber} />). If this grows, it's a natural
// seam to convert into CSS custom properties or a Tailwind theme extension.
export const C = {
  ink900: "#12151B",
  ink800: "#1B2028",
  ink700: "#262C36",
  ink600: "#333B47",
  hair: "#333B47",
  paper: "#EFEAD9",
  paperLine: "#D9D2BC",
  inkText: "#1B2028",
  amber: "#E8A33D",
  amberSoft: "rgba(232,163,61,0.14)",
  teal: "#4FB286",
  tealSoft: "rgba(79,178,134,0.14)",
  coral: "#E2614F",
  coralSoft: "rgba(226,97,79,0.14)",
  textLight: "#F2EFE7",
  textMuted: "#8B919C",
  textFaint: "#5B6270",
};
