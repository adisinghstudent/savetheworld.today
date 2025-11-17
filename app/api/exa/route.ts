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
    includeDomains: ["youtube.com"],
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
  if (!exa) {
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
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json(
      { error: "Provide a non-empty query." },
      { status: 400 }
    );
  }

  // Execute searches for each result type in parallel
  const searchPromises = resultTypes.map(async (type) => {
    const config = RESULT_TYPE_CONFIG[type];
    if (!config) {
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

    try {
      const results = config.useContents
        ? await exa.searchAndContents(query, searchOptions)
        : await exa.search(query, searchOptions);

      return {
        type,
        results: results.results,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        type,
        error: message,
      };
    }
  });

  try {
    const allResults = await Promise.all(searchPromises);

    // Group results by type
    const groupedResults: Record<string, unknown> = {};
    const errors: Record<string, string> = {};

    allResults.forEach((result) => {
      if ("error" in result && result.error) {
        errors[result.type] = result.error;
      } else {
        groupedResults[result.type] = result.results;
      }
    });

    return NextResponse.json({
      mode,
      results: groupedResults,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch results from Exa.", details: message },
      { status: 502 }
    );
  }
}
