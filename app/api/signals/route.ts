import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const base = process.env.API_URL ?? "http://localhost:5001"

  try {
    const res = await fetch(`${base}/api/opportunities`, { cache: "no-store" })
    if (!res.ok) {
      return NextResponse.json(
        {
          timestamp: null,
          count: 0,
          opportunities: [],
          error: `Backend returned ${res.status}`,
        },
        { status: 502 },
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json(
      {
        timestamp: null,
        count: 0,
        opportunities: [],
        error: e instanceof Error ? e.message : "Backend unreachable",
      },
      { status: 502 },
    )
  }
}
