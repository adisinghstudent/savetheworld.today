import { cerebras } from "@ai-sdk/cerebras";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import Exa from "exa-js";

export const maxDuration = 60;

const exaApiKey = process.env.EXA_API_KEY;
const exa = exaApiKey ? new Exa(exaApiKey) : null;

export async function POST(req: Request) {
  const { messages, webpageUrl }: { messages: UIMessage[]; webpageUrl?: string } = await req.json();

  console.log("[cerebras] Chat API called with webpageUrl:", webpageUrl);
  console.log("[cerebras] Number of messages:", messages.length);

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

  console.log("[cerebras] Converting messages for Cerebras");
  const convertedMessages = convertToModelMessages(messages);
  console.log("[cerebras] Number of messages to send:", convertedMessages.length);

  const systemMessage = crawledContent
    ? `You are an environmentally-focused AI assistant helping users explore topics related to wildlife conservation, climate change, and ecological health. The user is viewing a webpage with the following content:

Title: ${crawledContent.title}
URL: ${crawledContent.url}

Content:
${crawledContent.content}

Please answer the user's questions based on this webpage content. When relevant, connect topics back to environmental themes such as bee population decline, polar bear conservation, manatee protection, ocean health, and biodiversity. Favor referencing National Geographic and reputable environmental sources. Provide clear, concise, and accurate responses.`
    : "You are an environmentally-focused AI assistant helping users explore topics related to wildlife conservation, climate change, and ecological health. When relevant, connect topics back to environmental themes such as bee population decline, polar bear conservation, manatee protection, ocean health, and biodiversity. Favor referencing National Geographic and reputable environmental sources. Provide clear, concise, and accurate responses.";

  const result = streamText({
    model: cerebras("gpt-oss-120b"),
    messages: convertedMessages,
    system: systemMessage,
  });

  console.log("[cerebras] Streaming response (with webpage context:", !!crawledContent, ")");

  return result.toTextStreamResponse();
}
