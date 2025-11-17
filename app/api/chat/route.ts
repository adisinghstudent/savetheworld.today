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

  // Define the tool for crawling the current webpage
  const tools = webpageUrl && exa ? {
    crawl_current_page: tool({
      description: `Crawl and retrieve the full content of the currently open webpage (${webpageUrl}). Use this when the user asks about the current page, wants a summary, or needs specific information from it.`,
      parameters: z.object({}),
      execute: async () => {
        console.log("[exa-tool] Crawling webpage:", webpageUrl);
        try {
          const crawlStartTime = Date.now();
          const crawlResult = await exa!.getContents([webpageUrl], { text: true });
          const crawlDuration = Date.now() - crawlStartTime;

          console.log(`[exa-tool] Crawl completed in ${crawlDuration}ms`);

          if (crawlResult.results && crawlResult.results.length > 0) {
            const pageContent = crawlResult.results[0];
            console.log("[exa-tool] Title:", pageContent.title);
            console.log("[exa-tool] Content length:", pageContent.text?.length || 0, "characters");

            return {
              title: pageContent.title,
              url: webpageUrl,
              content: pageContent.text,
              author: pageContent.author,
              publishedDate: pageContent.publishedDate,
            };
          }

          return { error: "No content found for this URL" };
        } catch (error) {
          console.error("[exa-tool] ERROR:", error);
          return { error: String(error) };
        }
      },
    })
  } : {};

  console.log("[groq] Converting messages for Groq");
  const convertedMessages = convertToModelMessages(messages);
  console.log("[groq] Number of messages to send:", convertedMessages.length);

  const systemMessage = webpageUrl
    ? `You are a helpful AI assistant. The user currently has a webpage open: ${webpageUrl}.

When the user asks about the current page:
1. Use the crawl_current_page tool to retrieve the page content
2. After getting the content, analyze it and answer the user's question based on what you found
3. Always provide a clear, helpful response using the information from the crawled page

Provide clear, concise, and accurate responses.`
    : "You are a helpful AI assistant. Provide clear, concise, and accurate responses.";

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    messages: convertedMessages,
    system: systemMessage,
    tools,
    maxSteps: 10, // Allow multiple tool calls if needed
  });

  console.log("[groq] Streaming response initialized with tools:", Object.keys(tools));

  // When tools are available, consume the full multi-step stream
  if (Object.keys(tools).length > 0) {
    console.log("[groq] Waiting for multi-step completion...");

    try {
      // Use result.text which waits for all steps to complete
      const fullText = await result.text;

      console.log("[groq] Full response ready (length:", fullText.length, "):", fullText.substring(0, 200));

      // Return the final text
      return new Response(fullText, {
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    } catch (error) {
      console.error("[groq] Error during multi-step execution:", error);
      return new Response("Error generating response", { status: 500 });
    }
  }

  // For non-tool responses, stream normally
  return result.toTextStreamResponse();
}
