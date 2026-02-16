/**
 * POST /api/chat
 * 
 * AI Chat endpoint — accepts user message + conversation history,
 * returns AI response + product recommendations via streaming SSE
 */

import { processMessage, compareProducts } from "@/lib/aiPipeline";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { message, conversationHistory, compareProducts: productsToCompare } = await request.json();

        // Handle comparison requests directly (bypass intent extraction)
        if (productsToCompare && Array.isArray(productsToCompare) && productsToCompare.length >= 2) {
            const result = await compareProducts(productsToCompare, message || "");
            return NextResponse.json({
                message: result.message,
                products: [],
                intent: { intent_type: "comparison" },
            });
        }

        if (!message || typeof message !== "string") {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        // Process through AI pipeline
        const result = await processMessage(message, conversationHistory || []);
        console.log("[Chat API] intent.needs_clarification:", result.intent?.needs_clarification, "| products:", result.products?.length, "| message length:", result.message?.length);

        return NextResponse.json({
            message: result.message,
            products: result.products,
            intent: result.intent,
        });
    } catch (error) {
        console.error("Chat API error:", error);
        return NextResponse.json(
            {
                error: "Something went wrong. Please try again.",
                details: error.message,
            },
            { status: 500 }
        );
    }
}
