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

// Extract username from social media URLs
function extractUsername(url: string, platform: string): string | undefined {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    switch (platform.toLowerCase()) {
      case "twitter":
      case "x":
        // twitter.com/username or x.com/username
        const twitterMatch = pathname.match(/^\/([^\/]+)/);
        return twitterMatch ? twitterMatch[1] : undefined;

      case "linkedin":
        // linkedin.com/in/username or linkedin.com/company/companyname
        const linkedinMatch = pathname.match(/^\/(in|company)\/([^\/]+)/);
        return linkedinMatch ? linkedinMatch[2] : undefined;

      case "youtube":
        // youtube.com/@username or youtube.com/c/username or youtube.com/user/username
        const youtubeMatch = pathname.match(/^\/@?([^\/]+)|\/(?:c|user)\/([^\/]+)/);
        return youtubeMatch ? (youtubeMatch[1] || youtubeMatch[2]) : undefined;

      case "reddit":
        // reddit.com/u/username
        const redditMatch = pathname.match(/^\/u\/([^\/]+)/);
        return redditMatch ? redditMatch[1] : undefined;

      case "medium":
        // medium.com/@username
        const mediumMatch = pathname.match(/^\/@([^\/]+)/);
        return mediumMatch ? mediumMatch[1] : undefined;

      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

// Identify platform from URL
function identifyPlatform(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();

  if (hostname.includes("twitter.com") || hostname.includes("x.com")) return "Twitter/X";
  if (hostname.includes("linkedin.com")) return "LinkedIn";
  if (hostname.includes("youtube.com")) return "YouTube";
  if (hostname.includes("reddit.com")) return "Reddit";
  if (hostname.includes("medium.com")) return "Medium";
  if (hostname.includes("github.com")) return "GitHub";
  if (hostname.includes("tiktok.com")) return "TikTok";
  if (hostname.includes("instagram.com")) return "Instagram";
  if (hostname.includes("facebook.com")) return "Facebook";

  return "Other";
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
    const { query } = body;

    if (!query?.trim()) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Step 1: Find Wikipedia page for description
    let description = "";
    let entityName = query.trim();

    try {
      const wikiSearch = await exa.searchAndContents(
        `${query} wikipedia page`,
        {
          type: "keyword",
          includeDomains: ["wikipedia.org"],
          numResults: 1,
          text: true,
        }
      );

      if (wikiSearch.results.length > 0) {
        const wikiResult = wikiSearch.results[0];
        // Extract first paragraph as description
        const text = wikiResult.text || "";
        const firstParagraph = text.split("\n\n")[0];
        description = firstParagraph.slice(0, 300);

        // Get cleaner entity name from wiki title
        if (wikiResult.title) {
          entityName = wikiResult.title.replace(" - Wikipedia", "");
        }
      }
    } catch (error) {
      console.error("Wikipedia search error:", error);
    }

    // Step 2: Find official website
    let website = "";

    try {
      const websiteSearch = await exa.search(`${query} official website`, {
        type: "auto",
        numResults: 1,
      });

      if (websiteSearch.results.length > 0) {
        website = websiteSearch.results[0].url;
      }
    } catch (error) {
      console.error("Website search error:", error);
    }

    // Step 3: Find social profiles
    const socialProfiles: SocialProfile[] = [];
    const socialQueries = [
      { query: `${query} twitter profile`, domains: ["twitter.com", "x.com"] },
      { query: `${query} linkedin profile`, domains: ["linkedin.com"] },
      { query: `${query} youtube channel`, domains: ["youtube.com"] },
      { query: `${query} github profile`, domains: ["github.com"] },
      { query: `${query} instagram profile`, domains: ["instagram.com"] },
    ];

    // Search for social profiles in parallel
    const socialSearches = await Promise.allSettled(
      socialQueries.map(({ query: socialQuery, domains }) =>
        exa.search(socialQuery, {
          type: "keyword",
          includeDomains: domains,
          numResults: 1,
        })
      )
    );

    socialSearches.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value.results.length > 0) {
        const socialResult = result.value.results[0];
        const platform = identifyPlatform(socialResult.url);
        const username = extractUsername(socialResult.url, platform);

        socialProfiles.push({
          platform,
          url: socialResult.url,
          username,
        });
      }
    });

    return NextResponse.json({
      entity: {
        name: entityName,
        description,
        website: website || undefined,
        socialProfiles,
      },
    });
  } catch (error) {
    console.error("Entity search error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to search for entity", details: message },
      { status: 500 }
    );
  }
}
