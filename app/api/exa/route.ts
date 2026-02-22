import { NextRequest, NextResponse } from "next/server";
import Exa from "exa-js";

const exaApiKey = process.env.EXA_API_KEY;
const exa = exaApiKey ? new Exa(exaApiKey) : null;

export const maxDuration = 60;

// Domain mapping for each result type
const RESULT_TYPE_CONFIG: Record<
  string,
  {
    includeDomains?: string[];
    category?: string;
    numResults: number;
    useContents?: boolean;
  }
> = {
  youtube: {
    includeDomains: ["youtube.com/@NatGeo", "youtube.com/@NationalGeographic", "youtube.com"],
    numResults: 10,
    useContents: false,
  },
  github: {
    includeDomains: ["github.com"],
    numResults: 10,
    useContents: false,
  },
  linkedin: {
    includeDomains: ["linkedin.com"],
    numResults: 10,
    useContents: true,
  },
  news: {
    category: "news",
    numResults: 10,
    useContents: true,
  },
  reddit: {
    includeDomains: ["reddit.com"],
    numResults: 10,
    useContents: false,
  },
  twitter: {
    includeDomains: ["x.com", "twitter.com"],
    numResults: 10,
    useContents: true,
  },
  wikipedia: {
    includeDomains: ["wikipedia.org"],
    numResults: 5,
    useContents: true,
  },
  research: {
    includeDomains: ["arxiv.org", "scholar.google.com", "researchgate.net"],
    numResults: 10,
    useContents: true,
  },
  medium: {
    includeDomains: ["medium.com"],
    numResults: 10,
    useContents: true,
  },
  stackoverflow: {
    includeDomains: ["stackoverflow.com"],
    numResults: 10,
    useContents: false,
  },
  producthunt: {
    includeDomains: ["producthunt.com"],
    numResults: 10,
    useContents: false,
  },
  hackernews: {
    includeDomains: ["news.ycombinator.com"],
    numResults: 10,
    useContents: false,
  },
  tiktok: {
    includeDomains: ["tiktok.com"],
    numResults: 10,
    useContents: false,
  },
  general: {
    numResults: 10,
    useContents: true,
  },
};

export async function POST(request: NextRequest) {
  console.log("[exa-search] API route called");

  if (!exa) {
    console.log("[exa-search] ERROR: Exa client not initialized");
    return NextResponse.json(
      { error: "You didnt set the EXA_API_KEY environment variable." },
      { status: 500 }
    );
  }

  let query = "";
  let mode: "auto" | "fast" = "auto";
  let resultTypes: string[] = ["general"];
  let options: Record<string, unknown> | undefined;

  try {
    const body = (await request.json()) as {
      query?: string;
      mode?: "auto" | "fast";
      resultTypes?: string[];
      options?: Record<string, unknown>;
    };

    query = body.query?.trim() ?? "";
    mode = body.mode === "fast" ? "fast" : "auto";
    resultTypes = body.resultTypes && body.resultTypes.length > 0
      ? body.resultTypes
      : ["general"];
    options = body.options;

    console.log("[exa-search] Query:", query);
    console.log("[exa-search] Mode:", mode);
    console.log("[exa-search] Result types:", resultTypes);
  } catch {
    console.log("[exa-search] ERROR: Invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!query) {
    console.log("[exa-search] ERROR: Empty query");
    return NextResponse.json(
      { error: "Provide a non-empty query." },
      { status: 400 }
    );
  }

  // Execute searches for each result type in parallel
  const searchPromises = resultTypes.map(async (type) => {
    const config = RESULT_TYPE_CONFIG[type];
    if (!config) {
      console.log(`[exa-search] ERROR: Unknown result type: ${type}`);
      return { type, error: `Unknown result type: ${type}` };
    }

    const searchOptions: Record<string, unknown> = {
      type: mode === "fast" ? "keyword" : "auto",
      numResults: config.numResults,
      ...(options ?? {}),
    };

    if (config.includeDomains) {
      searchOptions.includeDomains = config.includeDomains;
    }

    if (config.category) {
      searchOptions.category = config.category;
    }

    if (config.useContents) {
      searchOptions.text = true;
    }

    if (mode === "fast") {
      searchOptions.livecrawl = "never";
    }

    console.log(`[exa-search] Starting search for type: ${type}`);
    console.log(`[exa-search] Options for ${type}:`, JSON.stringify(searchOptions, null, 2));

    try {
      const searchStartTime = Date.now();
      const results = config.useContents
        ? await exa.searchAndContents(query, searchOptions)
        : await exa.search(query, searchOptions);
      const searchDuration = Date.now() - searchStartTime;

      console.log(`[exa-search] Search for ${type} completed in ${searchDuration}ms`);
      console.log(`[exa-search] Results count for ${type}:`, results.results?.length || 0);

      return {
        type,
        results: results.results,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[exa-search] ERROR for ${type}:`, message);
      return {
        type,
        error: message,
      };
    }
  });

  try {
    const allResults = await Promise.all(searchPromises);

    console.log("[exa-search] All searches completed");

    // Group results by type
    const groupedResults: Record<string, unknown> = {};
    const errors: Record<string, string> = {};

    allResults.forEach((result) => {
      if ("error" in result && result.error) {
        errors[result.type] = result.error;
        console.log(`[exa-search] Error for ${result.type}:`, result.error);
      } else {
        groupedResults[result.type] = result.results;
        console.log(`[exa-search] Success for ${result.type}: ${Array.isArray(result.results) ? result.results.length : 0} results`);
      }
    });

    console.log("[exa-search] Returning response with", Object.keys(groupedResults).length, "result types");
    if (Object.keys(errors).length > 0) {
      console.log("[exa-search] Response includes errors:", Object.keys(errors));
    }

    return NextResponse.json({
      mode,
      results: groupedResults,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[exa-search] FATAL ERROR:", message);
    return NextResponse.json(
      { error: "Failed to fetch results from Exa.", details: message },
      { status: 502 }
    );
  }
}
