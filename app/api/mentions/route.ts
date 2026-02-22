import { NextResponse } from "next/server";
import Exa from "exa-js";

const exaApiKey = process.env.EXA_API_KEY;
const exa = exaApiKey ? new Exa(exaApiKey) : null;

export const maxDuration = 60;

const QUERIES = [
  "AI for climate change conservation tracking planet",
  "we need better tools to monitor endangered species environment",
  "building AI to help save the planet conservation tech",
];

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, "")           // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")     // bold
    .replace(/\*(.+?)\*/g, "$1")         // italic
    .replace(/__(.+?)__/g, "$1")         // bold alt
    .replace(/_(.+?)_/g, "$1")           // italic alt
    .replace(/~~(.+?)~~/g, "$1")         // strikethrough
    .replace(/`(.+?)`/g, "$1")           // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // images
    .replace(/^[-*+]\s+/gm, "")          // list markers
    .replace(/^\d+\.\s+/gm, "")          // numbered lists
    .replace(/^>\s*/gm, "")              // blockquotes
    .replace(/---+/g, "")                // horizontal rules
    .replace(/\n{2,}/g, " ")             // multiple newlines
    .replace(/\n/g, " ")                 // single newlines
    .trim();
}

export async function GET() {
  if (!exa) {
    return NextResponse.json({ mentions: [] });
  }

  try {
    const [twitterResults, redditResults] = await Promise.all([
      exa.searchAndContents(QUERIES[Math.floor(Math.random() * QUERIES.length)], {
        type: "auto",
        numResults: 8,
        includeDomains: ["x.com", "twitter.com"],
        text: true,
      }),
      exa.searchAndContents(QUERIES[Math.floor(Math.random() * QUERIES.length)], {
        type: "auto",
        numResults: 8,
        includeDomains: ["reddit.com"],
        text: true,
      }),
    ]);

    const mentions: { platform: string; handle: string; text: string; url: string }[] = [];

    twitterResults.results?.forEach((r) => {
      const handle = (() => {
        try {
          const url = new URL(r.url);
          const parts = url.pathname.split("/");
          return parts[1] ? `@${parts[1]}` : "@unknown";
        } catch {
          return "@unknown";
        }
      })();
      const snippet = stripMarkdown(r.text || "").slice(0, 200)?.trim();
      if (snippet) {
        mentions.push({ platform: "𝕏", handle, text: snippet, url: r.url });
      }
    });

    redditResults.results?.forEach((r) => {
      const subreddit = (() => {
        try {
          const url = new URL(r.url);
          const match = url.pathname.match(/\/r\/([^/]+)/);
          return match ? `r/${match[1]}` : "r/environment";
        } catch {
          return "r/environment";
        }
      })();
      const snippet = stripMarkdown(r.text || r.title || "").slice(0, 200)?.trim();
      if (snippet) {
        mentions.push({ platform: "Reddit", handle: subreddit, text: snippet, url: r.url });
      }
    });

    // Interleave twitter and reddit
    const interleaved: typeof mentions = [];
    const twitter = mentions.filter((m) => m.platform === "𝕏");
    const reddit = mentions.filter((m) => m.platform === "Reddit");
    const maxLen = Math.max(twitter.length, reddit.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < twitter.length) interleaved.push(twitter[i]);
      if (i < reddit.length) interleaved.push(reddit[i]);
    }

    return NextResponse.json({ mentions: interleaved });
  } catch (error) {
    console.error("[mentions] Error fetching mentions:", error);
    return NextResponse.json({ mentions: [] });
  }
}
