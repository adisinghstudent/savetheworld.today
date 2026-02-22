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
    // Step 1: Search by scientific name using query params (v4 format)
    const parts = name.split(" ");
    const genusName = parts[0];
    const speciesName = parts[1] || "";

    const taxaUrl = `${IUCN_BASE}/taxa/scientific_name?genus_name=${encodeURIComponent(genusName)}&species_name=${encodeURIComponent(speciesName)}`;
    const taxaRes = await fetch(taxaUrl, {
      headers: { Authorization: `Bearer ${IUCN_API_KEY}` },
    });

    if (!taxaRes.ok) {
      console.error("[species] Taxa search failed:", taxaRes.status);
      return NextResponse.json({ found: false });
    }

    const taxaData = await taxaRes.json();
    const taxon = taxaData.taxon;

    if (!taxon || !taxon.sis_id) {
      return NextResponse.json({ found: false });
    }

    // Get common name from taxon
    const commonNames = taxon.common_names || [];
    const engMain = commonNames.find(
      (c: { main?: boolean; language?: string }) => c.main && c.language === "eng"
    );
    const engAny = commonNames.find(
      (c: { language?: string }) => c.language === "eng"
    );
    const commonName = engMain?.name || engAny?.name || null;

    // Step 2: Fetch assessments via taxa/sis/{sis_id}
    const sisUrl = `${IUCN_BASE}/taxa/sis/${taxon.sis_id}`;
    const sisRes = await fetch(sisUrl, {
      headers: { Authorization: `Bearer ${IUCN_API_KEY}` },
    });

    if (!sisRes.ok) {
      console.error("[species] SIS fetch failed:", sisRes.status);
      return NextResponse.json({ found: false });
    }

    const sisData = await sisRes.json();
    const assessments = sisData.assessments;

    if (!assessments || assessments.length === 0) {
      return NextResponse.json({ found: false });
    }

    // Pick best assessment: prefer latest=true + Global scope
    const sorted = [...assessments].sort(
      (
        a: {
          latest?: boolean;
          year_published?: string;
          scopes?: Array<{ code?: string; description?: { en?: string } }>;
        },
        b: {
          latest?: boolean;
          year_published?: string;
          scopes?: Array<{ code?: string; description?: { en?: string } }>;
        }
      ) => {
        const aGlobal = a.scopes?.some(
          (s) => s.description?.en === "Global" || s.code === "1"
        )
          ? 1
          : 0;
        const bGlobal = b.scopes?.some(
          (s) => s.description?.en === "Global" || s.code === "1"
        )
          ? 1
          : 0;
        if (aGlobal !== bGlobal) return bGlobal - aGlobal;
        const aLatest = a.latest ? 1 : 0;
        const bLatest = b.latest ? 1 : 0;
        if (aLatest !== bLatest) return bLatest - aLatest;
        return (
          parseInt(b.year_published || "0") -
          parseInt(a.year_published || "0")
        );
      }
    );

    const bestAssessment = sorted[0];
    const assessmentId = bestAssessment.assessment_id;

    // Step 3: Fetch full assessment details
    const assessUrl = `${IUCN_BASE}/assessment/${assessmentId}`;
    const assessRes = await fetch(assessUrl, {
      headers: { Authorization: `Bearer ${IUCN_API_KEY}` },
    });

    if (!assessRes.ok) {
      console.error("[species] Assessment fetch failed:", assessRes.status);
      return NextResponse.json({ found: false });
    }

    const assess = await assessRes.json();

    // Red list category
    const redListCategory = assess.red_list_category?.code || "NE";
    const redListCategoryName =
      assess.red_list_category?.description?.en || "Not Evaluated";

    // Population trend
    const populationTrend = assess.population_trend?.code || "Unknown";
    const populationTrendName =
      assess.population_trend?.description?.en || "Unknown";

    // Population size from documentation
    let populationSize: string | null = null;
    if (assess.documentation?.population) {
      populationSize = stripHtml(assess.documentation.population);
    }

    // Threats (from description.en)
    const threats: string[] = [];
    if (assess.threats && Array.isArray(assess.threats)) {
      for (const threat of assess.threats.slice(0, 5)) {
        const desc = threat.description?.en;
        if (desc) threats.push(desc);
      }
    }

    // Native countries from locations array (v4 uses `locations`, not `geographical_range`)
    const nativeCountries: string[] = [];
    if (assess.locations && Array.isArray(assess.locations)) {
      for (const loc of assess.locations) {
        const isNative = loc.origin === "Native";
        const isExtant =
          loc.presence === "Extant" || loc.presence === "Possibly Extant";
        if (isNative && isExtant && loc.code) {
          nativeCountries.push(loc.code);
        }
      }
    }

    // IUCN page URL (provided directly in assessment list)
    const iucnUrl =
      bestAssessment.url ||
      assess.url ||
      `https://www.iucnredlist.org/species/${taxon.sis_id}/${assessmentId}`;

    return NextResponse.json({
      found: true,
      taxon: {
        scientificName: taxon.scientific_name || name,
        commonName,
        kingdom: taxon.kingdom_name || null,
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
        year: bestAssessment.year_published || null,
      },
    });
  } catch (err) {
    console.error("[species] Error:", err);
    return NextResponse.json({ found: false });
  }
}
