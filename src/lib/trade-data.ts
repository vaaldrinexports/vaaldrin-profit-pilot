// Bundled trade datasets for India exporters.
// Phase 1: top 20 export HS codes + duty lookup for major destinations + country risk.
// Sources: India RoDTEP notifications (CBIC), WTO Tariff Data, EU TARIC, World Bank governance indicators (2024).
// Rates are indicative; verify before final quotation.

export interface HsCodeEntry {
  hsCode: string;       // dotted format e.g. "1006.30.20"
  hsCodeFlat: string;   // "10063020"
  name: string;         // common product name
  category: string;
  rodtepPct: number;    // %
  dutyDrawbackPct: number; // %
  keywords: string[];   // for search
}

export const HS_CODES: HsCodeEntry[] = [
  { hsCode: "1006.30.20", hsCodeFlat: "10063020", name: "Basmati Rice", category: "Cereals", rodtepPct: 0.7, dutyDrawbackPct: 1.5, keywords: ["basmati","rice","1121","pusa"] },
  { hsCode: "1006.30.90", hsCodeFlat: "10063090", name: "Non-Basmati Rice", category: "Cereals", rodtepPct: 1.4, dutyDrawbackPct: 1.7, keywords: ["non-basmati","rice","sona","masoori","ir64"] },
  { hsCode: "0901.21.00", hsCodeFlat: "09012100", name: "Coffee, Roasted (not decaf)", category: "Beverages", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["coffee","arabica","robusta","roasted"] },
  { hsCode: "0902.30.10", hsCodeFlat: "09023010", name: "Black Tea (packets ≤3 kg)", category: "Beverages", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["tea","black tea","darjeeling","assam"] },
  { hsCode: "0904.11.10", hsCodeFlat: "09041110", name: "Black Pepper", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["pepper","kali mirch","spice"] },
  { hsCode: "0904.21.10", hsCodeFlat: "09042110", name: "Chillies, dried", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["chilli","chillies","red chilli","mirch","spice"] },
  { hsCode: "0908.31.10", hsCodeFlat: "09083110", name: "Cardamom, large", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["cardamom","elaichi","spice"] },
  { hsCode: "0910.30.10", hsCodeFlat: "09103010", name: "Turmeric (Haldi), fresh", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["turmeric","haldi","curcumin","spice"] },
  { hsCode: "0910.99.13", hsCodeFlat: "09109913", name: "Cumin Seeds (Jeera)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["cumin","jeera","spice"] },
  { hsCode: "5201.00.15", hsCodeFlat: "52010015", name: "Cotton, raw (long staple)", category: "Textiles", rodtepPct: 1.7, dutyDrawbackPct: 1.5, keywords: ["cotton","raw cotton","fibre"] },
  { hsCode: "5208.42.90", hsCodeFlat: "52084290", name: "Cotton Woven Fabric, dyed", category: "Textiles", rodtepPct: 3.4, dutyDrawbackPct: 2.5, keywords: ["cotton fabric","woven","dyed","textile"] },
  { hsCode: "6109.10.00", hsCodeFlat: "61091000", name: "Cotton T-Shirts, knitted", category: "Apparel", rodtepPct: 4.3, dutyDrawbackPct: 2.8, keywords: ["t-shirt","tshirt","apparel","garment","knitted"] },
  { hsCode: "6203.42.00", hsCodeFlat: "62034200", name: "Men's Cotton Trousers", category: "Apparel", rodtepPct: 4.3, dutyDrawbackPct: 2.8, keywords: ["trouser","pants","jeans","apparel","cotton"] },
  { hsCode: "4202.22.20", hsCodeFlat: "42022220", name: "Leather Handbags", category: "Leather", rodtepPct: 2.5, dutyDrawbackPct: 2.5, keywords: ["handbag","purse","leather","bag"] },
  { hsCode: "6403.99.90", hsCodeFlat: "64039990", name: "Leather Footwear", category: "Leather", rodtepPct: 2.4, dutyDrawbackPct: 2.6, keywords: ["shoes","footwear","leather","sandals"] },
  { hsCode: "7113.19.10", hsCodeFlat: "71131910", name: "Gold Jewellery (studded)", category: "Gems & Jewellery", rodtepPct: 0.5, dutyDrawbackPct: 0.0, keywords: ["jewellery","jewelry","gold","studded","diamond"] },
  { hsCode: "3004.90.99", hsCodeFlat: "30049099", name: "Pharmaceutical Formulations", category: "Pharma", rodtepPct: 0.7, dutyDrawbackPct: 1.0, keywords: ["pharma","medicine","drug","formulation","tablet"] },
  { hsCode: "8703.23.91", hsCodeFlat: "87032391", name: "Passenger Cars (1500-3000cc)", category: "Automotive", rodtepPct: 1.0, dutyDrawbackPct: 1.5, keywords: ["car","passenger","automobile","vehicle"] },
  { hsCode: "8708.99.00", hsCodeFlat: "87089900", name: "Auto Components / Parts", category: "Automotive", rodtepPct: 1.7, dutyDrawbackPct: 2.0, keywords: ["auto parts","components","spare","automotive"] },
  { hsCode: "0306.17.00", hsCodeFlat: "03061700", name: "Frozen Shrimp / Prawns", category: "Seafood", rodtepPct: 2.5, dutyDrawbackPct: 2.4, keywords: ["shrimp","prawn","seafood","frozen","vannamei"] },
];

export function searchHsCodes(query: string, limit = 8): HsCodeEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = HS_CODES.map((e) => {
    const hay = [e.name.toLowerCase(), e.hsCode, e.hsCodeFlat, e.category.toLowerCase(), ...e.keywords].join(" ");
    let score = 0;
    if (e.name.toLowerCase().startsWith(q)) score += 10;
    if (hay.includes(q)) score += 5;
    for (const k of e.keywords) if (k.includes(q)) score += 2;
    return { e, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.e);
}

// ---------------- Destination duty lookup ----------------
// Indicative MFN import duty / VAT / FTA-preferential duty for India-origin goods.
// Keyed by ISO-3166 alpha-2 country code + HS code (dotted).
// FTA: if India has a preferential trade deal & the product qualifies, the lower rate applies.

export interface DutyEntry {
  mfnDutyPct: number;        // most-favoured-nation import duty
  vatPct: number;            // VAT / GST at destination
  ftaDutyPct: number | null; // duty if India-origin FTA preference applies, null = no FTA
  ftaName?: string;          // e.g. "India-UAE CEPA", "India-EU GSP"
  notes?: string;
}

export interface CountryInfo {
  code: string;
  name: string;
  riskLevel: "Low" | "Medium" | "High";
  riskNotes: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: "US", name: "United States",   riskLevel: "Low",    riskNotes: "Stable; GSP for India expired 2019" },
  { code: "DE", name: "Germany",         riskLevel: "Low",    riskNotes: "EU member; strong rule of law" },
  { code: "GB", name: "United Kingdom",  riskLevel: "Low",    riskNotes: "DCTS preferences for India" },
  { code: "AE", name: "United Arab Emirates", riskLevel: "Low", riskNotes: "India-UAE CEPA active since 2022" },
  { code: "SA", name: "Saudi Arabia",    riskLevel: "Low",    riskNotes: "Stable trading partner" },
  { code: "FR", name: "France",          riskLevel: "Low",    riskNotes: "EU member" },
  { code: "NL", name: "Netherlands",     riskLevel: "Low",    riskNotes: "EU member; major EU port hub" },
  { code: "JP", name: "Japan",           riskLevel: "Low",    riskNotes: "India-Japan CEPA active" },
  { code: "SG", name: "Singapore",       riskLevel: "Low",    riskNotes: "India-Singapore CECA active" },
  { code: "AU", name: "Australia",       riskLevel: "Low",    riskNotes: "India-Australia ECTA active since 2022" },
  { code: "CA", name: "Canada",          riskLevel: "Low",    riskNotes: "Stable; bilateral tensions monitor" },
  { code: "CN", name: "China",           riskLevel: "Medium", riskNotes: "Geopolitical & payment-flow checks" },
  { code: "RU", name: "Russia",          riskLevel: "High",   riskNotes: "Sanctions exposure; SWIFT restrictions" },
  { code: "BR", name: "Brazil",          riskLevel: "Medium", riskNotes: "Currency volatility" },
  { code: "ZA", name: "South Africa",    riskLevel: "Medium", riskNotes: "Forex controls & power instability" },
  { code: "NG", name: "Nigeria",         riskLevel: "High",   riskNotes: "USD shortage; payment delays common" },
  { code: "EG", name: "Egypt",           riskLevel: "High",   riskNotes: "FX shortage; LC strongly advised" },
  { code: "TR", name: "Türkiye",         riskLevel: "Medium", riskNotes: "Lira volatility; tariff hikes possible" },
  { code: "BD", name: "Bangladesh",      riskLevel: "Medium", riskNotes: "SAFTA partner; FX reserves tight" },
  { code: "LK", name: "Sri Lanka",       riskLevel: "High",   riskNotes: "Post-default recovery; advance payment preferred" },
  { code: "VN", name: "Vietnam",         riskLevel: "Low",    riskNotes: "ASEAN-India FTA" },
  { code: "MY", name: "Malaysia",        riskLevel: "Low",    riskNotes: "ASEAN-India FTA + bilateral CECA" },
  { code: "ID", name: "Indonesia",       riskLevel: "Medium", riskNotes: "ASEAN-India FTA; complex import permits" },
  { code: "KR", name: "South Korea",     riskLevel: "Low",    riskNotes: "India-Korea CEPA active" },
];

// Duty table — indicative.
// Note: EU members share the EU Common External Tariff; we model DE/FR/NL identically.
const EU_FTA = { ftaName: "EU GSP+ (limited products)" } as const;

export const DUTY_TABLE: Record<string, Record<string, DutyEntry>> = {
  // United States
  US: {
    "1006.30.20": { mfnDutyPct: 1.4, vatPct: 0, ftaDutyPct: null, notes: "USDA inspection required" },
    "1006.30.90": { mfnDutyPct: 1.4, vatPct: 0, ftaDutyPct: null },
    "0901.21.00": { mfnDutyPct: 0,   vatPct: 0, ftaDutyPct: null },
    "0902.30.10": { mfnDutyPct: 0,   vatPct: 0, ftaDutyPct: null },
    "0904.11.10": { mfnDutyPct: 0,   vatPct: 0, ftaDutyPct: null },
    "0904.21.10": { mfnDutyPct: 2.5, vatPct: 0, ftaDutyPct: null },
    "5201.00.15": { mfnDutyPct: 0,   vatPct: 0, ftaDutyPct: null },
    "6109.10.00": { mfnDutyPct: 16.5,vatPct: 0, ftaDutyPct: null, notes: "Section 301 review periodically" },
    "6203.42.00": { mfnDutyPct: 16.6,vatPct: 0, ftaDutyPct: null },
    "4202.22.20": { mfnDutyPct: 17.6,vatPct: 0, ftaDutyPct: null },
    "6403.99.90": { mfnDutyPct: 10,  vatPct: 0, ftaDutyPct: null },
    "7113.19.10": { mfnDutyPct: 5.5, vatPct: 0, ftaDutyPct: null },
    "3004.90.99": { mfnDutyPct: 0,   vatPct: 0, ftaDutyPct: null, notes: "FDA registration mandatory" },
    "0306.17.00": { mfnDutyPct: 0,   vatPct: 0, ftaDutyPct: null, notes: "FDA + DOC anti-dumping checks" },
  },
  // United Arab Emirates — India-UAE CEPA
  AE: {
    "1006.30.20": { mfnDutyPct: 5, vatPct: 0, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "1006.30.90": { mfnDutyPct: 5, vatPct: 0, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "0901.21.00": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "0902.30.10": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "0904.11.10": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "0904.21.10": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "0910.30.10": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "0910.99.13": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "6109.10.00": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "6203.42.00": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "7113.19.10": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA", notes: "Tariff Rate Quota applies" },
    "3004.90.99": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "0306.17.00": { mfnDutyPct: 5, vatPct: 0, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
  },
  // Germany / France / Netherlands — EU Common External Tariff
  DE: {
    "1006.30.20": { mfnDutyPct: 175, vatPct: 7, ftaDutyPct: null, notes: "€175/tonne specific duty (approx %)" },
    "0901.21.00": { mfnDutyPct: 7.5, vatPct: 19, ftaDutyPct: null },
    "0902.30.10": { mfnDutyPct: 0,   vatPct: 19, ftaDutyPct: null },
    "0904.11.10": { mfnDutyPct: 4,   vatPct: 7,  ftaDutyPct: null },
    "0904.21.10": { mfnDutyPct: 9.6, vatPct: 7,  ftaDutyPct: null },
    "5201.00.15": { mfnDutyPct: 0,   vatPct: 19, ftaDutyPct: null },
    "6109.10.00": { mfnDutyPct: 12,  vatPct: 19, ftaDutyPct: 9.6, ...EU_FTA },
    "6203.42.00": { mfnDutyPct: 12,  vatPct: 19, ftaDutyPct: 9.6, ...EU_FTA },
    "4202.22.20": { mfnDutyPct: 3,   vatPct: 19, ftaDutyPct: null },
    "6403.99.90": { mfnDutyPct: 8,   vatPct: 19, ftaDutyPct: null },
    "3004.90.99": { mfnDutyPct: 0,   vatPct: 19, ftaDutyPct: null },
    "0306.17.00": { mfnDutyPct: 12,  vatPct: 7,  ftaDutyPct: null },
  },
  // United Kingdom — DCTS preferences for India
  GB: {
    "1006.30.20": { mfnDutyPct: 0,    vatPct: 0,  ftaDutyPct: null, notes: "DCTS Standard preference" },
    "0901.21.00": { mfnDutyPct: 0,    vatPct: 20, ftaDutyPct: null },
    "0902.30.10": { mfnDutyPct: 0,    vatPct: 20, ftaDutyPct: null },
    "0904.11.10": { mfnDutyPct: 0,    vatPct: 0,  ftaDutyPct: null },
    "0904.21.10": { mfnDutyPct: 4.8,  vatPct: 0,  ftaDutyPct: 0,    ftaName: "UK DCTS Standard" },
    "6109.10.00": { mfnDutyPct: 12,   vatPct: 20, ftaDutyPct: 9.6,  ftaName: "UK DCTS Standard" },
    "6203.42.00": { mfnDutyPct: 12,   vatPct: 20, ftaDutyPct: 9.6,  ftaName: "UK DCTS Standard" },
    "7113.19.10": { mfnDutyPct: 2.5,  vatPct: 20, ftaDutyPct: 0,    ftaName: "UK DCTS Enhanced" },
    "3004.90.99": { mfnDutyPct: 0,    vatPct: 0,  ftaDutyPct: null },
    "0306.17.00": { mfnDutyPct: 12,   vatPct: 0,  ftaDutyPct: 6.4,  ftaName: "UK DCTS Standard" },
  },
  // Australia — India-Australia ECTA
  AU: {
    "1006.30.20": { mfnDutyPct: 0, vatPct: 10, ftaDutyPct: 0, ftaName: "India-Australia ECTA" },
    "0904.11.10": { mfnDutyPct: 0, vatPct: 10, ftaDutyPct: 0, ftaName: "India-Australia ECTA" },
    "6109.10.00": { mfnDutyPct: 5, vatPct: 10, ftaDutyPct: 0, ftaName: "India-Australia ECTA" },
    "6203.42.00": { mfnDutyPct: 5, vatPct: 10, ftaDutyPct: 0, ftaName: "India-Australia ECTA" },
    "3004.90.99": { mfnDutyPct: 0, vatPct: 10, ftaDutyPct: 0, ftaName: "India-Australia ECTA" },
    "0306.17.00": { mfnDutyPct: 0, vatPct: 10, ftaDutyPct: 0, ftaName: "India-Australia ECTA" },
  },
};

export function lookupDuty(countryCode: string, hsCodeDotted: string): DutyEntry | null {
  const c = DUTY_TABLE[countryCode?.toUpperCase()];
  if (!c) return null;
  return c[hsCodeDotted] ?? null;
}

export function findCountryByName(name: string): CountryInfo | null {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  return COUNTRIES.find((c) =>
    c.name.toLowerCase() === n ||
    c.code.toLowerCase() === n ||
    c.name.toLowerCase().includes(n) ||
    n.includes(c.name.toLowerCase())
  ) ?? null;
}

// Mirror EU CET for FR/NL to save typing
DUTY_TABLE.FR = DUTY_TABLE.DE;
DUTY_TABLE.NL = DUTY_TABLE.DE;
