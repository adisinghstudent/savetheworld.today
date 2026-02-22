import { NextRequest, NextResponse } from "next/server";

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ candidates: [] });
  }

  if (!CEREBRAS_API_KEY) {
    console.error("[species-search] CEREBRAS_API_KEY not set");
    return NextResponse.json({ candidates: [] });
  }

  try {
    const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CEREBRAS_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3.1-8b",
        messages: [
          {
            role: "system",
            content: `You identify biological species from user search queries. Given a search query, determine if it refers to a real biological species (animal, plant, fungus, etc). If yes, return the scientific name (genus + species in Latin binomial) and the common English name. If the query is NOT about a species (e.g. "javascript", "climate policy", "news"), return an empty array. Respond ONLY with JSON, no explanation.`,
          },
          {
            role: "user",
            content: `Search query: "${q}"

Return JSON: { "candidates": [{ "commonName": "...", "scientificName": "Genus species" }] } or { "candidates": [] } if not a species.`,
          },
        ],
        temperature: 0,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.error("[species-search] Cerebras error:", res.status);
      return NextResponse.json({ candidates: [] });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json({ candidates: [] });

    const parsed = JSON.parse(content);
    const candidates = (parsed.candidates || []).slice(0, 3).map(
      (c: { commonName?: string; scientificName?: string }) => ({
        label: c.commonName || "",
        scientificName: c.scientificName || "",
      })
    );

    return NextResponse.json({ candidates });
  } catch (err) {
    console.error("[species-search] Error:", err);
    return NextResponse.json({ candidates: [] });
  }
}
