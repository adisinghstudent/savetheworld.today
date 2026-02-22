"use client";

import { useState, useRef, useEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@ai-sdk/react";


const ChatContext = createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  browserUrl: string | null;
  webpageTitle: string | null;
  setWebpageTitle: (title: string | null) => void;
}>({
  isOpen: false,
  setIsOpen: () => {},
  browserUrl: null,
  webpageTitle: null,
  setWebpageTitle: () => {},
});

export function ChatProvider({
  children,
  browserUrl
}: {
  children: React.ReactNode;
  browserUrl: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [webpageTitle, setWebpageTitle] = useState<string | null>(null);

  return (
    <ChatContext.Provider value={{ isOpen, setIsOpen, browserUrl, webpageTitle, setWebpageTitle }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatPanel() {
  return useContext(ChatContext);
}

export function ChatToggleButton() {
  const { isOpen, setIsOpen } = useChatPanel();

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20, transition: { duration: 0 } }}
          transition={{ duration: 0.3 }}
          onClick={() => setIsOpen(true)}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-black transition-colors hover:bg-gray-200 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
          aria-label="Open chat"
        >
          Ask Page
        </motion.button>
      )}
    </AnimatePresence>
  );
}

const getFaviconUrl = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
};

export default function ChatPanel() {
  const { isOpen, setIsOpen, browserUrl, webpageTitle, setWebpageTitle } = useChatPanel();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const browserUrlRef = useRef(browserUrl);

  // Keep ref updated with current browserUrl
  useEffect(() => {
    browserUrlRef.current = browserUrl;
    console.log("[ChatPanel] browserUrl updated:", browserUrl);
  }, [browserUrl]);

  const [messages, setMessages] = useState<Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const reload = () => {
    // Implement reload if needed
  };

  // Wrapper to send message with current browserUrl
  const handleSendMessage = async (content: string) => {
    if (isLoading) return; // Prevent duplicate sends

    console.log("[ChatPanel] Sending message with browserUrl:", browserUrlRef.current);

    // Generate unique IDs using timestamp + random
    const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const assistantMessageId = `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add user message to UI immediately
    const userMessage = {
      id: userMessageId,
      role: "user" as const,
      content,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Convert our simple messages to UIMessage format for the API
      const uiMessages = [...messages, userMessage].map(m => ({
        id: m.id,
        role: m.role,
        parts: [{ type: "text" as const, text: m.content }],
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: uiMessages,
          webpageUrl: browserUrlRef.current || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantContent = "";

      // Read the text stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        assistantContent += text;

        // Update messages with streaming response
        setMessages(prev => {
          // Remove existing assistant message if present
          const withoutAssistant = prev.filter(m => m.id !== assistantMessageId);
          // Add updated assistant message
          return [...withoutAssistant, {
            id: assistantMessageId,
            role: "assistant" as const,
            content: assistantContent,
          }];
        });
      }

      console.log("[ChatPanel] Stream complete");
    } catch (error) {
      console.error("[ChatPanel] Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };


  // Set title from URL when browserUrl changes
  useEffect(() => {
    if (browserUrl) {
      try {
        const url = new URL(browserUrl);
        // Use domain as title
        setWebpageTitle(url.hostname.replace("www.", ""));
      } catch {
        setWebpageTitle("Current Page");
      }
    } else {
      setWebpageTitle(null);
    }
  }, [browserUrl, setWebpageTitle]);

  // isLoading is now managed in state

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 384 }}
          exit={{ width: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="flex h-screen flex-col overflow-hidden border-l border-gray-200/60 bg-[#f8f7f4] dark:border-gray-800/60 dark:bg-black"
        >
            {/* Close Button */}
            <div className="flex justify-end p-4">
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-600 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ask about bees, polar bears, manatees, or any environmental topic.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div className={`max-w-[85%] space-y-2 ${message.role === "user" ? "w-full" : ""}`}>
                        {message.role === "user" && (
                          <div className="mb-2 flex items-center justify-end gap-2">
                            {browserUrl && webpageTitle ? (
                              <>
                                {getFaviconUrl(browserUrl) && (
                                  <img
                                    src={getFaviconUrl(browserUrl)!}
                                    alt="favicon"
                                    className="h-4 w-4"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                )}
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{webpageTitle}</span>
                              </>
                            ) : (
                              <>
                                <span className="text-base leading-none">🐝</span>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Bees</span>
                              </>
                            )}
                          </div>
                        )}
                        <div
                          className={`rounded-lg px-4 py-2.5 text-sm ${
                            message.role === "user"
                              ? "bg-[rgb(234,179,8)]/10 text-gray-900 dark:bg-[rgb(234,179,8)]/20 dark:text-white"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                        {message.role === "assistant" && (
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(message.content || "");
                              }}
                              className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                              aria-label="Copy response"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => reload()}
                              className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                              aria-label="Regenerate response"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[85%] rounded-lg border border-gray-200/60 bg-white/50 p-3 text-sm dark:border-gray-700/60 dark:bg-black/50">
                        <div className="flex gap-1">
                          <span className="animate-bounce text-gray-500 dark:text-gray-400">
                            •
                          </span>
                          <span
                            className="animate-bounce text-gray-500 dark:text-gray-400"
                            style={{ animationDelay: "0.2s" }}
                          >
                            •
                          </span>
                          <span
                            className="animate-bounce text-gray-500 dark:text-gray-400"
                            style={{ animationDelay: "0.4s" }}
                          >
                            •
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200/60 p-4 dark:border-gray-800/60">
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                {browserUrl && webpageTitle ? (
                  <>
                    {getFaviconUrl(browserUrl) && (
                      <img
                        src={getFaviconUrl(browserUrl)!}
                        alt="favicon"
                        className="h-4 w-4"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <span>{webpageTitle}</span>
                  </>
                ) : (
                  <>
                    <span className="text-base leading-none">🐝</span>
                    <span>Bees</span>
                  </>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (input.trim()) {
                    handleSendMessage(input);
                    setInput("");
                  }
                }}
                className="flex items-center gap-2"
              >
                <button type="button" className="text-gray-500 dark:text-gray-400" aria-label="Add files">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about wildlife & the environment"
                  disabled={isLoading}
                  className="flex-1 border-b border-gray-300 bg-transparent py-2 text-sm text-gray-900 placeholder-gray-500 outline-none disabled:opacity-50 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
  );
}
