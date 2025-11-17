import { groq } from "@ai-sdk/groq";
import { streamText, UIMessage, convertToModelMessages, tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";

export const maxDuration = 60;

const exaApiKey = process.env.EXA_API_KEY;
const exa = exaApiKey ? new Exa(exaApiKey) : null;

export async function POST(req: Request) {
  const { messages, webpageUrl }: { messages: UIMessage[]; webpageUrl?: string } = await req.json();

  console.log("[groq] Chat API called with webpageUrl:", webpageUrl);
  console.log("[groq] Number of messages:", messages.length);

  // If webpage URL exists, crawl it immediately and add to context
  let crawledContent = null;
  if (webpageUrl && exa) {
    console.log("[exa-crawl] Pre-crawling webpage:", webpageUrl);
    try {
      const crawlStartTime = Date.now();
      const crawlResult = await exa.getContents([webpageUrl], { text: true });
      const crawlDuration = Date.now() - crawlStartTime;

      console.log(`[exa-crawl] Crawl completed in ${crawlDuration}ms`);

      if (crawlResult.results && crawlResult.results.length > 0) {
        const pageContent = crawlResult.results[0];
        console.log("[exa-crawl] Title:", pageContent.title);
        console.log("[exa-crawl] Content length:", pageContent.text?.length || 0, "characters");

        crawledContent = {
          title: pageContent.title,
          url: webpageUrl,
          content: pageContent.text?.substring(0, 10000), // Limit to 10k chars to avoid token limits
        };
      }
    } catch (error) {
      console.error("[exa-crawl] ERROR:", error);
    }
  }

  console.log("[groq] Converting messages for Groq");
  const convertedMessages = convertToModelMessages(messages);
  console.log("[groq] Number of messages to send:", convertedMessages.length);

  const systemMessage = crawledContent
    ? `You are a helpful AI assistant. The user is viewing a webpage with the following content:

Title: ${crawledContent.title}
URL: ${crawledContent.url}

Content:
${crawledContent.content}

Please answer the user's questions based on this webpage content. Provide clear, concise, and accurate responses.`
    : "You are a helpful AI assistant. Provide clear, concise, and accurate responses.";

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    messages: convertedMessages,
    system: systemMessage,
  });

  console.log("[groq] Streaming response (with webpage context:", !!crawledContent, ")");

  return result.toTextStreamResponse();
}
