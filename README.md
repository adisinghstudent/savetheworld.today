# Exa Browser

An AI-powered search interface that combines intelligent web search with an interactive assistant. Built with Next.js, Exa API, and Groq/Vercel AI SDK.

## What is this?

Exa Browser merges a Google-like search interface with AI capabilities to provide:

- **Intelligent Search**: Natural language search powered by Exa's AI-first search engine
- **Categorized Results**: Automatically organized results across Videos, Social Media, and Articles
- **Integrated Browser**: View webpages directly within the interface with proxy support for blocked sites
- **AI Assistant**: Chat panel with access to Exa tools for webpage analysis and content retrieval
- **Real-time Content Crawling**: Agent can crawl and analyze any webpage using Exa's content extraction

## Features

### Search Interface
- Natural language search with typewriter effect suggestions
- Multi-category result organization (YouTube, Twitter, News, LinkedIn, Medium, Reddit, GitHub)
- Animated loading states and smooth transitions
- Favicon display for source identification
- Responsive grid layout with three columns

### Browser View
- Embedded iframe viewing with proxy toggle
- Automatic proxy detection for sites that block iframes (BBC, LinkedIn, etc.)
- Browser navigation controls
- Direct link to open in external browser

### AI Chat Panel
- Context-aware assistant using Groq's Llama 3.3 70B model
- Automatic webpage content extraction via Exa tools
- Streaming responses with real-time updates
- Copy and regenerate message functionality
- Visual indicators for current page context

## Prerequisites

You'll need two free API keys:

1. **Exa API Key**: Get it at [https://dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys)
2. **Groq API Key**: Get it at [https://console.groq.com/keys](https://console.groq.com/keys)

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd oppurtunities-exa
```

2. Install dependencies:
```bash
bun i
```

3. Configure environment variables:
```bash
cp .env.example .env
```

4. Add your API keys to `.env`:
```env
# Exa.ai
EXA_API_KEY=your_exa_api_key_here

# Groq
GROQ_API_KEY=your_groq_api_key_here
```

5. Run the development server:
```bash
bun run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Search
1. Enter a natural language query in the search bar
2. Results are automatically categorized into Videos, Social Media, and Articles
3. Click any result to view it in the integrated browser

### Browser
- Use the back arrow to navigate within the browser
- Use the double arrow to return to search results
- Toggle proxy mode for sites that block iframe embedding
- Open any page in your default browser using the external link button

### AI Assistant
1. Click "Ask Page" to open the chat panel
2. Ask questions about the currently open webpage
3. The assistant will automatically crawl and analyze the page content using Exa
4. Get summaries, extract specific information, or have a conversation about the content

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **AI/ML**:
  - Vercel AI SDK for streaming responses
  - Groq (Llama 3.3 70B) for language model inference
  - Exa API for search and content extraction
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Visualizations**: D3.js (globe component)
- **Language**: TypeScript
- **Runtime**: Bun

## API Routes

- `/api/exa` - Handles search requests with multiple result type configurations
- `/api/chat` - Manages AI chat with Exa tool integration
- `/api/proxy` - Proxies webpage content for sites that block iframes

## Optional Configuration

The `.env.example` file includes optional API keys for other AI providers:

```env
# Optional - other OpenAI-compatible providers
CEREBRAS_API_KEY=
OPENAI_API_KEY=
```

These are not required for basic functionality but can be configured if needed.

## Development

Built with:
- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run ESLint

## Contributing

This is an open source project that needs your help and support. Contributions, improvements, and feedback are welcome and appreciated. Whether it's bug fixes, new features, documentation improvements, or suggestions, all contributions help make this project better.

Feel free to:
- Open issues for bugs or feature requests
- Submit pull requests with improvements
- Share your ideas and suggestions
- Help improve documentation

# exa-browser
