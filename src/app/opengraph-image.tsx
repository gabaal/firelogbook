import { ImageResponse } from "next/og";
import { baseUrl } from "@/lib/mail";

export const alt =
  "FireLogbook — the fire safety logbook for small sites, with a dated audit pack";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const host = new URL(baseUrl()).host;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f4f1eb",
          color: "#1c1b18",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#b4451f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            FL
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#b4451f" }}>
            FireLogbook
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 66,
              fontWeight: 800,
              lineHeight: 1.08,
              maxWidth: 980,
            }}
          >
            The logbook an inspector will actually accept.
          </div>
          <div style={{ fontSize: 30, color: "#57534e", maxWidth: 900, lineHeight: 1.35 }}>
            Record fire safety checks on a phone, chase what is overdue, and
            hand over a dated audit pack.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#78716c" }}>
          <span>{host}</span>
          <span>13 checks · reminders · PDF audit pack</span>
        </div>
      </div>
    ),
    size,
  );
}
