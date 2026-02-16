# Edible Gift Concierge — AI-Powered Product Discovery

## Approach

### The Problem
Edible Arrangements customers often know the *occasion* (birthday, thank you, sympathy) but not the *product*. With a large catalog, the gap between "I need a gift" and "I'll buy this one" creates decision fatigue and session abandonment.

### The Solution: Gift Concierge (Not a Chatbot)
Rather than a generic chatbot, I built a **dual-pane conversational product explorer**:
- **Left panel**: An AI "Gift Concierge" that probes for occasion, recipient, budget, and dietary needs
- **Right panel**: A live product grid that updates in real-time as the conversation narrows preferences

This design is intentional — it keeps the user visually engaged with real products while the AI guides the conversation. Users can browse and click products *during* the conversation, reducing the perception that they're "waiting for the AI."

### AI System Design

**Pipeline Architecture** (not an agent):
1. **Intent Extraction** (temp=0) — Parses user message into structured JSON: occasion, budget, recipient, dietary restrictions, urgency, sentiment
2. **Smart Search** — Converts intent into 1-3 Edible API calls with optimized keywords
3. **Filter & Rank** — Server-side filtering by budget, occasion, allergens, delivery speed; ranked by API relevance score + "Top Seller" priority
4. **Grounded Response** (temp=0.7) — LLM generates a conversational recommendation referencing *only* actual products from the search results

**Why not agents?** A full agent framework (LangChain, CrewAI) would add latency (5-10s loops), unpredictability, and cost — all unacceptable for an e-commerce buying experience where every second of delay increases bounce risk. The tool-calling pattern gives us intelligent routing without the overhead.

**Model**: `stepfun/step-3.5-flash:free` via OpenRouter — fast, free for POC, and capable of structured JSON extraction.

### Hallucination Prevention
- Product data is injected directly into the prompt — the LLM reads from the catalog, not its training data
- System prompt explicitly forbids fabricating product names, prices, or features
- Prices in the UI come directly from API fields (`minPrice`/`maxPrice`), not LLM text
- Product URLs are constructed server-side from the API's `url` field
- Allergy disclaimer is surfaced verbatim from the API when dietary concerns arise

### Handling Uncertainty
- **Max 2 clarifying questions** before showing products — prevents interrogation fatigue
- **Ambiguous input** → show *diverse* results across price points + ask one clarifying question
- **Empty results** → suggest broadening the search with a helpful prompt
- **User seems decided** → provide direct product link and stop suggesting alternatives

### Prompt Modularity
Three separate prompts in `lib/prompts.js`, each testable independently:
1. `SYSTEM_PROMPT` — Static persona, tone, and guardrails
2. `buildIntentExtractionPrompt()` — Structured JSON output  
3. `buildResponsePrompt()` — Conversational response grounded in product data

---

## Results

- **Full pipeline working**: User message → intent extraction → catalog search → filtered recommendations → grounded AI response
- **8 product cards** displayed per query with images, prices, occasion tags, delivery badges, and direct links
- **Product comparison**: Select 2-3 products and get an AI-generated comparison
- **Suggestion chips**: One-click access to common intents (Birthday, Anniversary, Under $50, etc.)
- **Response quality**: AI references actual product names, prices, and descriptions — no hallucinated details
- **Latency**: ~3-5 seconds end-to-end (acceptable for POC; dominated by Edible API + LLM call)

### Key Design Decisions
| Decision | Choice | Rationale |
|---|---|---|
| Primary user | Gift-giver, not self-buyer | Most Edible purchases are gifts; UX is occasion/recipient-first |
| When to stop guiding | After 2 clarifying Qs, always show products | Users get impatient; visual results reduce perceived wait |
| Format | Split-pane, not full chatbot | Users need to see products, not just read about them |
| Product data to LLM | Top 10 (filtered from 50+) | Balances token cost with recommendation quality |

---

## Next Steps (Before Shipping to Real Customers)

1. **Streaming responses** — SSE streaming is architecturally ready but not yet wired to the frontend; would reduce perceived latency from ~4s to <1s
2. **Conversation persistence** — Store sessions to support returning users and analytics on common intents
3. **A/B testing framework** — Measure conversion lift vs. standard browse experience
4. **Guardrails hardening** — Add output validators to catch any LLM policy violations before displaying
5. **Multi-turn memory** — Track products the user has already seen/rejected to avoid re-recommending
6. **Price/availability freshness** — Real-time price validation before purchase redirect
7. **Analytics dashboard** — Track top searched occasions, conversion funnels, drop-off points
8. **Model upgrade path** — Test GPT-4o-mini or Claude Haiku for better response quality at moderate cost increase
9. **Accessibility** — Full keyboard navigation, screen reader support, ARIA labels
10. **Mobile optimization** — Stacked layout with swipeable panels for mobile users

### Cost Projection (Production)
At ~15K tokens/conversation with GPT-4o-mini: **~$0.01/conversation**. At 10K daily conversations: **~$100/month** — negligible relative to potential conversion lift.
