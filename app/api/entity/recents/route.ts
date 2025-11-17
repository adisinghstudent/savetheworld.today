import { NextRequest, NextResponse } from "next/server";
import Exa from "exa-js";

const exaApiKey = process.env.EXA_API_KEY;
const exa = exaApiKey ? new Exa(exaApiKey) : null;

export const maxDuration = 60;

interface SocialProfile {
  platform: string;
  url: string;
  username?: string;
}

// Build domain filters from social profiles
function buildDomainFilters(
  socialProfiles: SocialProfile[]
): Record<string, string[]> {
  const domainMap: Record<string, string[]> = {};

  socialProfiles.forEach((profile) => {
    const platform = profile.platform;

    switch (platform) {
      case "Twitter/X":
        if (!domainMap["Twitter/X"]) domainMap["Twitter/X"] = [];
        domainMap["Twitter/X"].push("x.com", "twitter.com");
        break;

      case "LinkedIn":
        if (!domainMap["LinkedIn"]) domainMap["LinkedIn"] = [];
        domainMap["LinkedIn"].push("linkedin.com");
        break;

      case "YouTube":
        if (!domainMap["YouTube"]) domainMap["YouTube"] = [];
        domainMap["YouTube"].push("youtube.com");
        break;

      case "GitHub":
        if (!domainMap["GitHub"]) domainMap["GitHub"] = [];
        domainMap["GitHub"].push("github.com");
        break;

      case "Medium":
        if (!domainMap["Medium"]) domainMap["Medium"] = [];
        domainMap["Medium"].push("medium.com");
        break;

      case "Reddit":
        if (!domainMap["Reddit"]) domainMap["Reddit"] = [];
        domainMap["Reddit"].push("reddit.com");
        break;
    }
  });

  return domainMap;
}

export async function POST(request: NextRequest) {
  if (!exa) {
    return NextResponse.json(
      { error: "EXA_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { entityName, socialProfiles, dateRange } = body;

    if (!entityName?.trim()) {
      return NextResponse.json(
        { error: "Entity name is required" },
        { status: 400 }
      );
    }

    const domainMap = buildDomainFilters(socialProfiles || []);

    // Calculate date filter (X days ago)
    const daysAgo = dateRange ? dateRange[1] : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    const startDateStr = startDate.toISOString().split("T")[0];

    // Search for content FROM the entity on their platforms
    const searchPromises = Object.entries(domainMap).map(
      async ([platform, domains]) => {
        try {
          const searchOptions: Record<string, unknown> = {
            type: "auto",
            includeDomains: domains,
            numResults: 10,
            text: true,
            startPublishedDate: startDateStr,
          };

          // For platforms like Twitter/LinkedIn, we want content authored by them
          // Use author filter if username is available
          const profile = socialProfiles.find(
            (p: SocialProfile) => p.platform === platform
          );

          if (profile?.username) {
            // Search for their username or handle
            const results = await exa.searchAndContents(
              `from:${profile.username} OR @${profile.username} OR ${entityName}`,
              searchOptions
            );

            return {
              platform,
              results: results.results,
            };
          } else {
            // Fallback to domain search
            const results = await exa.searchAndContents(
              entityName,
              searchOptions
            );

            return {
              platform,
              results: results.results,
            };
          }
        } catch (error) {
          console.error(`Error fetching ${platform} recents:`, error);
          return {
            platform,
            results: [],
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    );

    const allResults = await Promise.all(searchPromises);

    // Group results by platform and sort by date
    const groupedResults: Record<string, unknown> = {};
    const errors: Record<string, string> = {};

    allResults.forEach((result) => {
      if ("error" in result && result.error) {
        errors[result.platform] = result.error as string;
      } else if (result.results.length > 0) {
        // Sort by published date (most recent first)
        const sortedResults = result.results.sort((a: any, b: any) => {
          const dateA = a.publishedDate
            ? new Date(a.publishedDate).getTime()
            : 0;
          const dateB = b.publishedDate
            ? new Date(b.publishedDate).getTime()
            : 0;
          return dateB - dateA;
        });

        groupedResults[result.platform] = sortedResults;
      }
    });

    return NextResponse.json({
      results: groupedResults,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Recents fetch error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch recents", details: message },
      { status: 500 }
    );
  }
}
