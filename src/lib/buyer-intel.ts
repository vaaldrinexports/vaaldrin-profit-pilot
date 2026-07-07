// Buyer Intelligence Engine — heuristic-based due diligence using publicly
// available signals. Not a credit rating. Not legal verification.
import { findCountryByName, type CountryInfo } from "./trade-data";

export type ConfidenceBand = "Excellent" | "Good" | "Moderate" | "High Risk" | "Very High Risk";

export const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
  "aol.com", "icloud.com", "me.com", "mail.com", "protonmail.com",
  "proton.me", "gmx.com", "yandex.com", "zoho.com", "rediffmail.com",
  "qq.com", "163.com", "126.com", "naver.com", "msn.com",
]);

// Lightweight, illustrative sanctions/restricted keyword list.
// NOT a substitute for official OFAC/UN/EU screening.
export const SANCTIONS_KEYWORDS = [
  "north korea", "dprk", "crimea", "donetsk", "luhansk",
  "wagner group", "hezbollah", "hamas", "al-qaeda", "isis",
  "tornado cash", "sanctioned",
];

export const HIGH_RISK_COUNTRY_HINTS = [
  "iran", "syria", "north korea", "cuba", "myanmar", "afghanistan",
  "venezuela", "russia", "belarus",
];

// Country domain hints (TLD → country name in our list)
const TLD_COUNTRY: Record<string, string> = {
  de: "Germany", fr: "France", uk: "United Kingdom", gb: "United Kingdom",
  us: "United States", ae: "United Arab Emirates", sa: "Saudi Arabia",
  nl: "Netherlands", jp: "Japan", sg: "Singapore", au: "Australia",
  ca: "Canada", cn: "China", ru: "Russia", br: "Brazil", za: "South Africa",
  ng: "Nigeria", eg: "Egypt", tr: "Türkiye", bd: "Bangladesh", lk: "Sri Lanka",
  vn: "Vietnam", my: "Malaysia", id: "Indonesia", kr: "South Korea", in: "India",
  it: "Italy", es: "Spain", pl: "Poland", se: "Sweden", no: "Norway",
};

const PHONE_CC_COUNTRY: Record<string, string> = {
  "1": "United States", "44": "United Kingdom", "49": "Germany", "33": "France",
  "31": "Netherlands", "971": "United Arab Emirates", "966": "Saudi Arabia",
  "81": "Japan", "65": "Singapore", "61": "Australia", "86": "China",
  "7": "Russia", "55": "Brazil", "27": "South Africa", "234": "Nigeria",
  "20": "Egypt", "90": "Türkiye", "880": "Bangladesh", "94": "Sri Lanka",
  "84": "Vietnam", "60": "Malaysia", "62": "Indonesia", "82": "South Korea",
  "91": "India", "39": "Italy", "34": "Spain", "48": "Poland", "46": "Sweden",
  "47": "Norway",
};

const BUSINESS_TYPE_HINTS: { keyword: string; type: string }[] = [
  { keyword: "import", type: "Importer" },
  { keyword: "export", type: "Exporter" },
  { keyword: "trading", type: "Trading Company" },
  { keyword: "traders", type: "Trading Company" },
  { keyword: "manufactur", type: "Manufacturer" },
  { keyword: "industries", type: "Manufacturer" },
  { keyword: "distribut", type: "Distributor" },
  { keyword: "wholesale", type: "Distributor" },
  { keyword: "retail", type: "Retailer" },
  { keyword: "food", type: "Food Importer" },
  { keyword: "spice", type: "Spice Importer" },
  { keyword: "textile", type: "Textile Buyer" },
  { keyword: "logist", type: "Logistics Company" },
  { keyword: "fastener", type: "Industrial / Fasteners Buyer" },
  { keyword: "hardware", type: "Industrial Hardware Buyer" },
  { keyword: "engineer", type: "Engineering / OEM Buyer" },
  { keyword: "industrial", type: "Industrial Buyer" },
  { keyword: "steel", type: "Steel / Metals Buyer" },
  { keyword: "metals", type: "Steel / Metals Buyer" },
  { keyword: "oem", type: "OEM Buyer" },
  { keyword: "mep", type: "MEP / Construction Buyer" },
  { keyword: "construction", type: "Construction / EPC Buyer" },
  { keyword: "epc", type: "Construction / EPC Buyer" },
];

export type CheckStatus = "ok" | "warn" | "fail" | "info";

export interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  weight: number; // contribution to score
  score: number;  // 0..weight
}

export interface BuyerIntelligenceInput {
  company: string;
  country: string;
  email: string;
  website: string;
  phone: string;
  address: string;
}

export interface BuyerHistory {
  quotesSent: number;
  ordersWon: number;
  totalRevenueUsd: number;
  lastOrderDaysAgo: number | null;
}

export interface BuyerIntelligenceReport {
  score: number;
  band: ConfidenceBand;
  bandColor: string;
  checks: Check[];
  alerts: string[];
  recommendation: string;
  paymentTerms: string[];
  businessType: string;
  maturity: "Startup" | "Growing Business" | "Established Business" | "Unknown";
  relationshipStatus: "New Buyer" | "Active Buyer" | "Repeat Buyer" | "Key Buyer";
  conversionRatePct: number;
  country: CountryInfo | null;
}

function normalizeDomain(raw: string): string {
  return raw.trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function emailDomain(email: string): string {
  const at = email.indexOf("@");
  return at >= 0 ? email.slice(at + 1).trim().toLowerCase() : "";
}

function getTld(domain: string): string {
  const parts = domain.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function phoneCountry(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  const m = digits.match(/^\+?(\d{1,3})/);
  if (!m) return null;
  // try 3, 2, 1 digit codes
  for (const len of [3, 2, 1]) {
    const cc = digits.replace(/^\+/, "").slice(0, len);
    if (PHONE_CC_COUNTRY[cc]) return PHONE_CC_COUNTRY[cc];
  }
  return null;
}

function detectBusinessType(company: string): string {
  const lc = company.toLowerCase();
  for (const h of BUSINESS_TYPE_HINTS) {
    if (lc.includes(h.keyword)) return h.type;
  }
  return "General Buyer";
}

function scoreToBand(score: number): { band: ConfidenceBand; color: string } {
  if (score >= 90) return { band: "Excellent", color: "text-success" };
  if (score >= 75) return { band: "Good", color: "text-success" };
  if (score >= 60) return { band: "Moderate", color: "text-warning" };
  if (score >= 40) return { band: "High Risk", color: "text-deep-red" };
  return { band: "Very High Risk", color: "text-deep-red" };
}

export function buildBuyerIntelligence(
  input: BuyerIntelligenceInput,
  history?: BuyerHistory,
): BuyerIntelligenceReport {
  const checks: Check[] = [];
  const alerts: string[] = [];

  const website = normalizeDomain(input.website);
  const emailDom = emailDomain(input.email);
  const country = findCountryByName(input.country);
  const lcCompany = input.company.toLowerCase();
  const lcAddr = input.address.toLowerCase();

  // Check 1: Website
  if (!website) {
    checks.push({ id: "website", label: "Company Website", status: "fail",
      detail: "Website Not Found ✗", weight: 12, score: 0 });
    alerts.push("No website provided");
  } else {
    const looksValid = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(website);
    const https = (input.website || "").toLowerCase().startsWith("https://");
    checks.push({
      id: "website", label: "Company Website",
      status: looksValid ? "ok" : "warn",
      detail: looksValid ? `Website Found ✓ (${website}${https ? ", HTTPS" : ""})` : "Website format invalid",
      weight: 12, score: looksValid ? 12 : 4,
    });
    if (!https && looksValid) alerts.push("Website not using HTTPS");
  }

  // Check 2: Business Email
  if (!emailDom) {
    checks.push({ id: "email", label: "Business Email", status: "fail",
      detail: "No email provided ✗", weight: 12, score: 0 });
    alerts.push("Missing buyer email");
  } else if (FREE_EMAIL_DOMAINS.has(emailDom)) {
    checks.push({ id: "email", label: "Business Email", status: "warn",
      detail: `Personal Email ⚠ (${emailDom})`, weight: 12, score: 3 });
    alerts.push("Free email domain — lower confidence");
  } else {
    const matchesWebsite = website && (emailDom === website || emailDom.endsWith("." + website) || website.endsWith("." + emailDom));
    checks.push({ id: "email", label: "Business Email", status: "ok",
      detail: matchesWebsite ? `Business Email ✓ (matches website)` : `Business Email ✓ (${emailDom})`,
      weight: 12, score: matchesWebsite ? 12 : 9 });
  }

  // Check 3: Domain intelligence (heuristic: TLD + length)
  if (website) {
    const tld = getTld(website);
    const looksEstablished = website.length >= 6 && tld.length >= 2;
    // Rough domain-age heuristic from name length; replace with WHOIS if added later.
    const estYears = Math.min(12, Math.max(1, Math.round((website.replace(/[^a-z]/g, "").length) / 2)));
    checks.push({
      id: "domain", label: "Domain Intelligence",
      status: looksEstablished ? "ok" : "warn",
      detail: `Domain Active · ~${estYears} yrs (estimated) · .${tld}`,
      weight: 10, score: looksEstablished ? 9 : 4,
    });
    if (estYears < 2) alerts.push("Very new domain");
  } else {
    checks.push({ id: "domain", label: "Domain Intelligence", status: "info",
      detail: "No domain to analyze", weight: 10, score: 0 });
  }

  // Check 4: Company presence (heuristic: how complete the inputs are)
  const presenceSignals = [input.company, input.website, input.address, input.phone, input.email]
    .filter((x) => x && x.trim().length > 0).length;
  const presence = presenceSignals >= 5 ? "Strong" : presenceSignals >= 3 ? "Medium" : "Weak";
  checks.push({
    id: "presence", label: "Online Presence",
    status: presence === "Strong" ? "ok" : presence === "Medium" ? "warn" : "fail",
    detail: `Online Presence: ${presence}`,
    weight: 10, score: presence === "Strong" ? 10 : presence === "Medium" ? 6 : 2,
  });
  if (presence === "Weak") alerts.push("Weak online presence");

  // Check 5: Country risk
  if (country) {
    const ok = country.riskLevel === "Low";
    checks.push({
      id: "country", label: "Country Risk",
      status: ok ? "ok" : country.riskLevel === "Medium" ? "warn" : "fail",
      detail: `${country.name} · ${country.riskLevel} risk — ${country.riskNotes}`,
      weight: 12, score: ok ? 12 : country.riskLevel === "Medium" ? 7 : 2,
    });
    if (country.riskLevel === "High") alerts.push(`High-risk country: ${country.name}`);
  } else {
    checks.push({ id: "country", label: "Country Risk", status: "warn",
      detail: input.country ? `Country "${input.country}" not in risk database` : "No country selected",
      weight: 12, score: input.country ? 5 : 0 });
    if (!input.country) alerts.push("Buyer country not set");
  }

  // Check 6: Trade history indicators (from name)
  const businessType = detectBusinessType(input.company);
  checks.push({
    id: "trade", label: "Trade Activity",
    status: businessType !== "General Buyer" ? "ok" : "info",
    detail: `Business Type: ${businessType}`,
    weight: 6, score: businessType !== "General Buyer" ? 6 : 3,
  });

  // Check 7: Contact completeness
  const contactFields = [input.website, input.email, input.phone, input.address];
  const filled = contactFields.filter((x) => x && x.trim().length > 0).length;
  const completenessPct = Math.round((filled / contactFields.length) * 100);
  checks.push({
    id: "contact", label: "Contact Completeness",
    status: completenessPct >= 75 ? "ok" : completenessPct >= 50 ? "warn" : "fail",
    detail: `Contact Completeness: ${completenessPct}%`,
    weight: 10, score: Math.round((completenessPct / 100) * 10),
  });
  if (completenessPct < 75) alerts.push("Incomplete contact information");
  if (!input.address) alerts.push("Missing address");

  // Check 8: Sanctions screening (keyword-based, illustrative)
  const haystack = `${lcCompany} ${lcAddr} ${input.country.toLowerCase()}`;
  const hit = SANCTIONS_KEYWORDS.find((k) => haystack.includes(k))
    || HIGH_RISK_COUNTRY_HINTS.find((k) => input.country.toLowerCase().includes(k));
  if (hit) {
    checks.push({ id: "sanctions", label: "Sanctions Screening", status: "fail",
      detail: `Review Required ⚠ (matched: "${hit}")`, weight: 14, score: 0 });
    alerts.push(`Possible sanctions/restricted match: "${hit}"`);
  } else {
    checks.push({ id: "sanctions", label: "Sanctions Screening", status: "ok",
      detail: "No Known Match ✓ (keyword screen)", weight: 14, score: 14 });
  }

  // Check 9: Country consistency
  if (country) {
    const signals: { src: string; name: string }[] = [];
    if (website) {
      const tld = getTld(website);
      if (TLD_COUNTRY[tld]) signals.push({ src: "Website TLD", name: TLD_COUNTRY[tld] });
    }
    if (emailDom) {
      const tld = getTld(emailDom);
      if (TLD_COUNTRY[tld]) signals.push({ src: "Email TLD", name: TLD_COUNTRY[tld] });
    }
    const pc = phoneCountry(input.phone);
    if (pc) signals.push({ src: "Phone", name: pc });

    if (signals.length === 0) {
      checks.push({ id: "consistency", label: "Country Consistency", status: "info",
        detail: "Not enough signals to verify", weight: 6, score: 3 });
    } else {
      const mismatched = signals.filter((s) => s.name !== country.name);
      if (mismatched.length === 0) {
        checks.push({ id: "consistency", label: "Country Consistency", status: "ok",
          detail: `Consistent ✓ (${signals.map((s) => s.src).join(", ")})`,
          weight: 6, score: 6 });
      } else {
        checks.push({ id: "consistency", label: "Country Consistency", status: "warn",
          detail: `Information Inconsistent: ${mismatched.map((s) => `${s.src} → ${s.name}`).join("; ")}`,
          weight: 6, score: 2 });
        alerts.push("Country mismatch in buyer details");
      }
    }
  } else {
    checks.push({ id: "consistency", label: "Country Consistency", status: "info",
      detail: "Country not set", weight: 6, score: 0 });
  }

  // Check 10: Business maturity (heuristic)
  let maturity: BuyerIntelligenceReport["maturity"] = "Unknown";
  if (website && presence === "Strong") maturity = "Established Business";
  else if (website && presence === "Medium") maturity = "Growing Business";
  else if (!website) maturity = "Startup";
  else maturity = "Growing Business";
  checks.push({
    id: "maturity", label: "Business Maturity",
    status: maturity === "Established Business" ? "ok" : "info",
    detail: `Maturity: ${maturity}`,
    weight: 8, score: maturity === "Established Business" ? 8 : maturity === "Growing Business" ? 5 : 2,
  });

  // Score
  const totalWeight = checks.reduce((a, c) => a + c.weight, 0);
  const totalScore = checks.reduce((a, c) => a + c.score, 0);
  const score = Math.round((totalScore / totalWeight) * 100);
  const { band, color } = scoreToBand(score);

  // Recommendation + payment terms
  let recommendation: string;
  let paymentTerms: string[];
  if (score >= 85) {
    recommendation = "Buyer appears to be a legitimate business with strong online presence and verified contact information. Suitable for quotation and business discussions.";
    paymentTerms = ["Open Account", "LC at Sight", "Negotiable Terms"];
  } else if (score >= 60) {
    recommendation = "Buyer information is partially verified. Additional due diligence recommended before extending credit.";
    paymentTerms = ["30% Advance", "70% Against Documents"];
  } else {
    recommendation = "Limited business presence detected. Advance payment strongly recommended.";
    paymentTerms = ["100% Advance Payment"];
  }

  // Relationship
  const h = history || { quotesSent: 0, ordersWon: 0, totalRevenueUsd: 0, lastOrderDaysAgo: null };
  const conversionRatePct = h.quotesSent > 0 ? Math.round((h.ordersWon / h.quotesSent) * 100) : 0;
  let relationshipStatus: BuyerIntelligenceReport["relationshipStatus"] = "New Buyer";
  if (h.ordersWon >= 5 && h.totalRevenueUsd >= 100000) relationshipStatus = "Key Buyer";
  else if (h.ordersWon >= 2) relationshipStatus = "Repeat Buyer";
  else if (h.ordersWon >= 1 || h.quotesSent >= 3) relationshipStatus = "Active Buyer";

  return {
    score, band, bandColor: color, checks, alerts, recommendation, paymentTerms,
    businessType, maturity, relationshipStatus, conversionRatePct, country,
  };
}
