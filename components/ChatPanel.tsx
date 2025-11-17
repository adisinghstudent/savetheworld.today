"use client";

import { useState, useRef, useEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@ai-sdk/react";
import Image from "next/image";

const ChatContext = createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({ isOpen: false, setIsOpen: () => {} });

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ChatContext.Provider value={{ isOpen, setIsOpen }}>
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
          exit={{ opacity: 0, x: 20 }}
          onClick={() => setIsOpen(true)}
          className="bg-gray-100 px-4 py-2 text-sm text-black transition-colors hover:bg-gray-200 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
          aria-label="Open chat"
        >
          Ask Page
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default function ChatPanel() {
  const { isOpen, setIsOpen } = useChatPanel();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, reload } = useChat();

  const isLoading = messages.some(m => m.parts?.some(p => p.type === "text" && !p.text));

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
          className="flex h-screen flex-col overflow-hidden border-l border-gray-300 bg-white dark:border-gray-700 dark:bg-black"
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
                    Start a conversation by typing a message below.
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
                      <div
                        className={`max-w-[85%] space-y-2 ${
                          message.role === "user" ? "w-full" : ""
                        }`}
                      >
                        {message.parts?.map((part, i) => {
                          // Text content
                          if (part.type === "text" && part.text) {
                            return (
                              <div key={`${message.id}-${i}`}>
                                {message.role === "user" && (
                                  <div className="mb-2 flex items-center justify-end gap-2">
                                    <Image src="/logo.png" alt="Exa" width={16} height={16} className="h-4 w-4" />
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Exa Browser</span>
                                  </div>
                                )}
                                <div
                                  className={`px-4 py-2.5 text-sm ${
                                    message.role === "user"
                                      ? "bg-[rgb(18,40,190)]/10 text-gray-900 dark:bg-[rgb(18,40,190)]/20 dark:text-white"
                                      : "text-gray-900 dark:text-white"
                                  }`}
                                >
                                  <p className="whitespace-pre-wrap break-words">
                                    {part.text}
                                  </p>
                                </div>
                                {message.role === "assistant" && (
                                  <div className="mt-2 flex gap-2">
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(part.text || "");
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
                            );
                          }

                          // Tool invocation
                          if (part.type === "tool-invocation") {
                            return (
                              <motion.div
                                key={`${message.id}-${i}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className="border border-gray-300 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                              >
                                <div className="mb-2 flex items-center gap-2">
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{
                                      duration: 1,
                                      repeat: part.result ? 0 : Infinity,
                                      ease: "linear",
                                    }}
                                  >
                                    <svg
                                      className="h-4 w-4 text-[rgb(18,40,190)] dark:text-[rgb(18,40,190)]"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                      />
                                    </svg>
                                  </motion.div>
                                  <span className="font-medium text-gray-700 dark:text-gray-300">
                                    {part.toolName === "searchWeb"
                                      ? "Searching the web"
                                      : "Using tool"}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Query: {part.args?.query}
                                </p>
                                {part.result && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="mt-2 space-y-1 border-t border-gray-200 pt-2 dark:border-gray-700"
                                  >
                                    {part.result.results?.map(
                                      (result: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className="text-xs text-gray-600 dark:text-gray-400"
                                        >
                                          <a
                                            href={result.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[rgb(18,40,190)] hover:underline"
                                          >
                                            {result.title}
                                          </a>
                                        </div>
                                      )
                                    )}
                                  </motion.div>
                                )}
                              </motion.div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[85%] border border-gray-300 bg-white p-3 text-sm dark:border-gray-700 dark:bg-black">
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
            <div className="border-t border-gray-200 p-4 dark:border-gray-800">
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Image src="/logo.png" alt="Exa" width={16} height={16} className="h-4 w-4" />
                <span>Exa Browser</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (input.trim()) {
                    sendMessage({ text: input });
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
                  placeholder="Ask anything"
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
