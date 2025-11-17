import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

interface SearchResult {
  title: string;
  url: string;
  text?: string;
  publishedDate?: string;
}

interface GroupedResults {
  [key: string]: SearchResult[];
}

export async function POST(request: NextRequest) {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { results, entityName, dateRange }: {
      results: GroupedResults;
      entityName: string;
      dateRange: [number, number];
    } = body;

    if (!results || Object.keys(results).length === 0) {
      return NextResponse.json(
        { error: "No results to analyze" },
        { status: 400 }
      );
    }

    // Flatten all results
    const allResults: SearchResult[] = [];
    Object.values(results).forEach((platformResults) => {
      allResults.push(...platformResults);
    });

    // Sort by date (most recent first)
    allResults.sort((a, b) => {
      const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
      const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
      return dateB - dateA;
    });

    // Build context for AI
    const context = allResults
      .slice(0, 30) // Limit to 30 most recent items
      .map((result, idx) => {
        const date = result.publishedDate
          ? new Date(result.publishedDate).toLocaleDateString()
          : "Unknown date";
        return `[${idx + 1}] ${date} - ${result.title}\n${result.text?.slice(0, 200) || ""}`;
      })
      .join("\n\n");

    const daysRange = dateRange[1];

    // Call Groq API
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing social media and news content to identify themes, trends, and key quotes. You extract insights about what people or companies are discussing.`,
          },
          {
            role: "user",
            content: `Analyze the following content about "${entityName}" from the last ${daysRange} days. Provide:

1. **Hottest Topics**: Identify the 3-5 most frequently discussed themes with approximate mention counts
2. **Key Quotes**: Extract 3-5 notable quotes from ${entityName} (if available in the content)
3. **Theme Evolution**: Show how themes have changed over time (e.g., "Last 7 days", "7-14 days ago", etc.)

Content to analyze:
${context}

Respond in JSON format:
{
  "hottestTopics": [
    {"theme": "Topic name", "count": 5, "period": "Last 7 days"}
  ],
  "keyQuotes": ["Quote 1", "Quote 2"],
  "themeTimeline": [
    {"period": "Last 7 days", "themes": ["Theme 1", "Theme 2"]},
    {"period": "7-14 days ago", "themes": ["Theme 3"]}
  ]
}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`);
    }

    const groqData = await groqResponse.json();
    const aiResponse = groqData.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from Groq API");
    }

    const summary = JSON.parse(aiResponse);

    return NextResponse.json({
      summary: {
        hottestTopics: summary.hottestTopics || [],
        keyQuotes: summary.keyQuotes || [],
        themeTimeline: summary.themeTimeline || [],
      },
    });
  } catch (error) {
    console.error("Summary generation error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to generate summary", details: message },
      { status: 500 }
    );
  }
}
