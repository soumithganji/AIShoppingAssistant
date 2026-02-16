import "./globals.css";

export const metadata = {
  title: "Edible Gift Concierge — AI-Powered Product Discovery",
  description:
    "Find the perfect Edible Arrangements gift with help from our AI Gift Concierge. Tell us the occasion, recipient, and budget — we'll curate the best options for you.",
  keywords: "edible arrangements, gift finder, fruit bouquet, chocolate covered, AI shopping assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0a14" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍓</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
