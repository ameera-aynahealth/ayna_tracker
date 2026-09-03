import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F7F1E8",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 132,
            height: 132,
            borderRadius: 30,
            background: "#FFFFFF",
            border: "3px solid #E7DBC8",
            color: "#7C3D1F",
            fontFamily: "Georgia, serif",
            fontSize: 54,
            fontWeight: 600,
            letterSpacing: "-2px",
          }}
        >
          ayna
        </div>
      </div>
    ),
    size,
  );
}
