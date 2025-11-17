import { NextRequest, NextResponse } from "next/server";
import Exa from "exa-js";

const exaApiKey = process.env.EXA_API_KEY;
const exa = exaApiKey ? new Exa(exaApiKey) : null;

export const maxDuration = 60;

const PLATFORM_CONFIG: Record<
  string,
  {
    includeDomains?: string[];
    category?: string;
    numResults: number;
  }
> = {
  YouTube: {
    includeDomains: ["youtube.com"],
    numResults: 10,
  },
  "Twitter/X": {
    includeDomains: ["x.com", "twitter.com"],
    numResults: 10,
  },
  LinkedIn: {
    includeDomains: ["linkedin.com"],
    numResults: 10,
  },
  News: {
    category: "news",
    numResults: 10,
  },
  Reddit: {
    includeDomains: ["reddit.com"],
    numResults: 10,
  },
  Medium: {
    includeDomains: ["medium.com"],
    numResults: 10,
  },
  GitHub: {
    includeDomains: ["github.com"],
    numResults: 5,
  },
};

export async function POST(request: NextRequest) {
  if (!exa) {
    return NextResponse.json(
      { error: "EXA_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { entityName } = body;

    if (!entityName?.trim()) {
      return NextResponse.json(
        { error: "Entity name is required" },
        { status: 400 }
      );
    }

    // Search across all platforms in parallel
    const searchPromises = Object.entries(PLATFORM_CONFIG).map(
      async ([platform, config]) => {
        try {
          const searchOptions: Record<string, unknown> = {
            type: "auto",
            numResults: config.numResults,
            text: true,
          };

          if (config.includeDomains) {
            searchOptions.includeDomains = config.includeDomains;
          }

          if (config.category) {
            searchOptions.category = config.category;
          }

          const results = await exa.searchAndContents(
            `${entityName}`,
            searchOptions
          );

          return {
            platform,
            results: results.results,
          };
        } catch (error) {
          console.error(`Error fetching ${platform}:`, error);
          return {
            platform,
            results: [],
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    );

    const allResults = await Promise.all(searchPromises);

    // Group results by platform
    const groupedResults: Record<string, unknown> = {};
    const errors: Record<string, string> = {};

    allResults.forEach((result) => {
      if ("error" in result && result.error) {
        errors[result.platform] = result.error as string;
      } else if (result.results.length > 0) {
        groupedResults[result.platform] = result.results;
      }
    });

    return NextResponse.json({
      results: groupedResults,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Socials fetch error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch socials", details: message },
      { status: 500 }
    );
  }
}
