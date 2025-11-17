import { NextRequest, NextResponse } from "next/server";
import Exa from "exa-js";

const exaApiKey = process.env.EXA_API_KEY;
const exa = exaApiKey ? new Exa(exaApiKey) : null;

export async function POST(request: NextRequest) {
  if (!exa) {
    return NextResponse.json(
      { error: "You didnt set the EXA_API_KEY environment variable." },
      { status: 500 },
    );
  }

  let query = "";
  let mode: "auto" | "fast" = "auto";
  let options: Record<string, unknown> | undefined;

  try {
    const body = (await request.json()) as {
      query?: string;
      mode?: "auto" | "fast";
      options?: Record<string, unknown>;
    };

    query = body.query?.trim() ?? "";
    mode = body.mode === "fast" ? "fast" : "auto";
    options = body.options;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json(
      { error: "Provide a non-empty query." },
      { status: 400 },
    );
  }

  const searchOptions =
    mode === "fast"
      ? { type: "fast", livecrawl: "never", ...(options ?? {}) }
      : { text: true, ...(options ?? {}) };

  try {
    const results = await exa.searchAndContents(query, searchOptions);
    return NextResponse.json({ mode, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch results from Exa.", details: message },
      { status: 502 },
    );
  }
}
