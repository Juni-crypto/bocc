"use client";

import { QRCodeSVG } from "qrcode.react";

/**
 * Real, scannable QR code for an event's join URL. Rendered on a white plate
 * so it scans reliably against the dark UI.
 */
export function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        bgColor="#ffffff"
        fgColor="#050505"
        marginSize={1}
      />
    </div>
  );
}
