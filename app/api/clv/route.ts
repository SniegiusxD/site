import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const EMPTY = {
  total: 0,
  closed: 0,
  open: 0,
  mean_clv_pct: null,
  pct_positive: null,
  by_sport: [],
  recent: [],
}

export async function GET() {
  const base = process.env.API_URL ?? "http://localhost:5001"

  try {
    const res = await fetch(`${base}/api/clv`, { cache: "no-store" })
    if (!res.ok) {
      return NextResponse.json(
        { ...EMPTY, error: `Backend returned ${res.status}` },
        { status: 502 },
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json(
      { ...EMPTY, error: e instanceof Error ? e.message : "Backend unreachable" },
      { status: 502 },
    )
  }
}
