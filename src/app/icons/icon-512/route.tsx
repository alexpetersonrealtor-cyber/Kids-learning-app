import { ImageResponse } from "next/og";


export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 290,
          background: "#0284c7",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        🎮
      </div>
    ),
    { width: 512, height: 512 },
  );
}
