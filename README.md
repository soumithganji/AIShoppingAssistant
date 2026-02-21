# AI Shopping Assistant — Product Discovery

# Live Demo

[https://ediblegiftsconcierge.vercel.app](https://ediblegiftsconcierge.vercel.app/)

An intelligent, dual-pane conversational interface designed to act as an AI shopping assistant. It uses the Edible Arrangements catalog and APIs as an example to demonstrate discovering the perfect gift. Unlike traditional chatbots, this application combines an AI "Shopping Assistant" with a real-time, interactive product grid to reduce decision fatigue and improve conversion rates.

## Features

- **Dual-Pane Interface**:
  - **Left Panel**: AI Assistant that probes for occasion, recipient, budget, and dietary needs.
  - **Right Panel**: Live product grid that updates in real-time as the conversation progresses.
- **Smart Intent Extraction**: Uses LLMs to parse user messages into structured search queries (Occasion, Budget, Dietary Restrictions, etc.).
- **Smart Filtering & Ranking**: Automatically filters products by budget, delivery speed (Same Day), and dietary restrictions
- **Comparisons**: Select multiple products to get an AI-generated comparison.

## Tech Stack

- **Framework**: Next.js 16
- **Frontend**: React, CSS Modules
- **AI/LLM**: Meta Llama 3.1 8B Instruct hosted via **NVIDIA NIM**
- **Data Source**: Edible Arrangements Public Search API

## Prerequisites

- **Node.js**: v18 or higher recommended.
- **NVIDIA NIM API Key**: Required for the AI features.

## Installation

  **Install dependencies**:
    ```bash
    npm install
    ```

## Running the Application

1.  Start the development server:
    ```bash
    npm run dev
    ```

2.  Open your browser and navigate to:
    [http://localhost:3000](http://localhost:3000)

## Project Structure

-   `app/`: Next.js App Router pages and layouts.
-   `components/`: Reusable UI components (ProductCard, ChatInterface, etc.).
-   `lib/`: Backend logic and utilities.
    -   `aiPipeline.js`: Orchestrates the AI flow (Intent -> Search -> Filter -> Response).
    -   `edibleApi.js`: Handles communication with the Edible Arrangements API.
    -   `prompts.js`: System prompts and LLM instruction templates.
-   `public/`: Static assets.

## How It Works

1.  **User Input**: The user says "I need a birthday gift for my mom under $50".
2.  **Intent Extraction**: The system extracts structured data: `{ occasion: "Birthday", recipient: "Mom", budget_max: 50 }`.
3.  **Search & Filter**: The app searches the Edible API for "Birthday", filters results < $50, and ranks them.
4.  **Response**: The AI Assistant responds with a helpful message referencing the specific products found, while the grid updates to show those products visualy.
