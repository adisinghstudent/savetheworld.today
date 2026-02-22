import { NextRequest, NextResponse } from "next/server";

const GBIF_BASE = "https://api.gbif.org/v1";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim();
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "300", 10),
    300
  );

  if (!name) {
    return NextResponse.json({ occurrences: [] });
  }

  try {
    // Step 1: Match scientific name to GBIF taxon key
    const matchUrl = `${GBIF_BASE}/species/match?name=${encodeURIComponent(name)}`;
    const matchRes = await fetch(matchUrl);
    const matchData = await matchRes.json();

    const usageKey = matchData.usageKey;
    if (!usageKey) {
      return NextResponse.json({ occurrences: [] });
    }

    // Step 2: Fetch occurrences with coordinates
    const occUrl = `${GBIF_BASE}/occurrence/search?taxonKey=${usageKey}&hasCoordinate=true&limit=${limit}`;
    const occRes = await fetch(occUrl);
    const occData = await occRes.json();

    if (!occData.results || occData.results.length === 0) {
      return NextResponse.json({ occurrences: [] });
    }

    const occurrences = occData.results.map(
      (r: {
        decimalLatitude?: number;
        decimalLongitude?: number;
        year?: number;
        country?: string;
      }) => ({
        lat: r.decimalLatitude,
        lng: r.decimalLongitude,
        year: r.year || null,
        country: r.country || null,
      })
    ).filter((o: { lat?: number; lng?: number }) => o.lat != null && o.lng != null);

    return NextResponse.json({ occurrences });
  } catch (err) {
    console.error("[species-occurrences] Error:", err);
    return NextResponse.json({ occurrences: [] });
  }
}
