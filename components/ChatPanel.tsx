"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@ai-sdk/react";

export default function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage } = useChat();

  const isLoading = messages.some(m => m.parts.some(p => p.type === "text" && !p.text));

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
      {/* Toggle Button - visible when panel is closed */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed right-4 top-4 z-40 border border-gray-300 bg-white p-3 text-black shadow-lg transition-colors hover:border-blue-600 dark:border-gray-700 dark:bg-black dark:text-white dark:hover:border-blue-400"
            aria-label="Open chat"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 flex h-screen w-full flex-col border-l border-gray-300 bg-white dark:border-gray-700 dark:bg-black sm:w-96"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-300 p-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-black dark:text-white">
                Chat
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-600 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
                aria-label="Close chat"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
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
                              <div
                                key={`${message.id}-${i}`}
                                className={`border p-3 text-sm ${
                                  message.role === "user"
                                    ? "border-blue-600 bg-blue-50 text-black dark:border-blue-400 dark:bg-blue-950 dark:text-white"
                                    : "border-gray-300 bg-white text-black dark:border-gray-700 dark:bg-black dark:text-white"
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words">
                                  {part.text}
                                </p>
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
                                      className="h-4 w-4 text-blue-600 dark:text-blue-400"
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
                                            className="text-blue-600 hover:underline dark:text-blue-400"
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
            <div className="border-t border-gray-300 p-4 dark:border-gray-700">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (input.trim()) {
                    sendMessage({ text: input });
                    setInput("");
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  disabled={isLoading}
                  className="flex-1 border border-gray-300 px-3 py-2 text-sm text-black outline-none transition-colors focus:border-blue-600 disabled:opacity-50 dark:border-gray-700 dark:bg-black dark:text-white dark:focus:border-blue-400"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
