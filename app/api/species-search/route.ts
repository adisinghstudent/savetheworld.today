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
            content: `You extract biological species mentioned in user search queries. Given a search query, identify any real biological species (animal, plant, fungus, etc) that is mentioned or implied, even if the query is about a broader topic like conservation, population decline, habitat loss, or ecology. Extract the most prominent species referenced. For example:
- "why are bee populations declining" → Apis mellifera (Western Honey Bee)
- "coral reef bleaching crisis" → Acropora millepora (Staghorn Coral)
- "manatee population status" → Trichechus manatus (West Indian Manatee)
- "polar bear arctic ice" → Ursus maritimus (Polar Bear)
- "deforestation orangutan" → Pongo pygmaeus (Bornean Orangutan)
Only return an empty array if the query has absolutely NO connection to any biological species (e.g. "javascript tutorial", "stock market", "weather forecast"). Respond ONLY with JSON, no explanation.`,
          },
          {
            role: "user",
            content: `Search query: "${q}"

Return JSON: { "candidates": [{ "commonName": "...", "scientificName": "Genus species" }] } or { "candidates": [] } if truly no species is mentioned or implied.`,
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
