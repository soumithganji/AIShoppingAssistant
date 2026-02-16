/**
 * Edible Arrangements API Wrapper
 * Handles product search via the Edible catalog API
 * Includes in-memory caching to avoid redundant calls within a session
 */

const EDIBLE_API_URL = "https://www.ediblearrangements.com/api/search/";

// Simple in-memory cache for API results (keyword -> results)
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Search the Edible Arrangements catalog by keyword
 * @param {string} keyword - Search term
 * @returns {Promise<Array>} Array of product objects
 */
export async function searchProducts(keyword) {
  if (!keyword || keyword.trim().length === 0) {
    return [];
  }

  const cacheKey = keyword.toLowerCase().trim();

  // Check cache
  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    searchCache.delete(cacheKey);
  }

  try {
    const response = await fetch(EDIBLE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: cacheKey }),
    });

    if (!response.ok) {
      console.error(`Edible API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Cache the result
    searchCache.set(cacheKey, { data, timestamp: Date.now() });

    return data;
  } catch (error) {
    console.error("Edible API fetch error:", error);
    return [];
  }
}

/**
 * Search with multiple keywords and merge/deduplicate results
 * @param {string[]} keywords - Array of search terms
 * @returns {Promise<Array>} Merged, deduplicated product array
 */
export async function multiSearch(keywords) {
  if (!keywords || keywords.length === 0) return [];

  const results = await Promise.all(keywords.map((kw) => searchProducts(kw)));

  // Merge and deduplicate by product id
  const seen = new Set();
  const merged = [];

  for (const resultSet of results) {
    for (const product of resultSet) {
      if (!seen.has(product.id)) {
        seen.add(product.id);
        merged.push(product);
      }
    }
  }

  return merged;
}

/**
 * Filter products by various criteria
 * @param {Array} products - Product array
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered products
 */
export function filterProducts(products, filters = {}) {
  let filtered = [...products];

  console.log("[Filter] Starting with", products.length, "products, filters:", JSON.stringify(filters));

  // Budget filter
  if (filters.minBudget != null) {
    const beforeCount = filtered.length;
    filtered = filtered.filter(
      (p) => p.minPrice != null && p.minPrice >= filters.minBudget
    );
    console.log("[Filter] minBudget filter:", beforeCount, "→", filtered.length);
  }
  if (filters.maxBudget != null) {
    const beforeCount = filtered.length;
    filtered = filtered.filter(
      (p) => p.minPrice != null && p.minPrice <= filters.maxBudget
    );
    console.log("[Filter] maxBudget filter:", beforeCount, "→", filtered.length, "| Example prices:", filtered.slice(0, 3).map(p => p.minPrice));
  }

  // Save budget-filtered results before applying occasion filter
  const budgetFiltered = [...filtered];

  // Occasion filter (check if product's occasion field contains the target)
  if (filters.occasion) {
    const occ = filters.occasion.toLowerCase();
    filtered = filtered.filter(
      (p) => p.occasion && p.occasion.toLowerCase().includes(occ)
    );
    // If filtering removed everything, fall back to budget-filtered results
    if (filtered.length === 0) filtered = budgetFiltered;
  }

  // Dietary / ingredient exclusion
  if (filters.excludeIngredients && filters.excludeIngredients.length > 0) {
    filtered = filtered.filter((p) => {
      const ingredients = (p.ingrediantNames || "").toLowerCase();
      return !filters.excludeIngredients.some((exc) =>
        ingredients.includes(exc.toLowerCase())
      );
    });
  }

  // One-hour delivery filter
  if (filters.urgentDelivery) {
    const beforeCount = filtered.length;
    filtered = filtered.filter((p) => p.isOneHourDelivery);
    console.log("[Filter] urgentDelivery filter:", beforeCount, "→", filtered.length);
  }

  return filtered;
}

/**
 * Clean product data for LLM consumption (reduce token count)
 * @param {Object} product - Raw product object
 * @returns {Object} Cleaned product with essential fields only
 */
export function cleanProductForLLM(product) {
  // Strip HTML from description
  const cleanDesc = (product.description || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n/g, " ")
    .trim();

  return {
    id: product.id,
    name: product.name,
    description: cleanDesc,
    minPrice: product.minPrice,
    maxPrice: product.maxPrice,
    occasion: product.occasion || "",
    category: product.category || "",
    ingredients: product.ingrediantNames || "",
    sizeOptions: product.sizeCount || 1,
    isOneHourDelivery: product.isOneHourDelivery || false,
    productTag: product.productImageTag || "",
    promo: product.nonPromo || product.promo || "",
    onSale: product.isMinSizeOnSale || false,
    originalPrice: product.minsizeProductPrice,
  };
}

/**
 * Prepare product data for frontend display
 * @param {Object} product - Raw product object
 * @returns {Object} Display-ready product
 */
export function formatProductForDisplay(product) {
  return {
    id: product.id,
    name: product.name,
    description: (product.description || "")
      .replace(/<[^>]*>/g, "")
      .replace(/\r\n/g, " ")
      .trim(),
    image: product.image,
    thumbnail: product.thumbnail,
    minPrice: product.minPrice,
    maxPrice: product.maxPrice,
    url: `https://www.ediblearrangements.com/${product.url}`,
    occasion: product.occasion || "",
    category: product.category || "",
    ingredients: product.ingrediantNames || "",
    sizeCount: product.sizeCount || 1,
    isOneHourDelivery: product.isOneHourDelivery || false,
    productTag: product.productImageTag || "",
    promo: product.nonPromo || product.promo || "",
    onSale: product.isMinSizeOnSale || false,
    originalPrice: product.minsizeProductPrice,
    allergyInfo: product.allergyinformation || "",
    catalogCode: product.catalogCode || "",
  };
}
