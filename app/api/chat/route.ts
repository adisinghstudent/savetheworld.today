import { cerebras } from "@ai-sdk/cerebras";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import Exa from "exa-js";

export const maxDuration = 60;

const exaApiKey = process.env.EXA_API_KEY;
const exa = exaApiKey ? new Exa(exaApiKey) : null;

export async function POST(req: Request) {
  const { messages, webpageUrl }: { messages: UIMessage[]; webpageUrl?: string } = await req.json();

  console.log("Chat API called with webpageUrl:", webpageUrl);
  console.log("Number of messages:", messages.length);

  let webpageTitle: string | null = null;
  let modifiedMessages = messages;

  // If a webpage URL is provided, crawl it and prepend to the last user message
  if (webpageUrl && exa) {
    console.log("[exa-crawl] Starting crawl for URL:", webpageUrl);
    try {
      const crawlStartTime = Date.now();
      const crawlResult = await exa.getContents([webpageUrl], { text: true });
      const crawlDuration = Date.now() - crawlStartTime;

      console.log(`[exa-crawl] Crawl completed in ${crawlDuration}ms`);
      console.log("[exa-crawl] Results count:", crawlResult.results?.length || 0);

      if (crawlResult.results && crawlResult.results.length > 0) {
        const pageContent = crawlResult.results[0];
        webpageTitle = pageContent.title || null;
        console.log("[exa-crawl] Extracted title:", webpageTitle);
        console.log("[exa-crawl] Content length:", pageContent.text?.length || 0, "characters");
        console.log("[exa-crawl] Content preview (first 200 chars):", pageContent.text?.substring(0, 200));

        // Prepend webpage content to the last message (which should be the user's message)
        if (modifiedMessages.length > 0) {
          const lastMessage = modifiedMessages[modifiedMessages.length - 1];
          const webpageContext = `[Current webpage context]\nTitle: ${pageContent.title}\nURL: ${webpageUrl}\n\nContent:\n${pageContent.text}\n\n---\n\nUser question: `;

          console.log("[exa-crawl] Prepending context to user message");
          console.log("[exa-crawl] Original message:", lastMessage.parts?.find(p => p.type === "text")?.text);
          console.log("[exa-crawl] Context being prepended length:", webpageContext.length, "characters");

          modifiedMessages = [
            ...modifiedMessages.slice(0, -1),
            {
              ...lastMessage,
              parts: lastMessage.parts?.map((part, idx) => {
                // Prepend to the first text part
                if (idx === 0 && part.type === "text") {
                  return {
                    ...part,
                    text: webpageContext + (part.text || "")
                  };
                }
                return part;
              }) || []
            }
          ];

          console.log("[exa-crawl] Modified message length:", modifiedMessages[modifiedMessages.length - 1].parts?.find(p => p.type === "text")?.text?.length);
        } else {
          console.log("[exa-crawl] WARNING: No messages to prepend context to");
        }
      } else {
        console.log("[exa-crawl] WARNING: No results returned from crawl");
      }
    } catch (error) {
      console.error("[exa-crawl] ERROR:", error);
      // Continue without webpage context if crawl fails
    }
  } else {
    if (!webpageUrl) {
      console.log("[exa-crawl] SKIPPED: No webpageUrl provided");
    }
    if (!exa) {
      console.log("[exa-crawl] ERROR: Exa client not initialized (missing API key?)");
    }
  }

  console.log("[cerebras] Converting messages for Cerebras");
  console.log("[cerebras] Raw modifiedMessages:", JSON.stringify(modifiedMessages, null, 2));
  const convertedMessages = convertToModelMessages(modifiedMessages);
  console.log("[cerebras] Number of messages to send:", convertedMessages.length);
  console.log("[cerebras] Converted message details:", JSON.stringify(convertedMessages.map(m => ({
    role: m.role,
    contentType: typeof m.content,
    contentLength: typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length,
    contentPreview: typeof m.content === 'string' ? m.content.substring(0, 100) : JSON.stringify(m.content).substring(0, 100)
  })), null, 2));

  const result = streamText({
    model: cerebras("llama3.1-8b"),
    messages: convertedMessages,
    system: "You are a helpful AI assistant. Provide clear, concise, and accurate responses. When webpage context is provided, use it to give more accurate and relevant answers.",
  });

  console.log("[cerebras] Streaming response initialized");

  const response = result.toUIMessageStreamResponse();

  // Add webpage title to response headers if available
  if (webpageTitle) {
    console.log("[cerebras] Adding webpage title to response headers:", webpageTitle);
    response.headers.set("X-Webpage-Title", webpageTitle);
  }

  console.log("[cerebras] Returning response");
  return response;
}
