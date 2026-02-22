import { NextRequest, NextResponse } from "next/server";

const IUCN_API_KEY = process.env.IUCN_API_KEY;
const IUCN_BASE = "https://api.iucnredlist.org/api/v4";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json({ found: false });
  }

  if (!IUCN_API_KEY) {
    console.error("[species] IUCN_API_KEY not set");
    return NextResponse.json({ found: false });
  }

  try {
    // Step 1: Search by scientific name
    const parts = name.split(" ");
    const searchName = parts.slice(0, 2).join(" ");

    const taxaUrl = `${IUCN_BASE}/taxa/scientific_name/${encodeURIComponent(searchName)}`;
    const taxaRes = await fetch(taxaUrl, {
      headers: { Authorization: `Bearer ${IUCN_API_KEY}` },
    });

    if (!taxaRes.ok) {
      console.error("[species] Taxa search failed:", taxaRes.status);
      return NextResponse.json({ found: false });
    }

    const taxaData = await taxaRes.json();
    const taxa = taxaData.taxa;

    if (!taxa || taxa.length === 0) {
      return NextResponse.json({ found: false });
    }

    // Pick the taxon — prefer species-level match
    const taxon = taxa[0];
    const assessments = taxon.assessments;

    if (!assessments || assessments.length === 0) {
      return NextResponse.json({ found: false });
    }

    // Pick best assessment: prefer latest year + global scope
    const sorted = [...assessments].sort((a: { year?: number; scopes?: Array<{ description?: string }> }, b: { year?: number; scopes?: Array<{ description?: string }> }) => {
      const aGlobal = a.scopes?.some((s: { description?: string }) => s.description === "Global") ? 1 : 0;
      const bGlobal = b.scopes?.some((s: { description?: string }) => s.description === "Global") ? 1 : 0;
      if (aGlobal !== bGlobal) return bGlobal - aGlobal;
      return (b.year || 0) - (a.year || 0);
    });

    const bestAssessment = sorted[0];
    const assessmentId = bestAssessment.assessment_id;

    // Step 2: Fetch full assessment
    const assessUrl = `${IUCN_BASE}/assessment/${assessmentId}`;
    const assessRes = await fetch(assessUrl, {
      headers: { Authorization: `Bearer ${IUCN_API_KEY}` },
    });

    if (!assessRes.ok) {
      console.error("[species] Assessment fetch failed:", assessRes.status);
      return NextResponse.json({ found: false });
    }

    const assessData = await assessRes.json();

    // Extract red list category
    const redListCategory = assessData.red_list_category?.code || "NE";
    const redListCategoryName = assessData.red_list_category?.description || "Not Evaluated";

    // Extract population trend
    const populationTrend = assessData.population_trend?.code || "Unknown";
    const populationTrendName = assessData.population_trend?.description || "Unknown";

    // Extract population size from documentation
    let populationSize: string | null = null;
    if (assessData.documentation?.population) {
      populationSize = stripHtml(assessData.documentation.population);
    }

    // Extract threats
    const threats: string[] = [];
    if (assessData.threats && Array.isArray(assessData.threats)) {
      for (const threat of assessData.threats.slice(0, 3)) {
        if (threat.title) {
          threats.push(stripHtml(threat.title));
        }
      }
    }

    // Extract native countries (origin=Native, presence=Extant)
    const nativeCountries: string[] = [];
    if (assessData.geographical_range?.countries) {
      for (const c of assessData.geographical_range.countries) {
        const isNative = c.origin === 1 || c.origin_description === "Native";
        const isExtant = c.presence === 1 || c.presence_description === "Extant";
        if (isNative && isExtant && c.country?.iso2) {
          nativeCountries.push(c.country.iso2);
        }
      }
    }

    // Build IUCN page URL
    const taxonId = taxon.taxon_id || taxon.sis_taxon_id;
    const iucnUrl = taxonId
      ? `https://www.iucnredlist.org/species/${taxonId}/${assessmentId}`
      : `https://www.iucnredlist.org/search?query=${encodeURIComponent(searchName)}`;

    return NextResponse.json({
      found: true,
      taxon: {
        scientificName: taxon.scientific_name || searchName,
        commonName: taxon.common_names?.[0]?.name || null,
        kingdom: taxon.kingdom || null,
      },
      assessment: {
        redListCategory,
        redListCategoryName,
        populationTrend,
        populationTrendName,
        populationSize,
        nativeCountries,
        threats,
        iucnUrl,
        year: bestAssessment.year || null,
      },
    });
  } catch (err) {
    console.error("[species] Error:", err);
    return NextResponse.json({ found: false });
  }
}
