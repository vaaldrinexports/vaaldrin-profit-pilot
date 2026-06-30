// South India Market Intelligence — benchmark database for exporter procurement.
// Prices are indicative ₹/KG benchmarks compiled from Spices Board, Coffee Board,
// Tea Board and regional trading data. NOT live commodity ticks.

export type MarketTrend = "Rising" | "Falling" | "Stable";
export type MarketStatus = "Bullish" | "Bearish" | "Neutral";
export type Confidence = "High" | "Medium" | "Low";
export type SourceTier = "official" | "regional" | "internal";
export type Category = "live" | "benchmark";

export interface MarketQuote {
  market: string;       // e.g. "Idukki"
  state: string;        // e.g. "Kerala"
  ratePerKg: number;    // ₹/kg
}

export interface ProductBenchmark {
  key: string;                       // canonical key
  name: string;                      // display name
  aliases: string[];                 // lowercase substrings that map to this product
  category: Category;
  group: string;                     // Spices / Tea & Coffee / Textiles / Herbal / Dried
  primaryMarket: string;
  quotes: MarketQuote[];
  trend7d: number;                   // %
  trend30d: number;                  // %
  trend90d: number;                  // %
  source: string;
  sourceTier: SourceTier;
  confidence: Confidence;
  lastUpdated: string;               // ISO date
}

const today = new Date().toISOString().slice(0, 10);

export const BENCHMARKS: ProductBenchmark[] = [
  // ---------------- SPICES ----------------
  {
    key: "cardamom", name: "Cardamom",
    aliases: ["cardamom", "elaichi", "cardamon"],
    category: "live", group: "Spices",
    primaryMarket: "Idukki",
    quotes: [
      { market: "Idukki",  state: "Kerala",    ratePerKg: 2850 },
      { market: "Kumily",  state: "Kerala",    ratePerKg: 2820 },
      { market: "Wayanad", state: "Kerala",    ratePerKg: 2790 },
      { market: "Kodagu",  state: "Karnataka", ratePerKg: 2810 },
    ],
    trend7d: 1.2, trend30d: 4.8, trend90d: 8.5,
    source: "Spices Board of India", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "black-pepper", name: "Black Pepper",
    aliases: ["black pepper", "pepper", "kali mirch", "malabar pepper"],
    category: "live", group: "Spices",
    primaryMarket: "Kochi",
    quotes: [
      { market: "Kochi",          state: "Kerala",    ratePerKg: 685 },
      { market: "Wayanad",        state: "Kerala",    ratePerKg: 672 },
      { market: "Sirsi",          state: "Karnataka", ratePerKg: 668 },
      { market: "Chikkamagaluru", state: "Karnataka", ratePerKg: 675 },
    ],
    trend7d: 0.4, trend30d: 2.1, trend90d: 5.6,
    source: "Spices Board / Kochi Terminal", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "white-pepper", name: "White Pepper",
    aliases: ["white pepper"],
    category: "live", group: "Spices",
    primaryMarket: "Kochi",
    quotes: [
      { market: "Kochi",   state: "Kerala",    ratePerKg: 1080 },
      { market: "Wayanad", state: "Kerala",    ratePerKg: 1055 },
      { market: "Sirsi",   state: "Karnataka", ratePerKg: 1045 },
    ],
    trend7d: 0.6, trend30d: 1.8, trend90d: 4.2,
    source: "Spices Board", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "turmeric", name: "Turmeric",
    aliases: ["turmeric", "haldi", "curcumin"],
    category: "live", group: "Spices",
    primaryMarket: "Erode",
    quotes: [
      { market: "Erode",   state: "Tamil Nadu", ratePerKg: 158 },
      { market: "Salem",   state: "Tamil Nadu", ratePerKg: 152 },
      { market: "Sangli",  state: "Maharashtra", ratePerKg: 162 },
      { market: "Nizamabad", state: "Telangana", ratePerKg: 155 },
    ],
    trend7d: -0.8, trend30d: 3.2, trend90d: 11.4,
    source: "Spices Board / Agmarknet", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "chilli", name: "Chilli",
    aliases: ["chilli", "chillies", "chili", "mirch", "red chilli"],
    category: "live", group: "Spices",
    primaryMarket: "Guntur",
    quotes: [
      { market: "Guntur",  state: "Andhra Pradesh", ratePerKg: 215 },
      { market: "Kurnool", state: "Andhra Pradesh", ratePerKg: 208 },
      { market: "Hyderabad", state: "Telangana",   ratePerKg: 212 },
      { market: "Byadgi",  state: "Karnataka",     ratePerKg: 248 },
    ],
    trend7d: 2.1, trend30d: 6.5, trend90d: -3.2,
    source: "Spices Board / Guntur Market", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "coriander", name: "Coriander",
    aliases: ["coriander", "dhania"],
    category: "live", group: "Spices",
    primaryMarket: "Guntur",
    quotes: [
      { market: "Guntur",     state: "Andhra Pradesh", ratePerKg: 92 },
      { market: "Hyderabad",  state: "Telangana",      ratePerKg: 89 },
      { market: "Kota",       state: "Rajasthan",      ratePerKg: 95 },
    ],
    trend7d: 0.2, trend30d: -1.4, trend90d: 2.8,
    source: "Spices Board / Agmarknet", sourceTier: "regional",
    confidence: "Medium", lastUpdated: today,
  },
  {
    key: "cumin", name: "Cumin (Jeera)",
    aliases: ["cumin", "jeera"],
    category: "live", group: "Spices",
    primaryMarket: "Unjha",
    quotes: [
      { market: "Unjha",     state: "Gujarat",   ratePerKg: 385 },
      { market: "Hyderabad", state: "Telangana", ratePerKg: 392 },
      { market: "Salem",     state: "Tamil Nadu", ratePerKg: 398 },
    ],
    trend7d: -0.5, trend30d: -4.2, trend90d: -12.5,
    source: "Spices Board", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "cloves", name: "Cloves",
    aliases: ["cloves", "clove", "laung"],
    category: "live", group: "Spices",
    primaryMarket: "Kumily",
    quotes: [
      { market: "Kumily", state: "Kerala", ratePerKg: 925 },
      { market: "Idukki", state: "Kerala", ratePerKg: 940 },
      { market: "Kochi",  state: "Kerala", ratePerKg: 950 },
    ],
    trend7d: 0.8, trend30d: 2.4, trend90d: 6.1,
    source: "Spices Board", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "nutmeg", name: "Nutmeg",
    aliases: ["nutmeg", "jaiphal"],
    category: "live", group: "Spices",
    primaryMarket: "Kochi",
    quotes: [
      { market: "Kochi",   state: "Kerala", ratePerKg: 645 },
      { market: "Idukki",  state: "Kerala", ratePerKg: 632 },
      { market: "Wayanad", state: "Kerala", ratePerKg: 638 },
    ],
    trend7d: 0.3, trend30d: 1.6, trend90d: 3.4,
    source: "Spices Board", sourceTier: "regional",
    confidence: "Medium", lastUpdated: today,
  },
  {
    key: "cinnamon", name: "Cinnamon",
    aliases: ["cinnamon", "dalchini"],
    category: "live", group: "Spices",
    primaryMarket: "Kochi",
    quotes: [
      { market: "Kochi",   state: "Kerala", ratePerKg: 295 },
      { market: "Kumily",  state: "Kerala", ratePerKg: 288 },
    ],
    trend7d: 0.1, trend30d: 0.9, trend90d: 2.2,
    source: "Spices Board", sourceTier: "regional",
    confidence: "Medium", lastUpdated: today,
  },

  // ---------------- TEA & COFFEE ----------------
  {
    key: "arabica", name: "Arabica Coffee (Parchment)",
    aliases: ["arabica", "arabica coffee"],
    category: "live", group: "Tea & Coffee",
    primaryMarket: "Chikkamagaluru",
    quotes: [
      { market: "Chikkamagaluru", state: "Karnataka", ratePerKg: 485 },
      { market: "Kodagu",         state: "Karnataka", ratePerKg: 478 },
      { market: "Hassan",         state: "Karnataka", ratePerKg: 472 },
      { market: "Wayanad",        state: "Kerala",    ratePerKg: 468 },
    ],
    trend7d: 1.5, trend30d: 7.2, trend90d: 18.4,
    source: "Coffee Board of India", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "robusta", name: "Robusta Coffee (Cherry)",
    aliases: ["robusta", "robusta coffee"],
    category: "live", group: "Tea & Coffee",
    primaryMarket: "Kodagu",
    quotes: [
      { market: "Kodagu",         state: "Karnataka", ratePerKg: 295 },
      { market: "Chikkamagaluru", state: "Karnataka", ratePerKg: 288 },
      { market: "Wayanad",        state: "Kerala",    ratePerKg: 282 },
    ],
    trend7d: 0.9, trend30d: 5.6, trend90d: 22.1,
    source: "Coffee Board of India", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "assam-tea", name: "Assam Tea (CTC)",
    aliases: ["assam tea", "ctc tea", "assam"],
    category: "live", group: "Tea & Coffee",
    primaryMarket: "Guwahati Auction",
    quotes: [
      { market: "Guwahati Auction", state: "Assam",      ratePerKg: 215 },
      { market: "Kolkata Auction",  state: "West Bengal", ratePerKg: 218 },
      { market: "Kochi Auction",    state: "Kerala",     ratePerKg: 205 },
    ],
    trend7d: 0.4, trend30d: -1.2, trend90d: 3.8,
    source: "Tea Board of India", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "nilgiri-tea", name: "Nilgiri Tea",
    aliases: ["nilgiri tea", "nilgiri", "south indian tea"],
    category: "live", group: "Tea & Coffee",
    primaryMarket: "Coonoor Auction",
    quotes: [
      { market: "Coonoor Auction",   state: "Tamil Nadu", ratePerKg: 192 },
      { market: "Coimbatore Auction", state: "Tamil Nadu", ratePerKg: 188 },
      { market: "Kochi Auction",     state: "Kerala",     ratePerKg: 195 },
    ],
    trend7d: 0.6, trend30d: 2.4, trend90d: 5.8,
    source: "Tea Board of India", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "green-tea", name: "Green Tea",
    aliases: ["green tea"],
    category: "live", group: "Tea & Coffee",
    primaryMarket: "Nilgiris",
    quotes: [
      { market: "Nilgiris",   state: "Tamil Nadu", ratePerKg: 385 },
      { market: "Munnar",     state: "Kerala",     ratePerKg: 392 },
    ],
    trend7d: 0.2, trend30d: 1.1, trend90d: 4.4,
    source: "Tea Board / Regional", sourceTier: "regional",
    confidence: "Medium", lastUpdated: today,
  },

  // ---------------- TEXTILES ----------------
  {
    key: "cotton", name: "Cotton (Raw)",
    aliases: ["cotton", "raw cotton", "kapas"],
    category: "live", group: "Textiles",
    primaryMarket: "Coimbatore",
    quotes: [
      { market: "Coimbatore", state: "Tamil Nadu",     ratePerKg: 158 },
      { market: "Guntur",     state: "Andhra Pradesh", ratePerKg: 162 },
      { market: "Hubli",      state: "Karnataka",      ratePerKg: 155 },
    ],
    trend7d: 0.3, trend30d: 1.8, trend90d: -2.4,
    source: "Cotton Corporation of India", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "cotton-yarn", name: "Cotton Yarn (40s Combed)",
    aliases: ["cotton yarn", "yarn"],
    category: "live", group: "Textiles",
    primaryMarket: "Tiruppur",
    quotes: [
      { market: "Tiruppur",   state: "Tamil Nadu", ratePerKg: 285 },
      { market: "Coimbatore", state: "Tamil Nadu", ratePerKg: 282 },
      { market: "Erode",      state: "Tamil Nadu", ratePerKg: 278 },
    ],
    trend7d: 0.5, trend30d: 2.2, trend90d: 4.6,
    source: "SIMA / Regional Trade", sourceTier: "regional",
    confidence: "Medium", lastUpdated: today,
  },
  {
    key: "fabric", name: "Cotton Fabric (Greige)",
    aliases: ["fabric", "cotton fabric", "greige"],
    category: "benchmark", group: "Textiles",
    primaryMarket: "Tiruppur",
    quotes: [
      { market: "Tiruppur",   state: "Tamil Nadu", ratePerKg: 320 },
      { market: "Erode",      state: "Tamil Nadu", ratePerKg: 312 },
    ],
    trend7d: 0.2, trend30d: 1.5, trend90d: 3.1,
    source: "Internal Benchmark", sourceTier: "internal",
    confidence: "Medium", lastUpdated: today,
  },

  // ---------------- HERBAL ----------------
  {
    key: "moringa-powder", name: "Moringa Powder",
    aliases: ["moringa powder"],
    category: "benchmark", group: "Herbal",
    primaryMarket: "Dindigul",
    quotes: [
      { market: "Dindigul", state: "Tamil Nadu",     ratePerKg: 295 },
      { market: "Madurai",  state: "Tamil Nadu",     ratePerKg: 288 },
      { market: "Kurnool",  state: "Andhra Pradesh", ratePerKg: 278 },
    ],
    trend7d: 0.3, trend30d: 1.8, trend90d: 5.2,
    source: "Internal Benchmark Database", sourceTier: "internal",
    confidence: "Medium", lastUpdated: today,
  },
  {
    key: "moringa-leaves", name: "Moringa Leaves (Dried)",
    aliases: ["moringa leaves", "moringa"],
    category: "benchmark", group: "Herbal",
    primaryMarket: "Dindigul",
    quotes: [
      { market: "Dindigul", state: "Tamil Nadu",     ratePerKg: 185 },
      { market: "Madurai",  state: "Tamil Nadu",     ratePerKg: 178 },
    ],
    trend7d: 0.2, trend30d: 1.2, trend90d: 3.8,
    source: "Internal Benchmark Database", sourceTier: "internal",
    confidence: "Medium", lastUpdated: today,
  },
  {
    key: "ashwagandha", name: "Ashwagandha Root",
    aliases: ["ashwagandha", "withania"],
    category: "benchmark", group: "Herbal",
    primaryMarket: "Hyderabad",
    quotes: [
      { market: "Hyderabad", state: "Telangana",      ratePerKg: 245 },
      { market: "Kurnool",   state: "Andhra Pradesh", ratePerKg: 232 },
    ],
    trend7d: 0.4, trend30d: 2.1, trend90d: 6.4,
    source: "Internal Benchmark Database", sourceTier: "internal",
    confidence: "Medium", lastUpdated: today,
  },
  {
    key: "tulsi", name: "Tulsi (Holy Basil)",
    aliases: ["tulsi", "holy basil"],
    category: "benchmark", group: "Herbal",
    primaryMarket: "Hyderabad",
    quotes: [
      { market: "Hyderabad", state: "Telangana", ratePerKg: 165 },
      { market: "Madurai",   state: "Tamil Nadu", ratePerKg: 158 },
    ],
    trend7d: 0.1, trend30d: 0.8, trend90d: 2.4,
    source: "Internal Benchmark Database", sourceTier: "internal",
    confidence: "Low", lastUpdated: today,
  },
  {
    key: "neem", name: "Neem Leaves",
    aliases: ["neem"],
    category: "benchmark", group: "Herbal",
    primaryMarket: "Madurai",
    quotes: [
      { market: "Madurai",   state: "Tamil Nadu",     ratePerKg: 145 },
      { market: "Hyderabad", state: "Telangana",      ratePerKg: 152 },
    ],
    trend7d: 0.2, trend30d: 1.1, trend90d: 2.8,
    source: "Internal Benchmark Database", sourceTier: "internal",
    confidence: "Low", lastUpdated: today,
  },
  {
    key: "senna", name: "Senna Leaves",
    aliases: ["senna"],
    category: "benchmark", group: "Herbal",
    primaryMarket: "Tirunelveli",
    quotes: [
      { market: "Tirunelveli", state: "Tamil Nadu", ratePerKg: 95 },
      { market: "Madurai",     state: "Tamil Nadu", ratePerKg: 92 },
    ],
    trend7d: 0.1, trend30d: 0.6, trend90d: 1.8,
    source: "Internal Benchmark Database", sourceTier: "internal",
    confidence: "Medium", lastUpdated: today,
  },
  {
    key: "amla", name: "Amla (Indian Gooseberry)",
    aliases: ["amla", "gooseberry"],
    category: "benchmark", group: "Herbal",
    primaryMarket: "Salem",
    quotes: [
      { market: "Salem",   state: "Tamil Nadu",     ratePerKg: 78 },
      { market: "Kurnool", state: "Andhra Pradesh", ratePerKg: 74 },
    ],
    trend7d: -0.2, trend30d: -1.4, trend90d: 0.8,
    source: "Internal Benchmark Database", sourceTier: "internal",
    confidence: "Medium", lastUpdated: today,
  },
  {
    key: "shatavari", name: "Shatavari Root",
    aliases: ["shatavari"],
    category: "benchmark", group: "Herbal",
    primaryMarket: "Hyderabad",
    quotes: [
      { market: "Hyderabad", state: "Telangana", ratePerKg: 285 },
      { market: "Kurnool",   state: "Andhra Pradesh", ratePerKg: 272 },
    ],
    trend7d: 0.3, trend30d: 1.8, trend90d: 4.6,
    source: "Internal Benchmark Database", sourceTier: "internal",
    confidence: "Low", lastUpdated: today,
  },

  // ---------------- DRIED PRODUCTS ----------------
  {
    key: "dried-onion", name: "Dried Onion Flakes",
    aliases: ["dried onion", "onion flakes", "dehydrated onion"],
    category: "benchmark", group: "Dried Products",
    primaryMarket: "Mahuva",
    quotes: [
      { market: "Mahuva",    state: "Gujarat",        ratePerKg: 215 },
      { market: "Kurnool",   state: "Andhra Pradesh", ratePerKg: 222 },
      { market: "Hyderabad", state: "Telangana",      ratePerKg: 228 },
    ],
    trend7d: 0.5, trend30d: 2.8, trend90d: 7.2,
    source: "Internal Benchmark Database", sourceTier: "internal",
    confidence: "Medium", lastUpdated: today,
  },
  {
    key: "dried-garlic", name: "Dried Garlic",
    aliases: ["dried garlic", "garlic flakes", "dehydrated garlic"],
    category: "benchmark", group: "Dried Products",
    primaryMarket: "Mahuva",
    quotes: [
      { market: "Mahuva",    state: "Gujarat",        ratePerKg: 385 },
      { market: "Hyderabad", state: "Telangana",      ratePerKg: 395 },
    ],
    trend7d: 0.3, trend30d: 1.9, trend90d: 5.4,
    source: "Internal Benchmark Database", sourceTier: "internal",
    confidence: "Medium", lastUpdated: today,
  },
  {
    key: "curry-leaves", name: "Curry Leaves (Dried)",
    aliases: ["curry leaves", "curry leaf"],
    category: "benchmark", group: "Dried Products",
    primaryMarket: "Salem",
    quotes: [
      { market: "Salem",   state: "Tamil Nadu", ratePerKg: 245 },
      { market: "Madurai", state: "Tamil Nadu", ratePerKg: 238 },
    ],
    trend7d: 0.4, trend30d: 1.6, trend90d: 4.1,
    source: "Internal Benchmark Database", sourceTier: "internal",
    confidence: "Low", lastUpdated: today,
  },
  {
    key: "ginger", name: "Dried Ginger",
    aliases: ["ginger", "dried ginger", "sonth"],
    category: "live", group: "Spices",
    primaryMarket: "Kochi",
    quotes: [
      { market: "Kochi",    state: "Kerala",    ratePerKg: 285 },
      { market: "Wayanad",  state: "Kerala",    ratePerKg: 278 },
      { market: "Hassan",   state: "Karnataka", ratePerKg: 272 },
    ],
    trend7d: 0.6, trend30d: 3.1, trend90d: 8.4,
    source: "Spices Board", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "fennel", name: "Fennel (Saunf)",
    aliases: ["fennel", "saunf"],
    category: "live", group: "Spices",
    primaryMarket: "Unjha",
    quotes: [
      { market: "Unjha",  state: "Gujarat",   ratePerKg: 195 },
      { market: "Mehsana",state: "Gujarat",   ratePerKg: 188 },
      { market: "Sirsa",  state: "Haryana",   ratePerKg: 205 },
    ],
    trend7d: 0.3, trend30d: 1.4, trend90d: 3.6,
    source: "Spices Board / Agmarknet", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "fenugreek", name: "Fenugreek (Methi)",
    aliases: ["fenugreek", "methi"],
    category: "live", group: "Spices",
    primaryMarket: "Unjha",
    quotes: [
      { market: "Unjha",     state: "Gujarat",  ratePerKg: 78 },
      { market: "Hyderabad", state: "Telangana", ratePerKg: 82 },
      { market: "Kota",      state: "Rajasthan", ratePerKg: 75 },
    ],
    trend7d: 0.2, trend30d: 1.1, trend90d: 2.8,
    source: "Spices Board / Agmarknet", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "mustard", name: "Mustard Seeds (Sarson)",
    aliases: ["mustard", "sarson", "rai"],
    category: "live", group: "Spices",
    primaryMarket: "Jaipur",
    quotes: [
      { market: "Jaipur",  state: "Rajasthan", ratePerKg: 62 },
      { market: "Kota",    state: "Rajasthan", ratePerKg: 60 },
      { market: "Hapur",   state: "Uttar Pradesh", ratePerKg: 64 },
    ],
    trend7d: 0.1, trend30d: 0.6, trend90d: 1.8,
    source: "Agmarknet", sourceTier: "regional",
    confidence: "Medium", lastUpdated: today,
  },
  {
    key: "mace", name: "Mace (Javitri)",
    aliases: ["mace", "javitri"],
    category: "live", group: "Spices",
    primaryMarket: "Kochi",
    quotes: [
      { market: "Kochi",  state: "Kerala", ratePerKg: 2150 },
      { market: "Idukki", state: "Kerala", ratePerKg: 2185 },
    ],
    trend7d: 0.4, trend30d: 1.9, trend90d: 4.8,
    source: "Spices Board", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "bay-leaf", name: "Bay Leaf (Tej Patta)",
    aliases: ["bay leaf", "bay leaves", "tej patta"],
    category: "benchmark", group: "Spices",
    primaryMarket: "Dehradun",
    quotes: [
      { market: "Dehradun", state: "Uttarakhand", ratePerKg: 145 },
      { market: "Hyderabad", state: "Telangana",  ratePerKg: 152 },
    ],
    trend7d: 0.2, trend30d: 1.0, trend90d: 2.4,
    source: "Internal Benchmark Database", sourceTier: "internal",
    confidence: "Medium", lastUpdated: today,
  },
  {
    key: "ajwain", name: "Ajwain (Carom Seeds)",
    aliases: ["ajwain", "carom"],
    category: "benchmark", group: "Spices",
    primaryMarket: "Unjha",
    quotes: [
      { market: "Unjha",  state: "Gujarat",   ratePerKg: 215 },
      { market: "Kota",   state: "Rajasthan", ratePerKg: 222 },
    ],
    trend7d: 0.3, trend30d: 1.4, trend90d: 3.2,
    source: "Internal Benchmark Database", sourceTier: "internal",
    confidence: "Medium", lastUpdated: today,
  },
  {
    key: "asafoetida", name: "Asafoetida (Hing)",
    aliases: ["asafoetida", "hing"],
    category: "benchmark", group: "Spices",
    primaryMarket: "Hathras",
    quotes: [
      { market: "Hathras",  state: "Uttar Pradesh", ratePerKg: 1850 },
      { market: "Hyderabad", state: "Telangana",     ratePerKg: 1920 },
    ],
    trend7d: 0.5, trend30d: 2.1, trend90d: 5.4,
    source: "Internal Benchmark Database", sourceTier: "internal",
    confidence: "Medium", lastUpdated: today,
  },
  {
    key: "paprika", name: "Paprika (Sweet Chilli Powder)",
    aliases: ["paprika", "sweet chilli"],
    category: "live", group: "Spices",
    primaryMarket: "Byadgi",
    quotes: [
      { market: "Byadgi", state: "Karnataka", ratePerKg: 285 },
      { market: "Guntur", state: "Andhra Pradesh", ratePerKg: 268 },
    ],
    trend7d: 0.6, trend30d: 2.8, trend90d: 5.2,
    source: "Spices Board / Regional", sourceTier: "regional",
    confidence: "Medium", lastUpdated: today,
  },
  {
    key: "masala", name: "Curry / Masala Blend",
    aliases: ["curry powder", "masala", "garam masala", "sambar", "biryani masala"],
    category: "benchmark", group: "Spices",
    primaryMarket: "Chennai",
    quotes: [
      { market: "Chennai",   state: "Tamil Nadu", ratePerKg: 385 },
      { market: "Hyderabad", state: "Telangana", ratePerKg: 395 },
      { market: "Kochi",     state: "Kerala",     ratePerKg: 410 },
    ],
    trend7d: 0.3, trend30d: 1.6, trend90d: 3.8,
    source: "Internal Benchmark Database", sourceTier: "internal",
    confidence: "Medium", lastUpdated: today,
  },
  {
    key: "basmati", name: "Basmati Rice (1121)",
    aliases: ["basmati", "1121", "pusa basmati"],
    category: "live", group: "Cereals",
    primaryMarket: "Karnal",
    quotes: [
      { market: "Karnal",    state: "Haryana", ratePerKg: 92 },
      { market: "Amritsar",  state: "Punjab",  ratePerKg: 95 },
      { market: "Bahadurgarh", state: "Haryana", ratePerKg: 90 },
    ],
    trend7d: 0.4, trend30d: 2.1, trend90d: 6.2,
    source: "APEDA / Agmarknet", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
  {
    key: "non-basmati-rice", name: "Non-Basmati Rice",
    aliases: ["non-basmati", "non basmati", "sona masoori", "ir-64", "ir64"],
    category: "live", group: "Cereals",
    primaryMarket: "Kakinada",
    quotes: [
      { market: "Kakinada",  state: "Andhra Pradesh", ratePerKg: 34 },
      { market: "Raichur",   state: "Karnataka",      ratePerKg: 36 },
      { market: "Bardhaman", state: "West Bengal",    ratePerKg: 32 },
    ],
    trend7d: 0.2, trend30d: 1.2, trend90d: 3.4,
    source: "APEDA / Agmarknet", sourceTier: "official",
    confidence: "High", lastUpdated: today,
  },
];

/** Match a product name (free-text or HS-search entry) to a benchmark. */
export function findBenchmark(productName: string): ProductBenchmark | null {
  const q = productName.trim().toLowerCase();
  if (!q) return null;
  // 1. exact key/name
  for (const b of BENCHMARKS) {
    if (b.key === q || b.name.toLowerCase() === q) return b;
  }
  // 2. alias substring match (longest alias first to prefer "black pepper" over "pepper")
  const ranked = BENCHMARKS.flatMap((b) => b.aliases.map((a) => ({ b, a }))).sort(
    (x, y) => y.a.length - x.a.length,
  );
  for (const { b, a } of ranked) {
    if (q.includes(a)) return b;
  }
  return null;
}

export function regionalAverage(b: ProductBenchmark): number {
  if (!b.quotes.length) return 0;
  return b.quotes.reduce((s, q) => s + q.ratePerKg, 0) / b.quotes.length;
}

export function lowestQuote(b: ProductBenchmark): MarketQuote {
  return b.quotes.reduce((min, q) => (q.ratePerKg < min.ratePerKg ? q : min), b.quotes[0]);
}
export function highestQuote(b: ProductBenchmark): MarketQuote {
  return b.quotes.reduce((max, q) => (q.ratePerKg > max.ratePerKg ? q : max), b.quotes[0]);
}

export function primaryRate(b: ProductBenchmark): number {
  const p = b.quotes.find((q) => q.market === b.primaryMarket);
  return p ? p.ratePerKg : b.quotes[0]?.ratePerKg ?? 0;
}

export function assessVariance(supplierPerKg: number, benchmarkPerKg: number): {
  variancePct: number;
  label: "Below Market" | "Near Market" | "Above Market";
  tone: "green" | "amber" | "red";
  trend: MarketTrend;
} {
  if (!benchmarkPerKg) return { variancePct: 0, label: "Near Market", tone: "amber", trend: "Stable" };
  const variancePct = ((supplierPerKg - benchmarkPerKg) / benchmarkPerKg) * 100;
  let label: "Below Market" | "Near Market" | "Above Market" = "Near Market";
  let tone: "green" | "amber" | "red" = "amber";
  if (variancePct < -1.5) { label = "Below Market"; tone = "green"; }
  else if (variancePct > 1.5) { label = "Above Market"; tone = "red"; }
  return { variancePct, label, tone, trend: "Stable" };
}

export function trendFromPct(pct: number): MarketTrend {
  if (pct > 0.5) return "Rising";
  if (pct < -0.5) return "Falling";
  return "Stable";
}
export function statusFromTrend(t: MarketTrend): MarketStatus {
  return t === "Rising" ? "Bullish" : t === "Falling" ? "Bearish" : "Neutral";
}

export function recommendation(opts: {
  variancePct: number;
  trend30d: number;
}): string {
  const { variancePct, trend30d } = opts;
  if (variancePct > 5) {
    return `Supplier pricing exceeds benchmark by ${variancePct.toFixed(1)}%. Negotiation strongly recommended.`;
  }
  if (variancePct > 1.5) {
    return `Supplier pricing is ${variancePct.toFixed(1)}% above benchmark. Consider negotiating or comparing alternate suppliers.`;
  }
  if (variancePct < -1.5) {
    return `Supplier pricing is ${Math.abs(variancePct).toFixed(1)}% below benchmark — favourable procurement.`;
  }
  if (trend30d > 4) {
    return "Supplier pricing is within market range, but 30-day trend is rising sharply. Early procurement advised.";
  }
  return "Supplier pricing is within acceptable market range.";
}
