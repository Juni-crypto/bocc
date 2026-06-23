/**
 * Decorative QR mark from the mockup. This is a stylised SVG, not a scannable
 * code - the real poster comes from the BFF's join URL. Kept as a faithful
 * reproduction of the mockup's viewfinder QR.
 */
export function QrCode({ size = 180 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 29 29"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Event QR code"
    >
      <rect width="29" height="29" fill="#fff" />
      <g fill="#050505">
        <rect x="0" y="0" width="7" height="7" />
        <rect x="2" y="2" width="3" height="3" fill="#fff" />
        <rect x="2.8" y="2.8" width="1.4" height="1.4" />
        <rect x="22" y="0" width="7" height="7" />
        <rect x="24" y="2" width="3" height="3" fill="#fff" />
        <rect x="24.8" y="2.8" width="1.4" height="1.4" />
        <rect x="0" y="22" width="7" height="7" />
        <rect x="2" y="24" width="3" height="3" fill="#fff" />
        <rect x="2.8" y="24.8" width="1.4" height="1.4" />
        <rect x="9" y="1" width="1" height="1" />
        <rect x="11" y="1" width="1" height="1" />
        <rect x="13" y="2" width="1" height="1" />
        <rect x="16" y="1" width="1" height="1" />
        <rect x="19" y="2" width="1" height="1" />
        <rect x="9" y="3" width="2" height="1" />
        <rect x="13" y="4" width="1" height="2" />
        <rect x="17" y="3" width="2" height="1" />
        <rect x="10" y="6" width="1" height="1" />
        <rect x="1" y="9" width="1" height="2" />
        <rect x="3" y="9" width="1" height="1" />
        <rect x="5" y="10" width="2" height="1" />
        <rect x="2" y="12" width="1" height="1" />
        <rect x="4" y="13" width="1" height="1" />
        <rect x="9" y="9" width="3" height="3" />
        <rect x="14" y="9" width="1" height="2" />
        <rect x="16" y="10" width="2" height="1" />
        <rect x="19" y="9" width="1" height="3" />
        <rect x="22" y="9" width="1" height="1" />
        <rect x="24" y="10" width="2" height="2" />
        <rect x="27" y="9" width="1" height="2" />
        <rect x="9" y="14" width="1" height="1" />
        <rect x="11" y="15" width="2" height="1" />
        <rect x="14" y="14" width="1" height="2" />
        <rect x="17" y="15" width="1" height="1" />
        <rect x="20" y="14" width="2" height="1" />
        <rect x="24" y="15" width="1" height="2" />
        <rect x="27" y="14" width="1" height="1" />
        <rect x="9" y="18" width="2" height="1" />
        <rect x="13" y="19" width="1" height="1" />
        <rect x="16" y="18" width="1" height="2" />
        <rect x="19" y="19" width="2" height="1" />
        <rect x="23" y="18" width="1" height="1" />
        <rect x="26" y="19" width="2" height="1" />
        <rect x="9" y="22" width="1" height="2" />
        <rect x="11" y="23" width="2" height="1" />
        <rect x="14" y="22" width="1" height="1" />
        <rect x="16" y="24" width="2" height="1" />
        <rect x="19" y="22" width="1" height="3" />
        <rect x="22" y="23" width="2" height="1" />
        <rect x="25" y="22" width="1" height="2" />
        <rect x="27" y="24" width="1" height="1" />
        <rect x="10" y="26" width="1" height="1" />
        <rect x="13" y="27" width="1" height="1" />
        <rect x="15" y="26" width="2" height="1" />
        <rect x="18" y="27" width="1" height="1" />
        <rect x="21" y="26" width="1" height="1" />
        <rect x="24" y="27" width="2" height="1" />
      </g>
    </svg>
  );
}
