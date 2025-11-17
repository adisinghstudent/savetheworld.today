import { cerebras } from "@ai-sdk/cerebras";
import { streamText, UIMessage, convertToModelMessages } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: cerebras("llama3.1-8b"),
    messages: convertToModelMessages(messages),
    system: "You are a helpful AI assistant. Provide clear, concise, and accurate responses.",
  });

  return result.toUIMessageStreamResponse();
}
