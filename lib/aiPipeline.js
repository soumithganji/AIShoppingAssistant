/**
 * AI Pipeline — Orchestrates intent extraction, search, filtering, and response generation
 * 
 * Uses meta/llama-3.1-8b-instruct via NVIDIA NIM
 * Pipeline: User Message → Intent Extraction → Multi-Search → Filter/Rank → Response Generation
 */

import {
    SYSTEM_PROMPT,
    buildIntentExtractionPrompt,
    buildClarificationPrompt,
    buildResponsePrompt,
    buildComparisonPrompt,
} from "./prompts.js";
import {
    multiSearch,
    filterProducts,
    cleanProductForLLM,
    formatProductForDisplay,
} from "./edibleApi.js";

const NIM_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL_ID = "meta/llama-3.1-8b-instruct";

/**
 * Call the LLM via NVIDIA NIM
 */
async function callLLM(messages, { temperature = 0.7, maxTokens = 1024 } = {}) {
    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    if (!apiKey) {
        throw new Error("NVIDIA_NIM_API_KEY is not set in environment variables");
    }

    const response = await fetch(NIM_API_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: MODEL_ID,
            messages,
            temperature,
            max_tokens: maxTokens,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("NVIDIA NIM API error:", response.status, errorText);
        throw new Error(`NVIDIA NIM API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
}

/**
 * Stream LLM response via NVIDIA NIM
 */
async function callLLMStream(messages, { temperature = 0.7, maxTokens = 1024 } = {}) {
    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    if (!apiKey) {
        throw new Error("NVIDIA_NIM_API_KEY is not set in environment variables");
    }

    const response = await fetch(NIM_API_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: MODEL_ID,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: true,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("NVIDIA NIM API error:", response.status, errorText);
        throw new Error(`NVIDIA NIM API error: ${response.status}`);
    }

    return response.body;
}

/**
 * Step 1: Extract user intent from message
 */
async function extractIntent(userMessage, conversationHistory) {
    const contextSummary = conversationHistory
        .slice(-6) // Last 3 exchanges
        .map((m) => `${m.role === "user" ? "Customer" : "Concierge"}: ${m.content}`)
        .join("\n");

    const prompt = buildIntentExtractionPrompt(userMessage, contextSummary);

    const result = await callLLM(
        [
            {
                role: "system",
                content: `You are an intent extraction system. Respond with ONLY valid JSON. No markdown, no backticks, no explanation.

CRITICAL RULE for needs_clarification:
- If the user message is vague and lacks ALL of: occasion, recipient, product type, and budget → set needs_clarification to true.
- Examples of vague messages where needs_clarification MUST be true: "gift", "help", "hi", "I need something", "what do you have", "looking for a present"
- Only set needs_clarification to false when the user provides at least ONE specific detail.`,
            },
            { role: "user", content: prompt },
        ],
        { temperature: 0, maxTokens: 512 }
    );

    try {
        // Try to parse JSON, handling potential markdown wrapping
        let jsonStr = result.trim();
        if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        }
        const parsed = JSON.parse(jsonStr);
        console.log("[Intent Extraction] Input:", userMessage);
        console.log("[Intent Extraction] Result:", JSON.stringify(parsed, null, 2));
        return parsed;
    } catch (e) {
        console.error("Failed to parse intent JSON:", result);
        // Fallback intent
        return {
            search_keywords: [userMessage.split(" ").slice(0, 3).join(" ")],
            occasion: null,
            budget_min: null,
            budget_max: null,
            recipient: null,
            dietary_restrictions: [],
            urgency: null,
            product_type_preference: "any",
            intent_type: "browse",
            needs_clarification: false,
            clarification_topic: null,
            sentiment: "neutral",
        };
    }
}

/**
 * Step 2: Search products based on extracted intent
 */
async function searchFromIntent(intent) {
    let keywords = intent.search_keywords || [];

    // Add occasion as a keyword if not already present
    if (intent.occasion && intent.occasion !== "null" && !keywords.includes(intent.occasion)) {
        keywords.push(intent.occasion.replace("_", " "));
    }

    // Fallback keywords
    if (keywords.length === 0) {
        keywords = ["popular gifts", "best sellers"];
    }

    // Cap at 3 keywords to avoid too many API calls
    keywords = keywords.slice(0, 3);

    const products = await multiSearch(keywords);
    return products;
}

/**
 * Step 3: Filter and rank products based on intent
 */
function filterAndRank(products, intent) {
    // Apply filters
    const filters = {};

    if (intent.budget_min) filters.minBudget = intent.budget_min;
    if (intent.budget_max) filters.maxBudget = intent.budget_max;
    
    console.log("[AI Pipeline] Intent budget - min:", intent.budget_min, "max:", intent.budget_max);
    console.log("[AI Pipeline] Filters being applied:", JSON.stringify(filters));
    
    if (intent.occasion && intent.occasion !== "null") {
        filters.occasion = intent.occasion.replace("_", " ");
    }
    if (intent.dietary_restrictions && intent.dietary_restrictions.length > 0) {
        filters.excludeIngredients = intent.dietary_restrictions;
    }
    if (intent.urgency === "one_hour" || intent.urgency === "same_day") {
        filters.urgentDelivery = true;
    }

    let filtered = filterProducts(products, filters);

    // Sort by relevance score (from API), then by price
    filtered.sort((a, b) => {
        // Prioritize top sellers
        const aTopSeller = (a.productImageTag || "").includes("Top Seller") ? -10 : 0;
        const bTopSeller = (b.productImageTag || "").includes("Top Seller") ? -10 : 0;
        if (aTopSeller !== bTopSeller) return aTopSeller - bTopSeller;

        // Then by search score
        return (b["@search.score"] || 0) - (a["@search.score"] || 0);
    });

    return filtered;
}

/**
 * Reorder products to match the order they're mentioned in the AI response
 * @param {string} aiResponse - The AI's response text
 * @param {Array} displayProducts - Products already formatted for display (top 8)
 * @param {Array} allAvailableProducts - All products the AI had access to (top 10+)
 */
function reorderProductsByMention(aiResponse, displayProducts, allAvailableProducts) {
    // Extract product IDs in the order they appear in the response
    const idPattern = /\[ID:(\d+)\]/g;
    const mentionedIds = [];
    let match;
    
    while ((match = idPattern.exec(aiResponse)) !== null) {
        const id = match[1]; // Keep as string to avoid type mismatch
        if (!mentionedIds.includes(id)) {
            mentionedIds.push(id);
        }
    }

    console.log("[Product Reorder] AI Response snippet:", aiResponse.substring(0, 500));
    console.log("[Product Reorder] Extracted IDs in order:", mentionedIds);
    console.log("[Product Reorder] Display product IDs:", displayProducts.map(p => p.id));
    console.log("[Product Reorder] All available product IDs:", allAvailableProducts.map(p => p.id));

    // If no products were mentioned, return original order
    if (mentionedIds.length === 0) {
        console.log("[Product Reorder] No IDs found, returning original order");
        return displayProducts;
    }

    // Create maps for quick lookup - normalize IDs to strings for consistent comparison
    const displayMap = new Map(displayProducts.map(p => [String(p.id), p]));
    const allProductsMap = new Map(allAvailableProducts.map(p => [String(p.id), p]));

    // Reorder: mentioned products first (in order of mention), then the rest
    const reordered = [];
    
    // Add mentioned products in order (checking all available products if not in display)
    mentionedIds.forEach(id => {
        const idStr = String(id);
        let product = displayMap.get(idStr);
        if (!product) {
            // Product was mentioned but not in display - check if it's in allAvailableProducts
            product = allProductsMap.get(idStr);
            if (product) {
                console.log("[Product Reorder] Adding mentioned product not in display:", id, product.name);
            }
        }
        if (product) {
            reordered.push(product);
            displayMap.delete(idStr);
        } else {
            console.warn("[Product Reorder] Product ID mentioned but not found:", id);
        }
    });

    // Add remaining display products (up to 8 total)
    const remaining = Array.from(displayMap.values());
    const slotsLeft = 8 - reordered.length;
    if (slotsLeft > 0) {
        reordered.push(...remaining.slice(0, slotsLeft));
    }

    console.log("[Product Reorder] Final reordered product IDs:", reordered.map(p => p.id));

    return reordered;
}

/**
 * Main pipeline: Process a user message and return response + products
 */
export async function processMessage(userMessage, conversationHistory = []) {
    // Step 1: Extract intent
    const intent = await extractIntent(userMessage, conversationHistory);

    // Step 1.5: If the query is too vague, ask for clarification instead of searching
    if (intent.needs_clarification) {
        const historyStr = conversationHistory
            .slice(-6)
            .map((m) => `${m.role === "user" ? "Customer" : "Concierge"}: ${m.content}`)
            .join("\n");

        const clarificationPrompt = buildClarificationPrompt(
            userMessage,
            intent,
            historyStr
        );

        const clarificationResponse = await callLLM(
            [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: clarificationPrompt },
            ],
            { temperature: 0.7, maxTokens: 256 }
        );

        return {
            message: clarificationResponse,
            products: [],
            intent,
        };
    }

    // Step 2: Search products
    const allProducts = await searchFromIntent(intent);

    // Step 3: Filter and rank
    const rankedProducts = filterAndRank(allProducts, intent);

    // Prepare top products for LLM (limit to 10 to save tokens)
    const topProducts = rankedProducts.slice(0, 10);
    const productsForLLM = topProducts.map(cleanProductForLLM);

    // Prepare display products (limit to 8 for the grid)
    const displayProducts = rankedProducts.slice(0, 8).map(formatProductForDisplay);
    
    // Keep all available products formatted for potential display
    const allAvailableProducts = topProducts.map(formatProductForDisplay);

    // Step 4: Build conversation history for response generation
    const historyStr = conversationHistory
        .slice(-6)
        .map((m) => `${m.role === "user" ? "Customer" : "Concierge"}: ${m.content}`)
        .join("\n");

    const responsePrompt = buildResponsePrompt(
        userMessage,
        productsForLLM,
        intent,
        historyStr
    );

    // Generate response
    const aiResponse = await callLLM(
        [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: responsePrompt },
        ],
        { temperature: 0.7, maxTokens: 1024 }
    );

    // Reorder products to match the order they're mentioned in the AI response
    // Pass both display products and all available products so mentioned items can be included
    const reorderedProducts = reorderProductsByMention(aiResponse, displayProducts, allAvailableProducts);

    return {
        message: aiResponse,
        products: reorderedProducts,
        intent,
    };
}

/**
 * Stream version of the main pipeline
 */
export async function processMessageStream(userMessage, conversationHistory = []) {
    // Step 1: Extract intent
    const intent = await extractIntent(userMessage, conversationHistory);

    // Step 1.5: If the query is too vague, ask for clarification instead of searching
    if (intent.needs_clarification) {
        const historyStr = conversationHistory
            .slice(-6)
            .map((m) => `${m.role === "user" ? "Customer" : "Concierge"}: ${m.content}`)
            .join("\n");

        const clarificationPrompt = buildClarificationPrompt(
            userMessage,
            intent,
            historyStr
        );

        const stream = await callLLMStream(
            [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: clarificationPrompt },
            ],
            { temperature: 0.7, maxTokens: 256 }
        );

        return {
            stream,
            products: [],
            intent,
        };
    }

    // Step 2: Search products
    const allProducts = await searchFromIntent(intent);

    // Step 3: Filter and rank
    const rankedProducts = filterAndRank(allProducts, intent);

    // Prepare products
    const topProducts = rankedProducts.slice(0, 10);
    const productsForLLM = topProducts.map(cleanProductForLLM);
    const displayProducts = rankedProducts.slice(0, 8).map(formatProductForDisplay);
    const allAvailableProducts = topProducts.map(formatProductForDisplay);

    // Step 4: Build response prompt
    const historyStr = conversationHistory
        .slice(-6)
        .map((m) => `${m.role === "user" ? "Customer" : "Concierge"}: ${m.content}`)
        .join("\n");

    const responsePrompt = buildResponsePrompt(
        userMessage,
        productsForLLM,
        intent,
        historyStr
    );

    // Get streaming response
    const stream = await callLLMStream(
        [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: responsePrompt },
        ],
        { temperature: 0.7, maxTokens: 1024 }
    );

    return {
        stream,
        products: displayProducts,
        allAvailableProducts, // Include for potential reordering on client side
        intent,
    };
}

/**
 * Compare specific products
 */
export async function compareProducts(productIds, allProducts, userContext = "") {
    const productsToCompare = allProducts
        .filter((p) => productIds.includes(p.id))
        .map(cleanProductForLLM);

    if (productsToCompare.length < 2) {
        return { message: "Please select at least 2 products to compare." };
    }

    const prompt = buildComparisonPrompt(productsToCompare, userContext);

    const response = await callLLM(
        [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
        ],
        { temperature: 0.5, maxTokens: 1024 }
    );

    return { message: response };
}
