"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ChatPanel.module.css";

const SUGGESTION_CHIPS = [
    { label: "🎂 Birthday Gift", value: "I'm looking for a birthday gift" },
    { label: "💕 Anniversary", value: "I need something special for an anniversary" },
    { label: "🙏 Thank You", value: "I want to send a thank you gift" },
    { label: "🏢 Office Party", value: "I need treats for an office party or team event" },
    { label: "😔 Sympathy", value: "I'm looking for a sympathy or condolence gift" },
    { label: "💝 Just Because", value: "I want to surprise someone just because" },
    { label: "💰 Under $50", value: "Show me your best gifts under $50" },
    { label: "🍫 Chocolate Lover", value: "What are your best chocolate covered options?" },
];

export default function ChatPanel({ onProductsUpdate, onLoadingChange }) {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showChips, setShowChips] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const handleClear = () => {
        setMessages([]);
        setInputValue("");
        setShowChips(true);
        onProductsUpdate?.([]);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        onLoadingChange?.(isLoading);
    }, [isLoading, onLoadingChange]);

    const sendMessage = async (text) => {
        const userMessage = text || inputValue.trim();
        if (!userMessage || isLoading) return;

        setInputValue("");
        setShowChips(false);

        const newMessages = [...messages, { role: "user", content: userMessage }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            // Build conversation history for the API
            const conversationHistory = newMessages.map((m) => ({
                role: m.role,
                content: m.content,
            }));

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage,
                    conversationHistory: conversationHistory.slice(0, -1), // exclude current message
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const data = await response.json();

            // Add AI response to messages
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: data.message, products: data.products },
            ]);

            // Update products in parent
            if (data.products && data.products.length > 0) {
                onProductsUpdate?.(data.products);
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content:
                        "I'm sorry, I had trouble processing that. Could you try rephrasing your question? 🍓",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleChipClick = (chipValue) => {
        sendMessage(chipValue);
    };

    const formatMessage = (content) => {
        if (!content) return "";
        
        // Check if content contains a markdown table
        const tablePattern = /\|(.+)\|\n\|[-|\s]+\|\n((?:\|.+\|\n?)+)/g;
        let formatted = content;
        
        // Parse markdown tables
        formatted = formatted.replace(tablePattern, (match, headerRow, bodyRows) => {
            // Parse header cells
            const headers = headerRow.split('|').map(h => h.trim()).filter(h => h);
            
            // Parse body rows
            const rows = bodyRows.trim().split('\n').map(row => 
                row.split('|').map(cell => cell.trim()).filter(cell => cell)
            );
            
            // Build HTML table
            let tableHtml = '<table class="comparison-table">';
            tableHtml += '<thead><tr>';
            headers.forEach(header => {
                // Apply bold and product ID formatting to headers
                let h = header.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                h = h.replace(/\[ID:(\d+)\]/g, '<span class="product-ref" data-product-id="$1">🔗</span>');
                tableHtml += `<th>${h}</th>`;
            });
            tableHtml += '</tr></thead>';
            tableHtml += '<tbody>';
            rows.forEach(row => {
                tableHtml += '<tr>';
                row.forEach(cell => {
                    // Apply bold and product ID formatting to cells
                    let c = cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    c = c.replace(/\[ID:(\d+)\]/g, '<span class="product-ref" data-product-id="$1">🔗</span>');
                    tableHtml += `<td>${c}</td>`;
                });
                tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table>';
            
            return tableHtml;
        });
        
        // Bold text (for non-table content)
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        // Product IDs as data attributes for linking (for non-table content)
        formatted = formatted.replace(
            /\[ID:(\d+)\]/g,
            '<span class="product-ref" data-product-id="$1">🔗</span>'
        );
        // Line breaks (but not inside tables)
        formatted = formatted.replace(/\n/g, "<br>");
        return formatted;
    };

    return (
        <div className={styles.chatPanel}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerIcon}>🍓</div>
                <div className={styles.headerText}>
                    <h2>Edible Gift Concierge</h2>
                    <span className={styles.status}>
                        <span className={styles.statusDot}></span>
                        Online — Ready to help
                    </span>
                </div>
                {messages.length > 0 && (
                    <button
                        className={styles.clearButton}
                        onClick={handleClear}
                        title="Clear chat and start over"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        Clear
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div className={styles.messagesArea}>
                {/* Welcome message */}
                {messages.length === 0 && (
                    <div className={styles.welcome}>
                        <div className={styles.welcomeEmoji}>🎁</div>
                        <h3>Welcome to Edible!</h3>
                        <p>
                            I&apos;m your Gift Concierge — I&apos;ll help you find the perfect
                            arrangement, treat, or gift. Tell me about the occasion, who
                            it&apos;s for, or just browse!
                        </p>
                    </div>
                )}

                {/* Message bubbles */}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`${styles.messageBubble} ${msg.role === "user" ? styles.userBubble : styles.assistantBubble
                            }`}
                    >
                        {msg.role === "assistant" && (
                            <div className={styles.avatarSmall}>🍓</div>
                        )}
                        <div
                            className={styles.bubbleContent}
                            dangerouslySetInnerHTML={{
                                __html: formatMessage(msg.content),
                            }}
                        />
                    </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className={`${styles.messageBubble} ${styles.assistantBubble}`}>
                        <div className={styles.avatarSmall}>🍓</div>
                        <div className={styles.typingIndicator}>
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Suggestion Chips */}
            {showChips && messages.length === 0 && (
                <div className={styles.chipsContainer}>
                    {SUGGESTION_CHIPS.map((chip, i) => (
                        <button
                            key={i}
                            className={styles.chip}
                            onClick={() => handleChipClick(chip.value)}
                        >
                            {chip.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Input Area */}
            <div className={styles.inputArea}>
                <div className={styles.inputWrapper}>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Tell me what you're looking for..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        className={styles.input}
                        id="chat-input"
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={isLoading || !inputValue.trim()}
                        className={styles.sendButton}
                        id="send-button"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
                <p className={styles.disclaimer}>
                    AI-powered suggestions based on our catalog. Always verify details on
                    product pages.
                </p>
            </div>
        </div>
    );
}
