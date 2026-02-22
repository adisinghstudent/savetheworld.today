import { NextRequest, NextResponse } from "next/server";

const BLOCKLIST = [
  "film",
  "album",
  "song",
  "band",
  "city",
  "given name",
  "surname",
  "family name",
  "fictional character",
  "television series",
  "video game",
  "book",
  "novel",
  "magazine",
  "newspaper",
  "programming language",
  "software",
  "company",
  "sports team",
  "military unit",
  "automobile",
  "ship",
  "aircraft",
  "rocket",
  "satellite",
  "disambiguation page",
  "Wikimedia",
];

interface WikiCandidate {
  id: string;
  label: string;
  description: string;
  scientificName: string | null;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ candidates: [] });
  }

  try {
    // Step 1: Search Wikidata for entities matching the query
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=en&limit=10&format=json`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.search || searchData.search.length === 0) {
      return NextResponse.json({ candidates: [] });
    }

    // Step 2: Filter out non-species by description blocklist
    const filtered = searchData.search.filter(
      (item: { description?: string }) => {
        const desc = (item.description || "").toLowerCase();
        return !BLOCKLIST.some((term) => desc.includes(term.toLowerCase()));
      }
    );

    if (filtered.length === 0) {
      return NextResponse.json({ candidates: [] });
    }

    // Step 3: Fetch entities to check for P225 (taxon name)
    const ids = filtered
      .slice(0, 8)
      .map((item: { id: string }) => item.id)
      .join("|");
    const entitiesUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}&props=claims|labels|descriptions&languages=en&format=json`;
    const entitiesRes = await fetch(entitiesUrl);
    const entitiesData = await entitiesRes.json();

    const candidates: WikiCandidate[] = [];

    for (const entity of Object.values(entitiesData.entities || {})) {
      const e = entity as {
        id: string;
        labels?: { en?: { value: string } };
        descriptions?: { en?: { value: string } };
        claims?: {
          P225?: Array<{
            mainsnak?: { datavalue?: { value: string } };
          }>;
        };
      };
      const taxonClaim = e.claims?.P225;
      if (!taxonClaim || taxonClaim.length === 0) continue;

      const scientificName =
        taxonClaim[0]?.mainsnak?.datavalue?.value || null;
      if (!scientificName) continue;

      candidates.push({
        id: e.id,
        label: e.labels?.en?.value || "",
        description: e.descriptions?.en?.value || "",
        scientificName,
      });

      if (candidates.length >= 5) break;
    }

    return NextResponse.json({ candidates });
  } catch (err) {
    console.error("[species-search] Error:", err);
    return NextResponse.json({ candidates: [] });
  }
}
