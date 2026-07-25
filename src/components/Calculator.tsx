import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  compute, defaultState, fmtINR, fmtCurrency, fmtNum,
  applyScenario, evaluatePrice, evaluateDiscount, profitVariance, convertToINR, convertFromINR,
  calculateForexExposure, getActualBankRate, getBuyerQuote, getMarketRate, type CalculatorState, type Incoterm, type ContractCurrency,
} from "@/lib/calculations";
import { listQuotes, saveQuoteSnapshot, loadQuote, deleteQuote, type SavedQuote } from "@/lib/quote-store";
import { loadSettings, saveSettings } from "@/lib/settings-store";
import {
  searchHsCodes, lookupDuty, findCountryByName, COUNTRIES, INDIAN_PORTS, gradesFor,
  type HsCodeEntry,
} from "@/lib/trade-data";
import {
  generateQuotationPDF,
  generateProformaInvoicePDF,
  generateCommercialInvoicePDF,
  generatePackingListPDF,
  generateInternalCostSheetPDF,
  generatePurchaseOrderPDF,
  generateSalesContractPDF,
} from "@/lib/pdf";
import { setPdfPreviewMode } from "@/lib/pdf";
import logoAsset from "@/assets/vaaldrin-logo.png.asset.json";
import MarketIntelligence from "@/components/MarketIntelligence";
import MarketIntelDashboard from "@/components/MarketIntelDashboard";

type DocType =
  | "quotation"
  | "proforma"
  | "commercial_invoice"
  | "packing_list"
  | "internal_cost"
  | "purchase_order"
  | "sales_contract";

const DOC_TYPES: { value: DocType; label: string; title: string }[] = [
  { value: "quotation",          label: "Export Quotation",       title: "EXPORT QUOTATION" },
  { value: "proforma",           label: "Proforma Invoice",       title: "PROFORMA INVOICE" },
  { value: "commercial_invoice", label: "Commercial Invoice",     title: "COMMERCIAL INVOICE" },
  { value: "packing_list",       label: "Packing List",           title: "PACKING LIST" },
  { value: "internal_cost",      label: "Internal Cost Sheet",    title: "INTERNAL COST ANALYSIS" },
  { value: "purchase_order",     label: "Purchase Order",         title: "PURCHASE ORDER" },
  { value: "sales_contract",     label: "Export Sales Contract",  title: "EXPORT SALES CONTRACT" },
];
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SIGNATURE_PNG_DATA_URL } from "@/lib/signature";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from "recharts";
import {
  FileDown, Printer, Save, Upload, Copy, RotateCcw, ShieldCheck, AlertTriangle,
  TrendingUp, Lock, Sparkles, MoreHorizontal, HelpCircle, Package, Truck, FileText,
  Ship, Anchor, Landmark, Wallet, Coins, Globe2, Info, Trash2, FolderOpen, History, ChevronDown,
  LayoutDashboard, Users, Boxes, LineChart as LineChartIcon, Settings, Menu, X, Bell, Search,
} from "lucide-react";

const STORAGE_KEY = "vaaldrin.calc.v1";
const ADMIN_STORAGE_KEY = "vaaldrin.admin.v1";

type AdminSettings = Pick<CalculatorState,
  | "companyName" | "companyAddress" | "companyGstin" | "companyIec" | "companyFssai" | "companyPan" | "companyWebsite" | "companyEmail" | "companyPhone"
  | "companyBankName" | "companyBankAccount" | "companyBankSwift" | "companyBankBranch" | "companyBankIfsc" | "companyAdCode"
  | "paymentTerms" | "quotationValidityDays" | "bankingTariff"
>;

const adminKeys: (keyof AdminSettings)[] = [
  "companyName", "companyAddress", "companyGstin", "companyIec", "companyFssai", "companyPan", "companyWebsite", "companyEmail", "companyPhone",
  "companyBankName", "companyBankAccount", "companyBankSwift", "companyBankBranch", "companyBankIfsc", "companyAdCode",
  "paymentTerms", "quotationValidityDays", "bankingTariff",
];

const pickAdminSettings = (state: CalculatorState): AdminSettings => adminKeys.reduce((acc, key) => ({ ...acc, [key]: state[key] }), {} as AdminSettings);

const readJson = <T,>(key: string): Partial<T> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const bankRateFromMarket = (marketRate: number, spreadPct: number) => Math.round((marketRate * (1 - Math.max(0, spreadPct) / 100)) * 100) / 100;

/* ---------- Tiny field primitives — bigger, friendlier ---------- */

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-sm font-medium text-foreground/80">{children}</Label>
      {hint && (
        <span className="group relative inline-flex">
          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block whitespace-nowrap rounded-md bg-foreground text-background text-xs px-2 py-1 shadow-lg">
            {hint}
          </span>
        </span>
      )}
    </div>
  );
}

function NumField({
  label, value, onChange, step = 1, suffix, readOnly, hint, placeholder,
}: {
  label: string; value: number; onChange: (n: number) => void;
  step?: number; suffix?: string; readOnly?: boolean; hint?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={"h-10 text-base " + (readOnly ? "bg-muted/60 font-semibold cursor-not-allowed" : "")}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, type = "text", placeholder, hint }: {
  label: string; value: string; onChange: (s: string) => void; type?: string; placeholder?: string; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-10 text-base" />
    </div>
  );
}

function GroupCard({ icon: Icon, title, subtitle, children }: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <Card className="p-6 sm:p-7">
      <div className="flex items-start gap-3 mb-6">
        {Icon && (
          <div className="shrink-0 mt-0.5 grid place-items-center w-10 h-10 rounded-xl bg-gold/12 text-gold ring-1 ring-gold/25 transition-colors group-hover:bg-gold/20">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-foreground leading-tight tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function KPI({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "gold" | "red" | "green" | "warn" }) {
  const toneCls =
    tone === "gold" ? "border-gold/50 bg-gold/5" :
    tone === "red" ? "border-deep-red/40 bg-deep-red/5" :
    tone === "green" ? "border-success/40 bg-success/5" :
    tone === "warn" ? "border-warning/50 bg-warning/5" : "border-border";
  const accent =
    tone === "gold" ? "text-gold" :
    tone === "red" ? "text-deep-red" :
    tone === "green" ? "text-success" :
    tone === "warn" ? "text-warning" : "text-foreground";
  return (
    <div className={"group min-w-0 rounded-[14px] border bg-card p-5 overflow-hidden vx-hover-lift " + toneCls}>
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold truncate">{label}</div>
      <div className={"mt-2 font-bold tabular-nums break-all leading-[1.1] vx-count [font-size:clamp(1.05rem,3.6cqi+0.6rem,1.4rem)] " + accent} title={value}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1 break-words">{sub}</div>}
    </div>
  );
}

/* ---------- HS code product search ---------- */

function HsProductSearch({
  productName, hsCode, onPick, onChangeProductName, onChangeHs,
}: {
  productName: string;
  hsCode: string;
  onPick: (entry: HsCodeEntry) => void;
  onChangeProductName: (v: string) => void;
  onChangeHs: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => searchHsCodes(productName, 6), [productName]);

  return (
    <>
      <div className="space-y-1.5 relative">
        <FieldLabel hint="Type a product name to auto-fill HS code, RoDTEP & duty drawback. Top 20 Indian export commodities supported.">
          Product name
        </FieldLabel>
        <Input
          value={productName}
          placeholder="Try: Basmati Rice, Coffee, Cotton T-Shirts…"
          onChange={(e) => { onChangeProductName(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="h-10 text-base"
        />
        {open && suggestions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-64 overflow-auto rounded-md border bg-popover shadow-lg">
            {suggestions.map((e) => (
              <button
                key={e.hsCode}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between gap-2"
                onMouseDown={(ev) => { ev.preventDefault(); onPick(e); setOpen(false); }}
              >
                <span>
                  <span className="font-medium">{e.name}</span>
                  <span className="text-muted-foreground"> · {e.category}</span>
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">{e.hsCode} · RoDTEP {e.rodtepPct}%</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <TextField label="HS code" value={hsCode} onChange={onChangeHs} placeholder="1006.30.20" />
    </>
  );
}

/* ---------- Product grade combobox (dynamic options by product) ---------- */

function GradeField({
  hsCode, productName, value, onChange,
}: {
  hsCode: string;
  productName: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const options = useMemo(() => gradesFor(hsCode, productName), [hsCode, productName]);
  const [open, setOpen] = useState(false);
  const hint = options.length
    ? `Pick a standard grade for ${productName || "this product"} or type your own.`
    : "Free-text grade — pick a product above to see suggested grades.";
  return (
    <div className="space-y-1.5">
      <FieldLabel hint={hint}>Product grade</FieldLabel>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => options.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={options[0] ? `e.g. ${options[0]}` : "e.g. Premium, Grade A"}
          className="h-10 text-base pr-9"
        />
        {options.length > 0 && (
          <button
            type="button"
            aria-label="Show grade options"
            onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o); }}
            className="absolute right-1 top-1 h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
        {open && options.length > 0 && (
          <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-lg">
            {options
              .filter((g) => !value || g.toLowerCase().includes(value.toLowerCase()))
              .map((g) => (
                <button
                  key={g}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onChange(g); setOpen(false); }}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  {g}
                </button>
              ))}
            {options.filter((g) => !value || g.toLowerCase().includes(value.toLowerCase())).length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">No match — your custom text will be saved.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Destination duty preview ---------- */

function DestinationDutyCard({ country, hsCode }: { country: string; hsCode: string }) {
  const ci = findCountryByName(country);
  if (!ci || !hsCode) return null;
  const duty = lookupDuty(ci.code, hsCode);
  if (!duty) {
    return (
      <div className="mt-4 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Destination duty preview not available for <strong>{ci.name}</strong> + HS <strong>{hsCode}</strong> (not in bundled dataset).
      </div>
    );
  }
  const effective = duty.ftaDutyPct ?? duty.mfnDutyPct;
  const landedUpliftPct = effective + duty.vatPct;
  return (
    <div className="mt-4 rounded-lg border border-gold/30 bg-gold/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Destination landed-cost preview — {ci.name}</div>
        <Badge variant="outline" className="text-xs">HS {hsCode}</Badge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-xs uppercase text-muted-foreground">MFN duty</div>
          <div className="font-bold tabular-nums">{duty.mfnDutyPct}%</div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">FTA / preferential</div>
          <div className="font-bold tabular-nums">{duty.ftaDutyPct == null ? "—" : `${duty.ftaDutyPct}%`}</div>
          {duty.ftaName && <div className="text-[10px] text-muted-foreground">{duty.ftaName}</div>}
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">VAT / GST</div>
          <div className="font-bold tabular-nums">{duty.vatPct}%</div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">Landed uplift</div>
          <div className="font-bold tabular-nums text-gold">≈ {fmtNum(landedUpliftPct, 1)}%</div>
          <div className="text-[10px] text-muted-foreground">duty + VAT on CIF</div>
        </div>
      </div>
      {duty.notes && <p className="mt-2 text-xs text-muted-foreground italic">Note: {duty.notes}</p>}
      <p className="mt-1 text-[11px] text-muted-foreground">Indicative — verify with destination customs broker before final quote.</p>
    </div>
  );
}

/* ---------- Port weather (Open-Meteo, free, no key) ---------- */

interface WeatherData {
  current: { temperature_2m: number; weather_code: number; wind_speed_10m: number };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
  };
}

const WMO_CODE: Record<number, { label: string; icon: string }> = {
  0: { label: "Clear", icon: "☀️" },
  1: { label: "Mostly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" }, 48: { label: "Rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" }, 53: { label: "Drizzle", icon: "🌦️" }, 55: { label: "Heavy drizzle", icon: "🌧️" },
  61: { label: "Light rain", icon: "🌦️" }, 63: { label: "Rain", icon: "🌧️" }, 65: { label: "Heavy rain", icon: "🌧️" },
  71: { label: "Light snow", icon: "🌨️" }, 73: { label: "Snow", icon: "🌨️" }, 75: { label: "Heavy snow", icon: "❄️" },
  80: { label: "Rain showers", icon: "🌦️" }, 81: { label: "Heavy showers", icon: "🌧️" }, 82: { label: "Violent showers", icon: "⛈️" },
  95: { label: "Thunderstorm", icon: "⛈️" }, 96: { label: "Storm + hail", icon: "⛈️" }, 99: { label: "Severe storm", icon: "⛈️" },
};

function wmoInfo(code: number) {
  return WMO_CODE[code] ?? { label: `Code ${code}`, icon: "❓" };
}

function PortWeatherCard() {
  const [portCode, setPortCode] = useState<string>(INDIAN_PORTS[0].code);
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const port = INDIAN_PORTS.find((p) => p.code === portCode)!;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${port.lat}&longitude=${port.lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&forecast_days=4&timezone=auto`;
    fetch(url)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setData(j); })
      .catch(() => { if (!cancelled) setError("Could not load weather"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [portCode, port.lat, port.lon]);

  const riskFlag = useMemo(() => {
    if (!data) return null;
    const next3 = data.daily.weather_code.slice(0, 4);
    const rain = data.daily.precipitation_sum.slice(0, 4);
    const wind = data.daily.wind_speed_10m_max.slice(0, 4);
    const heavyCodes = new Set([65, 75, 81, 82, 95, 96, 99]);
    const hasStorm = next3.some((c) => heavyCodes.has(c));
    const hasHeavyRain = rain.some((mm) => mm >= 40);
    const hasHighWind = wind.some((w) => w >= 50);
    if (hasStorm || hasHeavyRain || hasHighWind) {
      return { level: "high", msg: "Potential vessel/loading delay risk in next 4 days" };
    }
    if (rain.some((mm) => mm >= 15)) {
      return { level: "medium", msg: "Moderate rain forecast — minor delay possible" };
    }
    return { level: "low", msg: "Clear sailing conditions forecast" };
  }, [data]);

  return (
    <div className="mt-4 rounded-lg border bg-secondary/30 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Globe2 className="w-4 h-4 text-gold" /> Port weather & delay risk
        </div>
        <Select value={portCode} onValueChange={setPortCode}>
          <SelectTrigger className="h-8 w-64 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72">
            {INDIAN_PORTS.map((p) => (
              <SelectItem key={p.code} value={p.code} className="text-xs">{p.name} — {p.city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && <div className="text-xs text-muted-foreground">Loading live forecast for {port.name}…</div>}
      {error && <div className="text-xs text-deep-red">{error}</div>}

      {data && !loading && (
        <>
          <div className="flex items-center justify-between gap-4 mb-3 rounded-md bg-background p-3 border">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{wmoInfo(data.current.weather_code).icon}</div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Now at {port.name}</div>
                <div className="font-bold text-lg">{Math.round(data.current.temperature_2m)}°C · {wmoInfo(data.current.weather_code).label}</div>
                <div className="text-xs text-muted-foreground">Wind {Math.round(data.current.wind_speed_10m)} km/h</div>
              </div>
            </div>
            {riskFlag && (
              <div className={
                "shrink-0 rounded-md px-3 py-2 text-xs font-medium " +
                (riskFlag.level === "high" ? "bg-deep-red/15 text-deep-red" :
                 riskFlag.level === "medium" ? "bg-warning/15 text-warning" :
                 "bg-success/15 text-success")
              }>
                {riskFlag.level === "high" ? "⚠ " : riskFlag.level === "medium" ? "▲ " : "✓ "}
                {riskFlag.msg}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {data.daily.time.slice(0, 4).map((day, i) => {
              const info = wmoInfo(data.daily.weather_code[i]);
              const date = new Date(day);
              const label = i === 0 ? "Today" : date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
              return (
                <div key={day} className="rounded-md border bg-card p-2 text-xs">
                  <div className="font-medium">{label}</div>
                  <div className="text-xl my-1">{info.icon}</div>
                  <div className="text-muted-foreground">{info.label}</div>
                  <div className="font-semibold tabular-nums">{Math.round(data.daily.temperature_2m_max[i])}° / {Math.round(data.daily.temperature_2m_min[i])}°</div>
                  <div className="text-muted-foreground tabular-nums">🌧 {data.daily.precipitation_sum[i].toFixed(1)} mm · 💨 {Math.round(data.daily.wind_speed_10m_max[i])} km/h</div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Live data from Open-Meteo. Use for loading-window planning and delay-risk disclosures to buyer.</p>
        </>
      )}
    </div>
  );
}

/* ---------- Main component ---------- */





export default function Calculator() {
  const [s, setS] = useState<CalculatorState>(defaultState);
  const [docType, setDocType] = useState<DocType>("quotation");
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [fxStatus, setFxStatus] = useState<"loading" | "live" | "cached" | "stale">("loading");
  const [activeTab, setActiveTab] = useState<string>("inputs");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchLiveFx = async (showToast = false): Promise<boolean> => {
    try {
      if (showToast) toast.loading("Fetching live FX rates…", { id: "fxbar" });
      const r = await fetch(`https://open.er-api.com/v6/latest/INR`);
      const j = await r.json();
      const rates = j?.rates;
      if (!rates) throw new Error("No rates");
      const ts = j?.time_last_update_utc ? new Date(j.time_last_update_utc).toISOString() : new Date().toISOString();
      setS((prev) => ({
        ...prev,
        marketUsdRate: rates.USD ? Math.round((1 / rates.USD) * 100) / 100 : prev.marketUsdRate,
        actualBankUsdRate: rates.USD ? bankRateFromMarket(1 / rates.USD, prev.bankingTariff.forex_spread_percent) : prev.actualBankUsdRate,
        marketEurRate: rates.EUR ? Math.round((1 / rates.EUR) * 100) / 100 : prev.marketEurRate,
        actualBankEurRate: rates.EUR ? bankRateFromMarket(1 / rates.EUR, prev.bankingTariff.forex_spread_percent) : prev.actualBankEurRate,
        marketGbpRate: rates.GBP ? Math.round((1 / rates.GBP) * 100) / 100 : prev.marketGbpRate,
        actualBankGbpRate: rates.GBP ? bankRateFromMarket(1 / rates.GBP, prev.bankingTariff.forex_spread_percent) : prev.actualBankGbpRate,
        marketAedRate: rates.AED ? Math.round((1 / rates.AED) * 100) / 100 : prev.marketAedRate,
        actualBankAedRate: rates.AED ? bankRateFromMarket(1 / rates.AED, prev.bankingTariff.forex_spread_percent) : prev.actualBankAedRate,
        fxLastUpdated: ts,
      }));
      setFxStatus("live");
      if (showToast) toast.success("Live FX rates updated", { id: "fxbar" });
      return true;
    } catch {
      if (showToast) toast.error("Couldn't fetch live rates — using cached values", { id: "fxbar" });
      return false;
    }
  };

  useEffect(() => {
    (async () => {
      // Production behavior: every session starts with a blank quotation.
      // We ONLY restore admin/company settings (company profile, banking tariff,
      // payment terms). Quote-specific fields (buyer, product, quantities, prices)
      // are never auto-restored — use "Saved Quotes" to reload a specific quote.
      const dbSettingsRaw = await loadSettings().catch(() => null);
      const admin = readJson<AdminSettings>(ADMIN_STORAGE_KEY);
      // Purge any legacy full-state draft that pre-dated this change.
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }

      const dbAdmin: Partial<AdminSettings> = {};
      if (dbSettingsRaw) {
        for (const k of adminKeys) {
          const v = (dbSettingsRaw as any)[k];
          if (v !== undefined) (dbAdmin as any)[k] = v;
        }
      }
      const adminTariff = admin.bankingTariff;
      const dbTariff = dbAdmin.bankingTariff;

      const now = new Date();
      setS({
        ...defaultState,
        ...admin,
        ...dbAdmin,
        bankingTariff: { ...defaultState.bankingTariff, ...adminTariff, ...(dbTariff || {}) },
        quotationNumber: `VX-${now.getFullYear()}-0001`,
        quotationDate: now.toISOString().slice(0, 10),
      });

      try { setSavedQuotes(await listQuotes()); } catch (e) { console.error(e); }
      const ok = await fetchLiveFx(false);
      if (!ok) setFxStatus("cached");
    })();
  }, []);


  // Mark FX as stale if >12h old
  useEffect(() => {
    if (!s.fxLastUpdated) return;
    const ageMs = Date.now() - new Date(s.fxLastUpdated).getTime();
    if (ageMs > 12 * 60 * 60 * 1000) setFxStatus("stale");
  }, [s.fxLastUpdated]);

  const c = useMemo(() => compute(s), [s]);
  const set = <K extends keyof CalculatorState>(k: K, v: CalculatorState[K]) => setS((p) => ({ ...p, [k]: v }));

  const inputsReady = s.quantity > 0 && s.supplierPricePerUnit > 0;

  const contractValue = (inr: number) => convertFromINR(inr, s.contractCurrency, s);
  const fmtContract = (inr: number) => fmtCurrency(contractValue(inr), s.contractCurrency);
  const incotermPrice = c.recommendedPrice;
  const minIncotermPrice = c.selectedMinimumPrice;
  const walkPrice = c.selectedWalkAwayPrice;
  const counterINR = convertToINR(s.buyerCounterOffer, s.contractCurrency, s);
  const counterEvaluation = evaluatePrice(c, counterINR);
  const discountEvaluation = evaluateDiscount(c, s.requestedDiscountPct);
  const discountedPrice = discountEvaluation.price;
  const counterAcceptable = counterEvaluation.acceptable;
  const discountAcceptable = discountEvaluation.acceptable;
  const lockTriggered = c.marginLockTriggered;

  const [scenario, setScenario] = useState<string>("base");
  const scenarioState = scenario === "base" ? s : applyScenario(s, scenario);
  const sc = useMemo(() => compute(scenarioState), [scenarioState]);

  const waterfall = [
    { name: "Selling", value: incotermPrice, color: "var(--gold)" },
    { name: "− Supplier", value: -c.perUnit.supplier, color: "var(--deep-red)" },
    { name: "− Packaging", value: -c.perUnit.packaging, color: "var(--deep-red)" },
    { name: "− Logistics", value: -c.perUnit.inland, color: "var(--deep-red)" },
    { name: "− Docs", value: -c.perUnit.docs, color: "var(--deep-red)" },
    { name: "− Port", value: -c.perUnit.customs, color: "var(--deep-red)" },
    { name: "− Freight", value: -c.perUnit.freight, color: "var(--deep-red)" },
    { name: "− Insurance", value: -c.perUnit.insurance, color: "var(--deep-red)" },
    { name: "− Banking", value: -c.perUnit.banking, color: "var(--deep-red)" },
    { name: "+ Incentives", value: c.perUnit.incentives, color: "var(--success)" },
    { name: "− Buffers", value: -c.perUnit.buffers, color: "var(--deep-red)" },
    { name: "= Profit", value: c.profitPerUnit, color: "var(--success)" },
  ];

  const save = async () => {
    // Persist ONLY admin/company settings globally. Quote-specific fields
    // are stored per-quote via saveQuoteSnapshot so refreshes don't repopulate
    // old buyer/product data.
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(pickAdminSettings(s)));
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    try {
      await saveSettings(pickAdminSettings(s));
      if (inputsReady) {
        await saveQuoteSnapshot(s);
        setSavedQuotes(await listQuotes());
        toast.success("Saved to database · snapshot added");
      } else {
        toast.success("Company settings saved");
      }
    } catch (e: any) {
      toast.error(e?.message || "Database save failed");
    }
  };

  const loadSavedQuote = async (id: string) => {
    const q = await loadQuote(id);
    if (!q) { toast.error("Quote not found"); return; }
    setS(q.state);
    toast.success(`Loaded ${q.quotationNumber || q.id}`);
  };
  const deleteSavedQuote = async (id: string) => {
    if (!confirm("Delete this saved quote?")) return;
    await deleteQuote(id);
    setSavedQuotes(await listQuotes());
    toast.success("Deleted");
  };
  const duplicateSavedQuote = async (id: string) => {
    const q = await loadQuote(id);
    if (!q) return;
    const n = parseInt(q.state.quotationNumber.split("-").pop() || "0", 10) + 1;
    const base = q.state.quotationNumber.replace(/-\d+$/, "");
    setS({ ...q.state, quotationNumber: `${base}-${String(n).padStart(4, "0")}` });
    toast.success("Duplicated — edit and save to create a new revision");
  };
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${s.quotationNumber || "vaaldrin"}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const importJSON = () => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/json";
    inp.onchange = async () => {
      const f = inp.files?.[0]; if (!f) return;
      try { const data = JSON.parse(await f.text()); setS({ ...defaultState, ...data }); toast.success("Imported"); }
      catch { toast.error("Invalid JSON"); }
    };
    inp.click();
  };
  const duplicate = () => {
    const n = parseInt(s.quotationNumber.split("-").pop() || "0", 10) + 1;
    const base = s.quotationNumber.replace(/-\d+$/, "");
    setS({ ...s, quotationNumber: `${base}-${String(n).padStart(4, "0")}` });
    toast.success("Quotation duplicated");
  };
  const reset = () => {
    if (confirm("Reset all fields to defaults? This cannot be undone.")) {
      setS(defaultState); toast.success("Reset");
    }
  };
  const generatePDF = async () => {
    if (lockTriggered && docType !== "internal_cost") { toast.error("Margin lock active — adjust pricing first"); return; }
    if (c.validationErrors.length) { toast.error(c.validationErrors[0]); return; }
    // Free plan → stamp a PREVIEW watermark; paid plans → clean export.
    setPdfPreviewMode(isFree);
    try {
      switch (docType) {
        case "quotation":          await generateQuotationPDF(s); break;
        case "proforma":           await generateProformaInvoicePDF(s); break;
        case "commercial_invoice": await generateCommercialInvoicePDF(s); break;
        case "packing_list":       await generatePackingListPDF(s); break;
        case "internal_cost":      await generateInternalCostSheetPDF(s); break;
        case "purchase_order":     await generatePurchaseOrderPDF(s); break;
        case "sales_contract":     await generateSalesContractPDF(s); break;
      }
    } finally {
      setPdfPreviewMode(false);
    }
  };
  const buyerQuote = getBuyerQuote(incotermPrice, s.quantity, s);
  const buyerUnitPrice = buyerQuote.unitPrice;
  const buyerContractValue = buyerQuote.totalContractValue;
  const buyerPriceText = `${s.contractCurrency} ${fmtNum(buyerUnitPrice)} / ${s.uom || "UNIT"}`;
  const quotationSummary = `Product: ${s.productName || "Product"}\nIncoterm: ${s.incoterm}\nCurrency: ${s.contractCurrency}\nUnit Price: ${buyerPriceText}\nQuantity: ${fmtNum(s.quantity, 0)} ${s.uom}\nTotal Contract Value: ${fmtCurrency(buyerContractValue, s.contractCurrency)}`;
  const copyText = async (text: string, message: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(message); }
    catch { toast.error("Clipboard access was blocked"); }
  };

  // Quality summary
  const dq = c.dealQualityScore;
  const dqLabel = dq >= 90 ? "Excellent" : dq >= 75 ? "Good" : dq >= 60 ? "Acceptable" : "High Risk";
  const dqTone = dq >= 75 ? "text-success" : dq >= 60 ? "text-warning" : "text-deep-red";

  const saveAdminSettings = async () => {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(pickAdminSettings(s)));
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    try {
      await saveSettings(pickAdminSettings(s));
      toast.success("Admin settings saved to database");
    } catch (e: any) {
      toast.error(e?.message || "Database save failed");
    }
  };


  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Sidebar — desktop rail + mobile drawer */}
      <aside
        className={
          "vx-sidebar no-print fixed inset-y-0 left-0 z-40 w-[260px] flex-col " +
          (sidebarOpen ? "flex" : "hidden") +
          " lg:sticky lg:top-0 lg:z-20 lg:flex lg:h-screen"
        }
        aria-label="Primary navigation"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-[0.2em]" style={{ color: "var(--gold)" }}>VAALDRIN</div>
            <div className="text-[10px] tracking-widest text-muted-foreground">EXPORTS · CFO SUITE</div>
          </div>
          <button
            className="lg:hidden rounded-md p-1.5 hover:bg-muted"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mx-3 mb-3 h-px bg-border" />
        <WorkspaceSwitcher />
        <div className="mx-3 mb-3 h-px bg-border" />
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
          {[
            { id: "inputs", label: "Dashboard", icon: LayoutDashboard },
            { id: "inputs", label: "Quotations", icon: FileText },
            { id: "inputs", label: "Buyers", icon: Users },
            { id: "inputs", label: "Products", icon: Boxes },
            { id: "market-intel", label: "Market Intel", icon: LineChartIcon },
            { id: "banking", label: "Banking & Forex", icon: Landmark },
            { id: "profit", label: "Profit", icon: TrendingUp },
            { id: "incoterms", label: "Documents", icon: FileDown },
            { id: "negotiation", label: "Negotiation", icon: Sparkles },
            { id: "scenario", label: "Scenarios", icon: Copy },
            { id: "audit", label: "Saved Quotes", icon: History },
            { id: "admin", label: "Settings", icon: Settings },
          ].map((item, i) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={`${item.id}-${i}`}
                className="vx-nav-item"
                data-active={active ? "true" : "false"}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="mt-auto px-4 py-4 border-t border-white/10 text-[10px] text-white/40">
          © Vaaldrin Exports · Premium Trade Suite
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="min-w-0 flex flex-col">

      {/* Header — frosted glass */}
      <header className="no-print sticky top-0 z-30 bg-background/60 backdrop-blur-xl backdrop-saturate-150 text-foreground border-b border-border/60 shadow-[0_1px_0_0_var(--gold)]/10">

        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-3 flex flex-col gap-2 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-3">
          <div className="min-w-0 flex items-center justify-between gap-2 lg:block">
            <div className="min-w-0">
              <div className="flex items-baseline gap-3">
                <span className="text-lg sm:text-2xl font-bold tracking-tight truncate" style={{ color: "var(--gold)" }} aria-hidden="true">VAALDRIN EXPORTS</span>
                <span className="text-[11px] text-gold/80 tracking-widest hidden md:inline" aria-hidden="true">PRICING & PROFIT CONTROL</span>
              </div>
              <h1 className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">Export Pricing &amp; Profit Control</h1>
            </div>
            {/* Mobile-only condensed actions (avoid horizontal overflow) */}
            <div className="flex items-center gap-1.5 shrink-0 lg:hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-md border border-border bg-card p-2 hover:bg-muted"
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </button>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="secondary" aria-label="More options"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={save}><Save className="w-4 h-4 mr-2" />Save</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Print</DropdownMenuItem>
                  <DropdownMenuItem onClick={duplicate}><Copy className="w-4 h-4 mr-2" />Duplicate quotation</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportJSON}><FileDown className="w-4 h-4 mr-2" />Export JSON</DropdownMenuItem>
                  <DropdownMenuItem onClick={importJSON}><Upload className="w-4 h-4 mr-2" />Import JSON</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={reset} className="text-deep-red focus:text-deep-red">
                    <RotateCcw className="w-4 h-4 mr-2" />Reset all
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* Actions row — wraps on mobile, inline on desktop */}
          <div className="flex items-center gap-2 min-w-0 lg:shrink-0">
            <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
              <SelectTrigger className="h-9 flex-1 lg:flex-none lg:w-[210px] min-w-0 glass-subtle border-border/60 text-foreground text-xs sm:text-sm rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={generatePDF} className="bg-gold hover:bg-gold/90 text-gold-foreground font-semibold shrink-0">
              <FileDown className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Generate PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button size="sm" variant="secondary" onClick={save} className="hidden lg:inline-flex">
              <Save className="w-4 h-4 mr-1.5" />
              Save
            </Button>
            <div className="hidden lg:flex items-center gap-2">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="secondary" aria-label="More options"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Print</DropdownMenuItem>
                  <DropdownMenuItem onClick={duplicate}><Copy className="w-4 h-4 mr-2" />Duplicate quotation</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportJSON}><FileDown className="w-4 h-4 mr-2" />Export JSON</DropdownMenuItem>
                  <DropdownMenuItem onClick={importJSON}><Upload className="w-4 h-4 mr-2" />Import JSON</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={reset} className="text-deep-red focus:text-deep-red">
                    <RotateCcw className="w-4 h-4 mr-2" />Reset all
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Validation banner — pulled to the very top so critical errors aren't buried mid-page */}
        {c.validationErrors.length > 0 && (
          <div className="rounded-lg border-2 border-deep-red bg-deep-red/10 p-4 flex items-start gap-3" role="alert">
            <AlertTriangle className="w-5 h-5 text-deep-red mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-deep-red">{c.isConsistent ? "Pricing Validation Error" : "Calculation Inconsistency Detected"}</div>
              <ul className="mt-1 text-sm text-foreground/80 list-disc list-inside">
                {c.validationErrors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* FX status bar — always visible so user knows freshness */}
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs">
          <Globe2 className="w-3.5 h-3.5 text-gold" />
          <span className="font-semibold text-foreground/80">FX rates:</span>
          <span className="tabular-nums">USD ₹{fmtNum(s.marketUsdRate)} · EUR ₹{fmtNum(s.marketEurRate)} · GBP ₹{fmtNum(s.marketGbpRate)} · AED ₹{fmtNum(s.marketAedRate)}</span>
          {fxStatus === "live" && <Badge className="bg-success/15 text-success hover:bg-success/15 border-0">Live</Badge>}
          {fxStatus === "cached" && <Badge className="bg-warning/15 text-warning hover:bg-warning/15 border-0">Cached</Badge>}
          {fxStatus === "stale" && <Badge className="bg-deep-red/15 text-deep-red hover:bg-deep-red/15 border-0">Stale &gt;12h</Badge>}
          {fxStatus === "loading" && <Badge variant="outline">Fetching…</Badge>}
          {s.fxLastUpdated && <span className="text-muted-foreground">· as of {new Date(s.fxLastUpdated).toLocaleString()}</span>}
          <Button size="sm" variant="outline" className="h-7 ml-auto" onClick={() => fetchLiveFx(true)}>
            <RotateCcw className="w-3 h-3 mr-1.5" /> Refresh rates
          </Button>
        </div>

        {/* Executive Summary — simpler, more spacious */}
        <Card className="overflow-hidden border-gold/30 vx-elev-2">
          <div className="bg-gradient-to-br from-primary to-primary/95 text-primary-foreground p-6 sm:p-8">
            <div className="mb-6 rounded-lg border border-gold/50 bg-primary-foreground/5 p-5">
              <div className="text-[11px] font-bold tracking-[0.2em] text-gold">RECOMMENDED BUYER QUOTATION</div>
              <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                    <QuoteFact label="Product" value={s.productName || "Not set"} />
                    <QuoteFact label="Incoterm" value={s.incoterm} />
                    <QuoteFact label="Contract currency" value={s.contractCurrency} />
                  </div>
                  <div className="mt-5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/60">Quote this price</div>
                  <div className="mt-1 font-bold tabular-nums text-gold break-all leading-tight [font-size:clamp(1.5rem,6vw+0.25rem,3rem)]" title={buyerPriceText}>{buyerPriceText}</div>
                  <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm min-w-0">
                    <span className="min-w-0 break-words"><span className="text-primary-foreground/60">Quantity:</span> <strong className="tabular-nums">{fmtNum(s.quantity, 0)} {s.uom}</strong></span>
                    <span className="min-w-0 break-words"><span className="text-primary-foreground/60">Total contract value:</span> <strong className="tabular-nums break-all">{fmtCurrency(buyerContractValue, s.contractCurrency)}</strong></span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:flex-col">
                  <Button size="sm" onClick={() => copyText(buyerPriceText, "Buyer price copied")} className="bg-gold text-gold-foreground hover:bg-gold/90"><Copy className="mr-2 h-4 w-4" />Copy Buyer Price</Button>
                  <Button size="sm" variant="secondary" onClick={() => copyText(quotationSummary, "Quotation summary copied")}><Copy className="mr-2 h-4 w-4" />Copy Quotation Summary</Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-5">
              <div className="min-w-0">
                <div className="text-[11px] tracking-widest font-bold" style={{ color: "var(--gold)" }}>EXECUTIVE SUMMARY</div>
                <h2 className="text-xl sm:text-2xl font-semibold mt-1">
                  {s.productName || "New quotation"} <span className="text-primary-foreground/50 font-normal">· {s.incoterm}</span>
                </h2>
                <p className="text-xs text-primary-foreground/60 mt-1">
                  {s.buyerCompany || "No buyer set"} · {s.quantity || 0} {s.uom} · Quote {s.quotationNumber}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-primary-foreground/60 uppercase tracking-widest">Deal Quality</div>
                <div className="text-4xl font-bold leading-none mt-1" style={{ color: "var(--gold)" }}>
                  {dq}<span className="text-base text-primary-foreground/50">/100</span>
                </div>
                <Badge className={"mt-1.5 bg-primary-foreground/10 hover:bg-primary-foreground/10 border-0 " + dqTone}>
                  {dqLabel}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DirectorCell label="Recommended price" value={fmtContract(incotermPrice)} tone="gold" big
                hint="Final selling price you should quote — built on your target margin." />
              <DirectorCell label="Expected profit (internal)" value={fmtINR(c.netProfit)} pct={c.profitPct} big
                hint="Revenue minus all costs & buffers. Never shown on buyer documents." />
              <DirectorCell label="Minimum acceptable" value={fmtContract(minIncotermPrice)} tone="warn" big
                hint={`Walk-away + ${fmtNum(s.minProfitPct)}% minimum margin floor. Below this, profit is too thin.`} />
              <DirectorCell label="Walk-away price" value={fmtContract(walkPrice)} tone="danger" big
                hint="Net profit = 0 after all costs, duties, banking & forex spread. Never sell below this." />
            </div>
          </div>

          <div className="bg-card p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-sm border-t">
            <MiniStat label="EXW" value={fmtContract(c.exwPrice)} />
            <MiniStat label="FOB" value={fmtContract(c.fobPrice)} />
            <MiniStat label="CFR" value={fmtContract(c.cfrPrice)} />
            <MiniStat label="CIF" value={fmtContract(c.cifPrice)} />
            <MiniStat label="Break-even (internal)" value={fmtINR(c.breakEvenPrice)} />
            <MiniStat
              label="Risk"
              value={c.riskLevel}
              tone={c.riskLevel === "Low" ? "green" : c.riskLevel === "Medium" ? "warn" : "red"}
            />
            <MiniStat
              label="Status"
              value={lockTriggered ? "Locked" : "Open"}
              tone={lockTriggered ? "red" : "green"}
            />
          </div>
        </Card>

        {lockTriggered && (
          <div className="rounded-lg border-2 border-deep-red bg-deep-red/10 p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-deep-red mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-deep-red">Quotation locked — margin protection triggered</div>
              <div className="text-sm text-foreground/80 mt-0.5">
                Current profit {fmtNum(c.profitPct)}% / {fmtINR(c.netProfit)} is below your minimum threshold of {fmtNum(s.minProfitPct)}% / {fmtINR(s.minProfitAmount)}. Adjust pricing or disable margin lock.
              </div>
            </div>
          </div>
        )}

        {isPastDue && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-semibold">Payment failed.</span> Your workspace is in a grace period — update your card to keep access.
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate({ to: "/app/settings/billing" })}>
              Update payment
            </Button>
          </div>
        )}

        {quoteLimit !== null && (
          <div className={`rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${
            quotesUsed >= quoteLimit ? "border-red-500/40 bg-red-500/10 text-red-200"
              : quotesUsed / quoteLimit >= 0.8 ? "border-gold/40 bg-gold/10 text-gold"
              : "border-border bg-card/60 text-muted-foreground"
          }`}>
            <div className="text-sm">
              <span className="font-semibold">{quotesUsed} / {quoteLimit}</span> quotes used this month on the {ent?.plan === "free" ? "Free" : ent?.plan === "pro" ? "Pro" : "Business"} plan.
              {quotesUsed >= quoteLimit && " Limit reached — saving new quotes is disabled until you upgrade."}
            </div>
            {isFree && (
              <Button size="sm" className="bg-[#A61D24] hover:bg-[#8a181e] text-white" onClick={() => navigate({ to: "/pricing" })}>
                Upgrade
              </Button>
            )}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <TabsList className="lg:hidden grid grid-cols-4 md:grid-cols-8 w-full h-auto p-1.5 rounded-2xl gap-1.5 bg-card border border-border">

            <TabsTrigger value="inputs" className="py-2 px-1 text-xs md:text-sm min-w-0 truncate">
              <span className="md:hidden">1. Inputs</span><span className="hidden md:inline">1. Inputs</span>
            </TabsTrigger>
            <TabsTrigger value="banking" className="py-2 px-1 text-xs md:text-sm min-w-0 truncate">
              <span className="md:hidden">2. Banking</span><span className="hidden md:inline">2. Banking &amp; Forex</span>
            </TabsTrigger>
            <TabsTrigger value="profit" className="py-2 px-1 text-xs md:text-sm min-w-0 truncate">3. Profit</TabsTrigger>
            <TabsTrigger value="incoterms" className="py-2 px-1 text-xs md:text-sm min-w-0 truncate">4. Incoterms</TabsTrigger>
            <TabsTrigger value="negotiation" className="py-2 px-1 text-xs md:text-sm min-w-0 truncate">
              <span className="md:hidden">5. Negotiate</span><span className="hidden md:inline">5. Negotiation</span>
            </TabsTrigger>
            <TabsTrigger value="scenario" className="py-2 px-1 text-xs md:text-sm min-w-0 truncate">
              <span className="md:hidden">6. Scenario</span><span className="hidden md:inline">6. Scenarios</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="py-2 px-1 text-xs md:text-sm min-w-0 truncate">7. Audit</TabsTrigger>
            <TabsTrigger value="market-intel" className="py-2 px-1 text-xs md:text-sm min-w-0 truncate">8. Market</TabsTrigger>
            <TabsTrigger value="admin" className="py-2 px-1 text-xs md:text-sm min-w-0 truncate">9. Admin</TabsTrigger>
          </TabsList>


          {/* INPUTS — accordion grouping */}
          <TabsContent value="inputs" className="space-y-5">
            {/* Always-visible essentials */}
            <GroupCard icon={Package} title="Shipment details" subtitle="Start here — buyer and product information">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <TextField label="Quotation number" value={s.quotationNumber} onChange={(v) => set("quotationNumber", v)} />
                <TextField label="Quotation date" value={s.quotationDate} onChange={(v) => set("quotationDate", v)} type="date" />
                <div className="space-y-1.5">
                  <FieldLabel hint="Trade term that defines who pays for what">Incoterm</FieldLabel>
                  <Select value={s.incoterm} onValueChange={(v) => set("incoterm", v as Incoterm)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXW">EXW — Ex Works</SelectItem>
                      <SelectItem value="FOB">FOB — Free on Board</SelectItem>
                      <SelectItem value="CFR">CFR — Cost & Freight</SelectItem>
                      <SelectItem value="CIF">CIF — Cost, Insurance & Freight</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel hint="The only currency shown on buyer-facing quotations">Contract currency</FieldLabel>
                  <Select value={s.contractCurrency} onValueChange={(v) => set("contractCurrency", v as ContractCurrency)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>{(["USD", "EUR", "GBP", "AED"] as const).map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <TextField label="Buyer company" value={s.buyerCompany} onChange={(v) => set("buyerCompany", v)} placeholder="ABC Trading Ltd." />
                <TextField label="Buyer contact name" value={s.buyerName} onChange={(v) => set("buyerName", v)} />
                <div className="space-y-1.5">
                  <FieldLabel hint="Pick from list to enable destination duty lookup & country risk">Buyer country</FieldLabel>
                  <Select
                    value={(findCountryByName(s.buyerCountry)?.code) || ""}
                    onValueChange={(code) => {
                      const c = COUNTRIES.find((x) => x.code === code);
                      if (c) set("buyerCountry", c.name);
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={s.buyerCountry || "Select country"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name} — <span className={c.riskLevel === "Low" ? "text-success" : c.riskLevel === "Medium" ? "text-warning" : "text-deep-red"}>{c.riskLevel} risk</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(() => {
                    const ci = findCountryByName(s.buyerCountry);
                    if (!ci) return <p className="text-xs text-muted-foreground">Free-text countries work too — pick from list for duty & risk data.</p>;
                    const tone = ci.riskLevel === "Low" ? "bg-success/15 text-success" : ci.riskLevel === "Medium" ? "bg-warning/15 text-warning" : "bg-deep-red/15 text-deep-red";
                    return (
                      <div className={`mt-1 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${tone}`}>
                        {ci.riskLevel} risk — <span className="font-normal opacity-80">{ci.riskNotes}</span>
                      </div>
                    );
                  })()}
                </div>
                <TextField label="Buyer email" value={s.buyerEmail} onChange={(v) => set("buyerEmail", v)} type="email" />
                <TextField label="Buyer website" value={s.buyerWebsite} onChange={(v) => set("buyerWebsite", v)} placeholder="https://abctrading.com" />
                <TextField label="Buyer phone" value={s.buyerPhone} onChange={(v) => set("buyerPhone", v)} placeholder="+49 30 1234567" />
                <TextField label="Buyer address" value={s.buyerAddress} onChange={(v) => set("buyerAddress", v)} placeholder="Street, City, Country" />
                <HsProductSearch
                  productName={s.productName}
                  hsCode={s.hsCode}
                  onPick={(entry) => {
                    set("productName", entry.name);
                    set("hsCode", entry.hsCode);
                    set("rodtepPct", entry.rodtepPct);
                    set("dutyDrawbackPct", entry.dutyDrawbackPct);
                    toast.success(`Loaded ${entry.name}: HS ${entry.hsCode} · RoDTEP ${entry.rodtepPct}% · Drawback ${entry.dutyDrawbackPct}%`);
                  }}
                  onChangeProductName={(v) => set("productName", v)}
                  onChangeHs={(v) => set("hsCode", v)}
                />
                <GradeField hsCode={s.hsCode} productName={s.productName} value={s.productGrade} onChange={(v) => set("productGrade", v)} />
                <NumField label="Quantity" value={s.quantity} onChange={(v) => set("quantity", v)} hint="Total quantity in selected UoM" />
                <TextField label="Unit of measure" value={s.uom} onChange={(v) => set("uom", v)} placeholder="KG" />
              </div>
              <DestinationDutyCard country={s.buyerCountry} hsCode={s.hsCode} />
            </GroupCard>


            <PlanLock
              requiredPlan="pro"
              featureName="Market Intelligence"
              description="See live procurement benchmarks, mandi rates and margin guidance for your product."
              locked={!miAllowed}
            >
              <MarketIntelligence
                productName={s.productName}
                supplierPricePerKg={s.supplierPricePerUnit}
                uom={s.uom}
              />
            </PlanLock>

            <GroupCard icon={Coins} title="Product cost" subtitle="What you pay your supplier — the foundation of pricing">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <NumField label="Supplier price / unit" value={s.supplierPricePerUnit} onChange={(v) => set("supplierPricePerUnit", v)} suffix="₹" hint="Cost per unit from your supplier" />
                <NumField label="Quantity" value={s.quantity} onChange={(v) => set("quantity", v)} />
                <NumField label="Total supplier cost" value={c.supplierTotal} onChange={() => {}} readOnly suffix="₹" />
              </div>
            </GroupCard>

            {/* Optional cost groups — collapsed by default */}
            <Card className="p-2 sm:p-3 shadow-sm">
              <div className="px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Additional cost categories</span> — expand only the ones relevant to your shipment
              </div>
              <div className="mx-3 mb-2 rounded-md border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-foreground/80">
                <strong>Cost basis:</strong> supplier price is per {s.uom || "unit"}. Every field below is a <strong>total for the entire shipment</strong> and is divided by {fmtNum(s.quantity, 0)} {s.uom || "units"} automatically.
              </div>
              <Accordion type="multiple" className="w-full">
                <AccItem value="packaging" icon={Package} title="Packaging" summary={fmtINR(c.packagingTotal)}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <NumField label="Pouches — shipment total" value={s.pouchCost} onChange={(v) => set("pouchCost", v)} suffix="₹" />
                    <NumField label="Labels — shipment total" value={s.labelCost} onChange={(v) => set("labelCost", v)} suffix="₹" />
                    <NumField label="Cartons — shipment total" value={s.cartonCost} onChange={(v) => set("cartonCost", v)} suffix="₹" />
                    <NumField label="Pallets — shipment total" value={s.palletCost} onChange={(v) => set("palletCost", v)} suffix="₹" />
                    <NumField label="Other — shipment total" value={s.otherPackaging} onChange={(v) => set("otherPackaging", v)} suffix="₹" />
                    <NumField label="Packaging — shipment total" value={c.packagingTotal} onChange={() => {}} readOnly suffix="₹" />
                  </div>
                </AccItem>

                <AccItem value="inland" icon={Truck} title="Inland logistics" summary={fmtINR(c.inlandTotal)}>
                  <div className="grid grid-cols-2 gap-4">
                    <NumField label="Factory → warehouse — total" value={s.factoryToWarehouse} onChange={(v) => set("factoryToWarehouse", v)} suffix="₹" />
                    <NumField label="Warehouse → port — total" value={s.warehouseToPort} onChange={(v) => set("warehouseToPort", v)} suffix="₹" />
                    <NumField label="Loading — shipment total" value={s.loadingCharges} onChange={(v) => set("loadingCharges", v)} suffix="₹" />
                    <NumField label="Unloading — shipment total" value={s.unloadingCharges} onChange={(v) => set("unloadingCharges", v)} suffix="₹" />
                  </div>
                </AccItem>

                <AccItem value="docs" icon={FileText} title="Documentation & certification" summary={fmtINR(c.documentationTotal)}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <NumField label="Certificate of origin" value={s.certificateOfOrigin} onChange={(v) => set("certificateOfOrigin", v)} suffix="₹" />
                    <NumField label="Phytosanitary" value={s.phytosanitary} onChange={(v) => set("phytosanitary", v)} suffix="₹" />
                    <NumField label="Fumigation" value={s.fumigation} onChange={(v) => set("fumigation", v)} suffix="₹" />
                    <NumField label="Lab testing" value={s.labTesting} onChange={(v) => set("labTesting", v)} suffix="₹" />
                    <NumField label="Export docs" value={s.exportDocs} onChange={(v) => set("exportDocs", v)} suffix="₹" />
                    <NumField label="Other certification" value={s.otherCertification} onChange={(v) => set("otherCertification", v)} suffix="₹" />
                  </div>
                </AccItem>

                <AccItem value="port" icon={Anchor} title="Customs & port charges" summary={fmtINR(c.customsTotal)}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <NumField label="CHA charges" value={s.chaCharges} onChange={(v) => set("chaCharges", v)} suffix="₹" />
                    <NumField label="Port handling" value={s.portHandling} onChange={(v) => set("portHandling", v)} suffix="₹" />
                    <NumField label="Terminal handling" value={s.terminalHandling} onChange={(v) => set("terminalHandling", v)} suffix="₹" />
                    <NumField label="Customs clearance" value={s.customsClearance} onChange={(v) => set("customsClearance", v)} suffix="₹" />
                    <NumField label="Container handling" value={s.containerHandling} onChange={(v) => set("containerHandling", v)} suffix="₹" />
                  </div>
                </AccItem>

                <AccItem value="freight" icon={Ship} title="Freight forwarding" summary={fmtINR(c.freightTotal)}>
                  <div className="grid grid-cols-2 gap-4">
                    <NumField label="Ocean freight" value={s.oceanFreight} onChange={(v) => set("oceanFreight", v)} suffix="₹" />
                    <NumField label="Air freight" value={s.airFreight} onChange={(v) => set("airFreight", v)} suffix="₹" />
                    <NumField label="Forwarder fee" value={s.freightForwarderFee} onChange={(v) => set("freightForwarderFee", v)} suffix="₹" />
                    <NumField label="Local destination" value={s.localDestination} onChange={(v) => set("localDestination", v)} suffix="₹" />
                  </div>
                  <PortWeatherCard />
                </AccItem>

                <AccItem value="insurance" icon={ShieldCheck} title="Insurance" summary={fmtINR(c.insuranceTotal)}>
                  <div className="grid grid-cols-2 gap-4">
                    <NumField label="Cargo insurance" value={s.cargoInsurance} onChange={(v) => set("cargoInsurance", v)} suffix="₹" />
                  </div>
                </AccItem>

                {/* Legacy "Banking costs" inputs removed. Banking is now auto-calculated
                    in the Banking & Forex tab from Axis Bank tariffs + payment method. */}



                <AccItem value="misc" icon={Wallet} title="Miscellaneous & contingency" summary={`${fmtINR(c.miscTotal)} + ${fmtNum(s.contingencyPct)}%`}>
                  <div className="grid grid-cols-2 gap-4">
                    <NumField label="Miscellaneous cost" value={s.miscCost} onChange={(v) => set("miscCost", v)} suffix="₹" />
                    <NumField label="Contingency buffer" value={s.contingencyPct} onChange={(v) => set("contingencyPct", v)} suffix="%" step={0.1} hint="Safety margin added to total cost" />
                    <NumField label="Contingency amount" value={c.contingencyAmount} onChange={() => {}} readOnly suffix="₹" />
                  </div>
                </AccItem>

                <AccItem value="incentives" icon={Sparkles} title="Export incentives" summary={`− ${fmtINR(c.incentiveValue)}`}>
                  <div className="grid grid-cols-2 gap-4">
                    <NumField label="RoDTEP %" value={s.rodtepPct} onChange={(v) => set("rodtepPct", v)} suffix="%" step={0.1} hint="Remission of Duties and Taxes on Exported Products" />
                    <NumField label="Duty drawback %" value={s.dutyDrawbackPct} onChange={(v) => set("dutyDrawbackPct", v)} suffix="%" step={0.1} />
                    <NumField label="Other incentives" value={s.otherIncentives} onChange={(v) => set("otherIncentives", v)} suffix="₹" />
                    <NumField label="Total incentive value" value={c.incentiveValue} onChange={() => {}} readOnly suffix="₹" />
                  </div>
                </AccItem>

                <AccItem value="forex" icon={Globe2} title="Currency & forex protection" summary={`${s.contractCurrency} market ${fmtNum(getMarketRate(s.contractCurrency, s))} / bank ${fmtNum(getActualBankRate(s.contractCurrency, s))}`}>
                  {(() => {
                    const cc = s.contractCurrency;
                    const marketKey = `market${cc.charAt(0)}${cc.slice(1).toLowerCase()}Rate` as
                      | "marketUsdRate" | "marketEurRate" | "marketGbpRate" | "marketAedRate";
                    const bankKey = `actualBank${cc.charAt(0)}${cc.slice(1).toLowerCase()}Rate` as
                      | "actualBankUsdRate" | "actualBankEurRate" | "actualBankGbpRate" | "actualBankAedRate";
                    const fetchLive = async () => {
                      try {
                        toast.loading(`Fetching live ${cc}/INR rate…`, { id: "fx" });
                        const r = await fetch(`https://open.er-api.com/v6/latest/${cc}`);
                        const j = await r.json();
                        const rate = j?.rates?.INR;
                        if (!rate || typeof rate !== "number") throw new Error("No INR rate in response");
                        const rounded = Math.round(rate * 100) / 100;
                        const bankRate = bankRateFromMarket(rounded, s.bankingTariff.forex_spread_percent);
                        setS((prev) => ({ ...prev, [marketKey]: rounded, [bankKey]: bankRate }));
                        const ts = j?.time_last_update_utc ? new Date(j.time_last_update_utc).toISOString() : new Date().toISOString();
                        set("fxLastUpdated", ts);
                        toast.success(`Live ${cc}/INR = ₹${rounded}; bank rate = ₹${bankRate}`, { id: "fx" });
                      } catch (e) {
                        toast.error(`Could not fetch live ${cc} rate. Enter manually.`, { id: "fx" });
                      }
                    };
                    const fetchAll = async () => {
                      try {
                        toast.loading("Fetching all 4 FX rates…", { id: "fxall" });
                        const r = await fetch(`https://open.er-api.com/v6/latest/INR`);
                        const j = await r.json();
                        const rates = j?.rates;
                        if (!rates) throw new Error("No rates");
                        const pairs: Array<[ContractCurrency, "marketUsdRate" | "marketEurRate" | "marketGbpRate" | "marketAedRate"]> = [
                          ["USD", "marketUsdRate"], ["EUR", "marketEurRate"], ["GBP", "marketGbpRate"], ["AED", "marketAedRate"],
                        ];
                        for (const [code, key] of pairs) {
                          const inrPer = rates[code] ? 1 / rates[code] : null;
                          if (inrPer) {
                            const marketRate = Math.round(inrPer * 100) / 100;
                            const actualKey = `actualBank${code.charAt(0)}${code.slice(1).toLowerCase()}Rate` as
                              | "actualBankUsdRate" | "actualBankEurRate" | "actualBankGbpRate" | "actualBankAedRate";
                            setS((prev) => ({ ...prev, [key]: marketRate, [actualKey]: bankRateFromMarket(marketRate, prev.bankingTariff.forex_spread_percent) }));
                          }
                        }
                        const ts = j?.time_last_update_utc ? new Date(j.time_last_update_utc).toISOString() : new Date().toISOString();
                        set("fxLastUpdated", ts);
                        toast.success("Updated USD, EUR, GBP & AED market rates", { id: "fxall" });
                      } catch {
                        toast.error("Could not fetch live rates", { id: "fxall" });
                      }
                    };
                    return (
                      <>
                        <div className="mb-4 flex items-center justify-between gap-3 rounded-md bg-primary/5 px-3 py-2 text-xs">
                          <span className="text-foreground/80">
                            Only the selected contract currency (<strong>{cc}</strong>) is editable. Change it in the Buyer & Product tab to switch.
                          </span>
                          <div className="flex gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={fetchLive}>
                              <Globe2 className="w-3.5 h-3.5 mr-1.5" /> Fetch {cc}
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={fetchAll}>
                              <Globe2 className="w-3.5 h-3.5 mr-1.5" /> Fetch all 4
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <NumField label={`Actual bank ${cc} rate`} value={s[bankKey]} onChange={(v) => set(bankKey, v)} step={0.01} suffix="₹" hint="Rate your bank actually credits — typically lower than market" />
                          <NumField label={`Market ${cc} rate`} value={s[marketKey]} onChange={(v) => set(marketKey, v)} step={0.01} suffix="₹" hint="Click Fetch live rate to auto-fill today's market rate" />
                          <NumField label="Forex risk buffer" value={s.forexBufferPct} onChange={(v) => set("forexBufferPct", v)} step={0.1} suffix="%" />
                          <NumField label="Forex exposure (informational)" value={calculateForexExposure(c.expectedRevenue, s)} onChange={() => {}} readOnly suffix="₹" />
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground italic">
                          Selected {cc}: market ₹{fmtNum(getMarketRate(cc, s))}, bank ₹{fmtNum(getActualBankRate(cc, s))}.
                          {s.fxLastUpdated ? ` Live rate as of ${new Date(s.fxLastUpdated).toLocaleString()}.` : " ⚠ No live rate fetched yet — using stored value."}
                          {" "}Forex is informational and never changes core INR pricing unless entered as a banking cost.
                        </p>
                      </>
                    );
                  })()}
                </AccItem>

              </Accordion>
            </Card>

            <GroupCard icon={Globe2} title="Shipment & logistics" subtitle="Ports, origin and lead time printed on Quotation, Proforma, Commercial Invoice & Packing List">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Port of Loading" value={s.portOfLoading} onChange={(v) => set("portOfLoading", v)} placeholder="e.g. INNSA – Nhava Sheva / INMAA – Chennai" />
                <TextField label="Port of Discharge" value={s.portOfDischarge} onChange={(v) => set("portOfDischarge", v)} placeholder="e.g. GBFXT – Felixstowe / DEHAM – Hamburg" />
                <TextField label="Country of Origin" value={s.countryOfOrigin} onChange={(v) => set("countryOfOrigin", v)} placeholder="India" />
                <NumField label="Shipment lead time" value={s.shipmentLeadTimeDays} onChange={(v) => set("shipmentLeadTimeDays", v)} suffix="days" hint="Days from PO confirmation to ready-for-shipment" />
                <TextField label="Vessel / Flight" value={s.vesselFlight} onChange={(v) => set("vesselFlight", v)} placeholder="(once booked)" />
                <TextField label="B/L or AWB number" value={s.blAwbNumber} onChange={(v) => set("blAwbNumber", v)} placeholder="(once issued)" />
                <TextField label="Container number" value={s.containerNo} onChange={(v) => set("containerNo", v)} placeholder="e.g. MSCU1234567" />
                <TextField label="Seal number" value={s.sealNo} onChange={(v) => set("sealNo", v)} placeholder="(once sealed at CFS)" />
                <div className="sm:col-span-2">
                  <TextField label="Notify party (full address)" value={s.notifyParty} onChange={(v) => set("notifyParty", v)} placeholder="Leave blank to print 'Same as Consignee'" />
                </div>
              </div>
            </GroupCard>

            <GroupCard icon={FileText} title="Packaging detail" subtitle="Printed on Packing List & Commercial Invoice — required for customs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Packaging type" value={s.packageType} onChange={(v) => set("packageType", v)} placeholder="e.g. PP woven bags, Jute bags, Cartons" />
                <TextField label="Dimensions per package (cm)" value={s.packageDimensionsCm} onChange={(v) => set("packageDimensionsCm", v)} placeholder="L x W x H, e.g. 60 x 40 x 25" />
                <NumField label="Packages count (override)" value={s.packagesCountOverride} onChange={(v) => set("packagesCountOverride", v)} hint="Leave 0 to auto-calculate from quantity ÷ net wt per pkg" />
                <NumField label="Net weight per package (kg)" value={s.netWeightPerPackageKg} onChange={(v) => set("netWeightPerPackageKg", v)} suffix="kg" hint="0 = default 25 kg/pkg" />
                <div className="sm:col-span-2">
                  <TextField label="Marks & Numbers" value={s.marksAndNumbers} onChange={(v) => set("marksAndNumbers", v)} placeholder="e.g. VX/PEPPER/UK/2026 — 1 of 40" hint="Identifying marks stencilled on each package for customs correlation" />
                </div>
              </div>
            </GroupCard>

            <GroupCard icon={FileText} title="Quality specification" subtitle="Printed on Sales Contract & Purchase Order">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Quality standard" value={s.qualityStandard} onChange={(v) => set("qualityStandard", v)} placeholder="e.g. AGMARK Special / ASTA cleanliness / FSSAI" />
                <NumField label="Max moisture %" value={s.qualityMoisturePct} onChange={(v) => set("qualityMoisturePct", v)} suffix="%" />
                <TextField label="Active compound (label)" value={s.qualityActiveCompoundLabel} onChange={(v) => set("qualityActiveCompoundLabel", v)} placeholder="e.g. Piperine, Curcumin, Capsaicin" />
                <NumField label="Min active compound %" value={s.qualityActiveCompoundPct} onChange={(v) => set("qualityActiveCompoundPct", v)} suffix="%" />
                <NumField label="Max admixture %" value={s.qualityAdmixturePct} onChange={(v) => set("qualityAdmixturePct", v)} suffix="%" />
                <TextField label="Bulk density" value={s.qualityBulkDensity} onChange={(v) => set("qualityBulkDensity", v)} placeholder="e.g. 550 g/L" />
                <div className="sm:col-span-2">
                  <TextField label="Additional quality notes" value={s.qualityNotes} onChange={(v) => set("qualityNotes", v)} placeholder="e.g. Pesticide residues per EU MRL; aflatoxin < 5 ppb" />
                </div>
              </div>
            </GroupCard>

            <GroupCard icon={Landmark} title="Supplier profile (for Purchase Order)" subtitle="Required to issue PO to your domestic supplier under GST">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Supplier name" value={s.supplierName} onChange={(v) => set("supplierName", v)} placeholder="e.g. Qualfis Foodz Pvt Ltd" />
                <TextField label="Supplier address" value={s.supplierAddress} onChange={(v) => set("supplierAddress", v)} />
                <TextField label="Supplier GSTIN" value={s.supplierGstin} onChange={(v) => set("supplierGstin", v)} placeholder="15-digit GSTIN" />
                <TextField label="Contact person" value={s.supplierContact} onChange={(v) => set("supplierContact", v)} />
                <TextField label="Supplier email" value={s.supplierEmail} onChange={(v) => set("supplierEmail", v)} type="email" />
                <TextField label="Supplier phone" value={s.supplierPhone} onChange={(v) => set("supplierPhone", v)} />
                <TextField label="Payment terms" value={s.supplierPaymentTerms} onChange={(v) => set("supplierPaymentTerms", v)} placeholder="e.g. Net 30 days from invoice receipt" />
                <TextField label="Required delivery date" value={s.supplierDeliveryDate} onChange={(v) => set("supplierDeliveryDate", v)} placeholder="DD-MMM-YYYY" />
                <TextField label="Place of supply (GST)" value={s.supplierPlaceOfSupply} onChange={(v) => set("supplierPlaceOfSupply", v)} placeholder="State name + GST state code, e.g. Karnataka (29)" />
                <NumField label="GST rate %" value={s.supplierGstRate} onChange={(v) => set("supplierGstRate", v)} suffix="%" hint="e.g. 5 for most spices, 12/18 for processed goods" />
                <div className="space-y-1.5">
                  <FieldLabel>GST type</FieldLabel>
                  <Select value={s.supplierGstType} onValueChange={(v) => set("supplierGstType", v as "IGST" | "CGST_SGST" | "NONE")}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CGST_SGST">CGST + SGST (intra-state)</SelectItem>
                      <SelectItem value="IGST">IGST (inter-state)</SelectItem>
                      <SelectItem value="NONE">No GST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </GroupCard>
          </TabsContent>

          {/* PROFIT ENGINE */}
          <TabsContent value="profit" className="space-y-5">
            <GroupCard icon={ShieldCheck} title="Profit control" subtitle="Set your target and minimum margins — the engine protects you">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <NumField label="Target profit %" value={s.targetProfitPct} onChange={(v) => set("targetProfitPct", v)} suffix="%" step={0.5} hint="The margin you'd like to achieve" />
                <NumField label="Minimum profit %" value={s.minProfitPct} onChange={(v) => set("minProfitPct", v)} suffix="%" step={0.5} hint="The lowest margin you'll accept" />
                <NumField label="Minimum profit amount" value={s.minProfitAmount} onChange={(v) => set("minProfitAmount", v)} suffix="₹" />
                <NumField label="Container size" value={s.containerKg} onChange={(v) => set("containerKg", v)} suffix="kg" />
              </div>

              <div className="rounded-lg border bg-secondary/40 p-4 flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  <ShieldCheck className="w-5 h-5 text-gold shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">Margin Protection Lock</div>
                    <div className="text-xs text-muted-foreground">Blocks PDF generation if profit falls below your minimum</div>
                  </div>
                </div>
                <Switch checked={s.marginLock} onCheckedChange={(v) => set("marginLock", v)} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <KPI label="Total cost" value={fmtINR(c.totalCost)} />
                <KPI label="Effective cost" value={fmtINR(c.effectiveCost)} sub={`− ${fmtINR(c.incentiveValue)} incentives`} />
                <KPI label="Protected cost" value={fmtINR(c.protectedCost)} sub={`+ ${fmtINR(c.contingencyAmount + c.forexBufferAmount)} buffers`} />
                <KPI label="Break-even price" value={fmtINR(c.breakEvenPrice)} sub={`${fmtContract(c.breakEvenPrice)} / unit`} />
                <KPI label="Target selling price" value={fmtINR(c.targetSellingPrice)} sub={`${fmtContract(c.targetSellingPrice)} / unit`} tone="gold" />
                <KPI label="Net profit" value={fmtINR(c.netProfit)} tone={c.profitPct > 15 ? "green" : c.profitPct >= 8 ? "warn" : "red"} />
                <KPI label="Profit %" value={`${fmtNum(c.profitPct)}%`} tone={c.profitPct > 15 ? "green" : c.profitPct >= 8 ? "warn" : "red"} />
                <KPI label="Profit / unit" value={fmtINR(c.profitPerUnit)} />
                {s.uom.toUpperCase().includes("KG") && <KPI label="Profit / kg" value={fmtINR(c.profitPerKg)} />}
                {c.showFullContainerProjection ? (
                  <KPI label="Projected profit at full container load" value={fmtINR(c.projectedProfitAtFullContainer)} sub={`${fmtNum(s.containerKg, 0)} kg projection; shipment is ${fmtNum(s.quantity, 0)} kg`} />
                ) : (
                  <KPI label="Profit / shipment container" value={fmtINR(c.netProfit)} sub={`${fmtNum(s.containerKg, 0)} kg`} />
                )}
                <KPI label="Margin safety" value={`${fmtNum(c.marginSafetyScore, 0)} / 100`} />
                <KPI label="Risk level" value={c.riskLevel} tone={c.riskLevel === "Low" ? "green" : c.riskLevel === "Medium" ? "warn" : "red"} />
              </div>
            </GroupCard>

            <GroupCard title="Profit waterfall (per unit)" subtitle="How your selling price breaks down into costs and profit">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterfall}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tickFormatter={(v) => `₹${v.toFixed(0)}`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmtINR(v)} />
                    <Bar dataKey="value">
                      {waterfall.map((w, i) => <Cell key={i} fill={w.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GroupCard>
          </TabsContent>

          {/* INCOTERMS */}
          <TabsContent value="incoterms" className="space-y-5">
            <GroupCard icon={Ship} title="Incoterm pricing" subtitle="Selling prices across all four common Incoterms">
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-gold/30 bg-gold/5">
                      <th className="text-left p-3 font-semibold">Incoterm</th>
                      <th className="text-right p-3 font-semibold">Unit price ({s.contractCurrency})</th>
                      <th className="text-right p-3 font-semibold">Contract value ({s.contractCurrency})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "EXW", price: c.exwPrice, desc: "Ex Works (factory gate)" },
                      { name: "FOB", price: c.fobPrice, desc: "Free On Board (port of loading)" },
                      { name: "CFR", price: c.cfrPrice, desc: "Cost & Freight (port of destination)" },
                      { name: "CIF", price: c.cifPrice, desc: "Cost, Insurance & Freight" },
                    ].map((row) => (
                      <tr key={row.name} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold">{row.name}</div>
                          <div className="text-xs text-muted-foreground">{row.desc}</div>
                        </td>
                        <td className="p-3 text-right tabular-nums font-semibold">{fmtContract(row.price)}</td>
                        <td className="p-3 text-right tabular-nums">{fmtCurrency(getBuyerQuote(row.price, s.quantity, s).totalContractValue, s.contractCurrency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GroupCard>

            <GroupCard icon={FileText} title="Document preview" subtitle={`Live preview of the ${DOC_TYPES.find(d => d.value === docType)?.label}`}>
              <div className="-mx-3 sm:mx-0 overflow-x-auto">
                <div className="min-w-[720px] sm:min-w-0">
                  <DocumentPreview s={s} priceINR={incotermPrice} docType={docType} />
                </div>
              </div>
            </GroupCard>
          </TabsContent>

          {/* NEGOTIATION */}
          <TabsContent value="negotiation" className="space-y-5">
            <GroupCard icon={TrendingUp} title="Negotiation thresholds" subtitle="Know exactly when to say yes, push back, or walk away">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <KPI label="Min EXW" value={fmtContract(c.minExw)} tone="warn" />
                <KPI label="Min FOB" value={fmtContract(c.minFob)} tone="warn" />
                <KPI label="Min CFR" value={fmtContract(c.minCfr)} tone="warn" />
                <KPI label="Min CIF" value={fmtContract(c.minCif)} tone="warn" />
                <KPI label="Walk-away FOB" value={fmtContract(c.walkFob)} tone="red" />
                <KPI label="Walk-away CFR" value={fmtContract(c.walkCfr)} tone="red" />
                <KPI label="Walk-away CIF" value={fmtContract(c.walkCif)} tone="red" />
                <KPI label={`Recommended ${s.incoterm}`} value={fmtContract(incotermPrice)} tone="gold" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="rounded-lg border p-5 space-y-4">
                  <div className="flex items-center gap-2 font-semibold"><TrendingUp className="w-4 h-4 text-gold" />Counter-offer check</div>
                  <p className="text-xs text-muted-foreground -mt-2">Enter what the buyer is proposing — we'll tell you if it's acceptable.</p>
                  <NumField label={`Buyer counter offer (${s.contractCurrency} / unit)`} value={s.buyerCounterOffer} onChange={(v) => set("buyerCounterOffer", v)} step={0.01} />
                  <div className="space-y-2 text-sm">
                    <Row label="Counter offer" value={fmtCurrency(s.buyerCounterOffer, s.contractCurrency)} />
                    <Row label="Minimum acceptable" value={fmtContract(minIncotermPrice)} />
                    <Row label="Price gap" value={fmtContract(counterINR - minIncotermPrice)} tone={counterINR >= minIncotermPrice ? "green" : "red"} />
                    <Row label="Net profit at counter (internal)" value={fmtINR(counterEvaluation.profit)} />
                    <Row label="Profit % at counter" value={`${fmtNum(counterEvaluation.profitPct)}%`} />
                  </div>
                  <div className={"rounded-md p-3 font-semibold text-sm " + (counterAcceptable ? "bg-success/10 text-success" : "bg-deep-red/10 text-deep-red")}>
                    {counterAcceptable ? "✓ Acceptable — above minimum threshold" : "✗ Reject — below profit requirement"}
                  </div>
                </div>

                <div className="rounded-lg border p-5 space-y-4">
                  <div className="flex items-center gap-2 font-semibold"><Sparkles className="w-4 h-4 text-gold" />Discount check</div>
                  <p className="text-xs text-muted-foreground -mt-2">Test how a percentage discount affects your profit.</p>
                  <NumField label="Requested discount %" value={s.requestedDiscountPct} onChange={(v) => set("requestedDiscountPct", v)} step={0.5} suffix="%" />
                  <div className="space-y-2 text-sm">
                    <Row label={`Original ${s.incoterm}`} value={fmtContract(incotermPrice)} />
                    <Row label={`Discounted ${s.incoterm}`} value={fmtContract(discountedPrice)} tone={discountAcceptable ? "green" : "red"} />
                    <Row label="New profit / unit (internal)" value={fmtINR(discountEvaluation.profitPerUnit)} />
                    <Row label="New profit %" value={`${fmtNum(discountEvaluation.profitPct)}%`} />
                  </div>
                  <div className={"rounded-md p-3 text-sm " + (discountAcceptable ? "bg-success/10 text-success" : "bg-deep-red/10 text-deep-red")}>
                    {discountAcceptable
                      ? "Discount acceptable. Projected profit remains above minimum."
                      : "Discount not recommended. Profit falls below required threshold."}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-lg border bg-secondary/30 p-5">
                <div className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-deep-red" />Decision summary</div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                  <Row label="Recommended" value={fmtContract(incotermPrice)} />
                  <Row label="Target" value={fmtContract(c.targetSellingPrice)} />
                  <Row label="Minimum acceptable" value={fmtContract(minIncotermPrice)} tone="warn" />
                  <Row label="Walk away" value={fmtContract(walkPrice)} tone="red" />
                  <Row label="Expected profit" value={fmtINR(c.netProfit)} tone={c.profitPct > 15 ? "green" : c.profitPct >= 8 ? "warn" : "red"} />
                  <Row label="Profit %" value={`${fmtNum(c.profitPct)}%`} />
                  <Row label="Risk level" value={c.riskLevel} />
                  <Row label="Deal quality" value={`${c.dealQualityScore} / 100`} tone={c.dealQualityScore >= 75 ? "green" : c.dealQualityScore >= 60 ? "warn" : "red"} />
                </div>
              </div>
            </GroupCard>
          </TabsContent>

          {/* SCENARIOS */}
          <TabsContent value="scenario" className="space-y-5">
            <GroupCard icon={Sparkles} title="What-if scenarios" subtitle="See how profit changes when costs or rates move">
              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  { id: "base", label: "Base case" },
                  { id: "freight+10", label: "Freight +10%" },
                  { id: "freight+20", label: "Freight +20%" },
                  { id: "usd-2", label: "USD drops 2%" },
                  { id: "usd-5", label: "USD drops 5%" },
                  { id: "packaging+5", label: "Packaging +5%" },
                  { id: "bank-2", label: "Bank rate −2%" },
                ].map((b) => (
                  <Button key={b.id} size="sm" variant={scenario === b.id ? "default" : "outline"}
                    onClick={() => setScenario(b.id)}
                    className={scenario === b.id ? "bg-primary text-primary-foreground" : ""}>
                    {b.label}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KPI label="Profit (scenario)" value={fmtINR(sc.netProfit)} tone={sc.profitPct > 15 ? "green" : sc.profitPct >= 8 ? "warn" : "red"} />
                <KPI label="Margin %" value={`${fmtNum(sc.profitPct)}%`} tone={sc.profitPct > 15 ? "green" : sc.profitPct >= 8 ? "warn" : "red"} />
                <KPI label="Break-even" value={fmtINR(sc.breakEvenPrice)} />
                <KPI label="FOB" value={fmtINR(sc.fobPrice)} />
                <KPI label="CIF" value={fmtINR(sc.cifPrice)} />
                <KPI label="Δ vs base" value={fmtINR(profitVariance(c, sc))} tone={sc.netProfit >= c.netProfit ? "green" : "red"} />
              </div>

              <div className="mt-6 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { name: "Base", profit: c.netProfit, margin: c.profitPct },
                    { name: "Scenario", profit: sc.netProfit, margin: sc.profitPct },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="l" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="r" orientation="right" tickFormatter={(v) => `${v.toFixed(0)}%`} />
                    <Tooltip />
                    <Line yAxisId="l" type="monotone" dataKey="profit" stroke="var(--gold)" strokeWidth={2} />
                    <Line yAxisId="r" type="monotone" dataKey="margin" stroke="var(--deep-red)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GroupCard>
          </TabsContent>

          <TabsContent value="audit" className="space-y-5">
            <GroupCard icon={History} title="Saved quotations" subtitle="Snapshots captured each time you Save. Load to re-open or duplicate for a revision.">
              {savedQuotes.length === 0 ? (
                <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                  No saved quotations yet. Click <strong className="text-foreground">Save</strong> in the header to capture a snapshot.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[760px]">
                    <thead>
                      <tr className="border-b bg-secondary/50 text-left">
                        <th className="p-3">Quote #</th>
                        <th className="p-3">Buyer</th>
                        <th className="p-3">Product</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 text-right">Unit price</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 text-right">Profit</th>
                        <th className="p-3">Saved</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedQuotes.map((q) => (
                        <tr key={q.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-semibold">{q.quotationNumber || "—"}</td>
                          <td className="p-3">{q.buyerCompany || "—"}</td>
                          <td className="p-3 text-muted-foreground">{q.productName || "—"}</td>
                          <td className="p-3 text-right tabular-nums">{fmtNum(q.quantity, 0)} {q.uom}</td>
                          <td className="p-3 text-right tabular-nums">{fmtCurrency(q.unitPrice, q.contractCurrency as ContractCurrency)}</td>
                          <td className="p-3 text-right tabular-nums">{fmtCurrency(q.totalContractValue, q.contractCurrency as ContractCurrency)}</td>
                          <td className={"p-3 text-right tabular-nums font-semibold " + (q.profitPct > 15 ? "text-success" : q.profitPct >= 8 ? "text-warning" : "text-deep-red")}>
                            {fmtINR(q.netProfitINR)} <span className="text-xs opacity-70">({fmtNum(q.profitPct)}%)</span>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">{new Date(q.savedAt).toLocaleString()}</td>
                          <td className="p-3 text-right">
                            <div className="inline-flex gap-1">
                              <Button size="sm" variant="outline" className="h-7" onClick={() => loadSavedQuote(q.id)} title="Load this quotation">
                                <FolderOpen className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7" onClick={() => duplicateSavedQuote(q.id)} title="Duplicate as new revision">
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-deep-red hover:text-deep-red" onClick={() => deleteSavedQuote(q.id)} title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GroupCard>

            <GroupCard icon={FileText} title="Calculation audit report" subtitle="Every value follows one documented formula from the central pricing engine">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <KPI label="Reconciliation" value={c.isConsistent ? "Passed" : "Failed"} tone={c.isConsistent ? "green" : "red"} />
                <KPI label="Expected revenue" value={fmtINR(c.expectedRevenue)} sub="Recommended × quantity" />
                <KPI label="Protected cost" value={fmtINR(c.protectedCost)} />
                <KPI label="Expected profit" value={fmtINR(c.netProfit)} sub="Revenue − protected cost" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead><tr className="border-b bg-secondary/50">
                    <th className="text-left p-3">Stage</th><th className="text-left p-3">Value</th><th className="text-left p-3">Formula used</th><th className="text-right p-3">Result</th>
                  </tr></thead>
                  <tbody>{c.auditRows.map((row) => (
                    <tr key={`${row.section}-${row.name}`} className="border-b">
                      <td className="p-3"><Badge variant="outline">{row.section}</Badge></td>
                      <td className="p-3 font-medium">{row.name}</td>
                      <td className="p-3 text-muted-foreground">{row.formula}</td>
                      <td className="p-3 text-right tabular-nums font-semibold">{row.unit === "%" ? `${fmtNum(row.result)}%` : row.unit === "quantity" ? fmtNum(row.result, 0) : fmtINR(row.result)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </GroupCard>
          </TabsContent>

          {/* BANKING & FOREX */}

          <TabsContent value="banking" className="space-y-5">
            <GroupCard icon={Landmark} title="Payment method" subtitle="Bank charges automatically adjust based on the agreed payment terms">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel hint="Controls which banking charges apply">Payment method</FieldLabel>
                  <Select value={s.paymentMethod} onValueChange={(v) => set("paymentMethod", v as any)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SWIFT">Direct SWIFT Transfer</SelectItem>
                      <SelectItem value="DP">Documents Against Payment (D/P)</SelectItem>
                      <SelectItem value="DA">Documents Against Acceptance (D/A)</SelectItem>
                      <SelectItem value="LC">Letter of Credit (LC)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <NumField label="GST %" value={s.bankingTariff.gst_percent} onChange={(v) => set("bankingTariff", { ...s.bankingTariff, gst_percent: v })} step={0.5} suffix="%" />
                <NumField label="Forex spread %" value={s.bankingTariff.forex_spread_percent} onChange={(v) => set("bankingTariff", { ...s.bankingTariff, forex_spread_percent: v })} step={0.05} suffix="%" hint="Bank's hidden FX margin on conversion" />
                <NumField label="Correspondent bank fee" value={s.bankingTariff.correspondent_bank_fee_usd} onChange={(v) => set("bankingTariff", { ...s.bankingTariff, correspondent_bank_fee_usd: v })} suffix="USD" />
              </div>
            </GroupCard>

            <GroupCard icon={Landmark} title="Banking charges breakdown" subtitle={`Auto-calculated for ${s.paymentMethod === "SWIFT" ? "Direct SWIFT Transfer" : s.paymentMethod === "DP" ? "D/P" : s.paymentMethod === "DA" ? "D/A" : "Letter of Credit"}`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {s.paymentMethod === "SWIFT" && <>
                  <KPI label="Inward remittance" value={fmtINR(c.banking.inwardRemittance)} />
                  <KPI label="Correspondent fee" value={fmtINR(c.banking.correspondentFee)} sub={`${s.bankingTariff.correspondent_bank_fee_usd} USD`} />
                  <KPI label="Forex spread" value={fmtINR(c.banking.forexSpread)} sub={`${fmtNum(s.bankingTariff.forex_spread_percent)}%`} />
                </>}
                {(s.paymentMethod === "DP" || s.paymentMethod === "DA") && <>
                  <KPI label="Export bill collection" value={fmtINR(c.banking.collection)} />
                  <KPI label="Courier" value={fmtINR(c.banking.courier)} />
                  <KPI label="Inward remittance" value={fmtINR(c.banking.inwardRemittance)} />
                  <KPI label="Forex spread" value={fmtINR(c.banking.forexSpread)} />
                </>}
                {s.paymentMethod === "LC" && <>
                  <KPI label="LC advising" value={fmtINR(c.banking.lcAdvising)} sub={s.bankingTariff.is_axis_customer ? "Customer rate" : "Non-customer rate"} />
                  <KPI label="Courier" value={fmtINR(c.banking.courier)} />
                  <KPI label="Negotiation (0.03% min ₹2,000)" value={fmtINR(c.banking.negotiation)} />
                  <KPI label="Inward remittance" value={fmtINR(c.banking.inwardRemittance)} />
                  <KPI label="Forex spread" value={fmtINR(c.banking.forexSpread)} />
                </>}
                <KPI label="Subtotal" value={fmtINR(c.banking.subtotal)} />
                <KPI label={`GST @ ${fmtNum(s.bankingTariff.gst_percent)}%`} value={fmtINR(c.banking.gst)} />
                <KPI label="Total banking charges" value={fmtINR(c.banking.total)} tone="gold" />
              </div>
            </GroupCard>

            <GroupCard icon={Globe2} title="Forex impact" subtitle="Gain or loss from exchange rate movement between expected and actual realization">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <KPI label="Foreign currency amount" value={`${s.contractCurrency} ${fmtNum(c.forex.foreignCurrencyAmount)}`} />
                <KPI label="Expected rate (market)" value={`₹${fmtNum(c.forex.expectedExchangeRate)}`} />
                <KPI label="Actual rate (bank)" value={`₹${fmtNum(c.forex.actualExchangeRate)}`} />
                <KPI label="Forex gain/loss" value={fmtINR(c.forex.forexGainLoss)} tone={c.forex.forexGainLoss >= 0 ? "green" : "red"} />
                <KPI label="Expected INR realization" value={fmtINR(c.forex.expectedInrRealization)} />
                <KPI label="Actual INR realization" value={fmtINR(c.forex.actualInrRealization)} />
                <KPI label="Net profit (before forex)" value={fmtINR(c.netProfit)} />
                <KPI label="Net profit after forex" value={fmtINR(c.forex.netProfitAfterForex)} tone={c.forex.netProfitAfterForex >= c.netProfit ? "green" : "red"} />
              </div>
              <p className="text-xs text-muted-foreground italic">Formula: Forex Gain/Loss = (Actual − Expected) × Foreign Currency Amount. Configure rates under Inputs → Currency & forex protection.</p>
            </GroupCard>

            <GroupCard icon={FileText} title="Cost dashboard" subtitle="Complete cost stack including banking and forex">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <KPI label="Product cost" value={fmtINR(c.supplierTotal)} />
                <KPI label="Packaging" value={fmtINR(c.packagingTotal)} />
                <KPI label="Inland transport" value={fmtINR(c.inlandTotal)} />
                <KPI label="Customs & documentation" value={fmtINR(c.customsTotal + c.documentationTotal)} />
                <KPI label="Freight" value={fmtINR(c.freightTotal)} />
                <KPI label="Insurance" value={fmtINR(c.insuranceTotal)} />
                <KPI label="Banking charges" value={fmtINR(c.bankingTotal)} />
                <KPI label="Forex gain/loss" value={fmtINR(c.forex.forexGainLoss)} tone={c.forex.forexGainLoss >= 0 ? "green" : "red"} />
                <KPI label="Total export cost" value={fmtINR(c.totalCost)} tone="warn" />
                <KPI label="Net profit" value={fmtINR(c.netProfit)} tone={c.profitPct > 15 ? "green" : c.profitPct >= 8 ? "warn" : "red"} />
                <KPI label="Net profit %" value={`${fmtNum(c.profitPct)}%`} tone={c.profitPct > 15 ? "green" : c.profitPct >= 8 ? "warn" : "red"} />
                <KPI label="Break-even export price" value={fmtINR(c.breakEvenPrice)} sub="per unit" />
              </div>
            </GroupCard>
          </TabsContent>

          <TabsContent value="market-intel" className="space-y-5">
            <PlanLock
              requiredPlan="pro"
              featureName="Global Market Intelligence"
              description="AI-ranked signals, dynamic country tracking, and product discovery across global markets."
              locked={!miAllowed}
            >
              <MarketIntelDashboard />
            </PlanLock>
          </TabsContent>

          {/* ADMIN — Banking tariff editor */}
          <TabsContent value="admin" className="space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[#C99A2E]/40 bg-[#FAF5EC] px-4 py-3">
              <div className="text-sm">
                <div className="font-semibold text-[#1A1A1A]">Admin settings</div>
                <div className="text-xs text-muted-foreground">Save changes to company profile, banking and document defaults.</div>
              </div>
              <Button onClick={saveAdminSettings} className="bg-[#A61D24] hover:bg-[#8a181e] text-white">
                <Save className="w-4 h-4 mr-2" />Save settings
              </Button>
            </div>
            <GroupCard icon={Landmark} title="Company profile" subtitle="Appears on every generated document — quotation, invoice, contract">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Company name" value={s.companyName} onChange={(v) => set("companyName", v)} />
                <TextField label="Registered address" value={s.companyAddress} onChange={(v) => set("companyAddress", v)} />
                <TextField label="IEC code" value={s.companyIec} onChange={(v) => set("companyIec", v)} placeholder="10-digit IEC issued by DGFT" />
                <TextField label="GSTIN" value={s.companyGstin} onChange={(v) => set("companyGstin", v)} placeholder="15-digit GSTIN" />
                <TextField label="FSSAI licence" value={s.companyFssai} onChange={(v) => set("companyFssai", v)} placeholder="14-digit FSSAI (when available)" />
                <TextField label="PAN" value={s.companyPan} onChange={(v) => set("companyPan", v)} placeholder="10-char PAN" />
                <TextField label="Website" value={s.companyWebsite} onChange={(v) => set("companyWebsite", v)} placeholder="www.vaaldrin.com" />
                <TextField label="Company email" value={s.companyEmail} onChange={(v) => set("companyEmail", v)} placeholder="exports@vaaldrin.com" />
                <TextField label="Company phone" value={s.companyPhone} onChange={(v) => set("companyPhone", v)} placeholder="+91 ..." />
              </div>
            </GroupCard>

            <GroupCard icon={Wallet} title="Bank details (for Proforma Invoice)" subtitle="Shown on Proforma Invoice for buyer remittance">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Bank name" value={s.companyBankName} onChange={(v) => set("companyBankName", v)} />
                <TextField label="Account number" value={s.companyBankAccount} onChange={(v) => set("companyBankAccount", v)} />
                <TextField label="SWIFT code" value={s.companyBankSwift} onChange={(v) => set("companyBankSwift", v)} placeholder="8 or 11 char SWIFT/BIC" hint="VERIFY directly with your bank branch — wrong SWIFT bounces the remittance" />
                <TextField label="Branch" value={s.companyBankBranch} onChange={(v) => set("companyBankBranch", v)} />
                <TextField label="IFSC code" value={s.companyBankIfsc} onChange={(v) => set("companyBankIfsc", v)} placeholder="11-character IFSC" />
                <TextField label="AD Code" value={s.companyAdCode} onChange={(v) => set("companyAdCode", v)} placeholder="14-digit AD Code from your AD bank" hint="Authorised Dealer code issued by your bank for export remittance" />
              </div>
              <p className="mt-3 text-xs text-warning italic">
                ⚠ SWIFT codes vary by branch. Confirm the exact 8/11-character code in writing with your bank before sharing any Proforma Invoice — wrong SWIFT = bounced or delayed payment.
              </p>
            </GroupCard>

            <GroupCard icon={FileText} title="Document defaults" subtitle="Payment terms and validity printed on quotations and contracts">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Payment terms" value={s.paymentTerms} onChange={(v) => set("paymentTerms", v)} placeholder="e.g. 30% TT advance, 70% against scanned B/L" hint="Be specific (LC at sight, TT 30/70, DP, DA). Open-ended terms get the deal rejected." />
                <NumField label="Quotation validity (days)" value={s.quotationValidityDays} onChange={(v) => set("quotationValidityDays", v)} suffix="days" />
              </div>
            </GroupCard>


            <GroupCard icon={FileText} title="Contract & legal" subtitle="Printed on Sales Contract">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Governing law" value={s.governingLaw} onChange={(v) => set("governingLaw", v)} placeholder="e.g. Indian Law / English Law" />
                <TextField label="Arbitration venue" value={s.arbitrationVenue} onChange={(v) => set("arbitrationVenue", v)} placeholder="e.g. Bangalore, India / London, UK" />
              </div>
            </GroupCard>



            <Card className="p-4 border-warning/40 bg-warning/5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
              <div className="text-sm">
                <div className="font-semibold">Banking tariff settings</div>
                <div className="text-muted-foreground">Update these values whenever your bank publishes a new tariff schedule. Defaults follow Axis Bank Trade &amp; Forex charges.</div>
              </div>
            </Card>

            <GroupCard icon={Landmark} title="Customer status">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border bg-secondary/40 p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-sm">Axis Bank customer</div>
                    <div className="text-xs text-muted-foreground">Lower LC advising/amendment rates apply</div>
                  </div>
                  <Switch checked={s.bankingTariff.is_axis_customer} onCheckedChange={(v) => set("bankingTariff", { ...s.bankingTariff, is_axis_customer: v })} />
                </div>
                <Button variant="outline" onClick={() => { if (confirm("Reset banking tariff to Axis Bank defaults?")) { set("bankingTariff", defaultState.bankingTariff); toast.success("Tariff reset"); } }}>
                  <RotateCcw className="w-4 h-4 mr-2" />Reset to Axis Bank defaults
                </Button>
              </div>
            </GroupCard>

            <GroupCard icon={Wallet} title="Fixed charges (INR)" subtitle="Per-transaction fees published by the bank">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {([
                  ["inward_remittance_charge","Inward remittance charge"],
                  ["export_bill_collection_charge","Export bill collection"],
                  ["export_bill_advance_remittance_handling","Advance remittance handling"],
                  ["export_bill_dishonour_charge","Export bill dishonour"],
                  ["export_bill_writeoff_charge","Export bill write-off"],
                  ["reimbursement_claim_charge","Reimbursement claim"],
                  ["export_due_date_extension","Due date extension"],
                  ["edf_gr_approval_charge","EDF / GR approval"],
                  ["edf_gr_waiver_certificate","EDF / GR waiver certificate"],
                  ["export_lc_advising_customer","LC advising (customer)"],
                  ["export_lc_advising_non_customer","LC advising (non-customer)"],
                  ["export_lc_amendment_customer","LC amendment (customer)"],
                  ["export_lc_amendment_non_customer","LC amendment (non-customer)"],
                  ["export_lc_transfer","LC transfer"],
                  ["courier_export_documents","Courier — export documents"],
                  ["swift_outward_remittance","SWIFT outward remittance"],
                  ["outward_remittance_charge","Outward remittance"],
                  ["duplicate_firc_brc_swift","Duplicate FIRC / BRC / SWIFT"],
                  ["certificate_attestation","Certificate attestation"],
                  ["swift_tracer","SWIFT tracer"],
                  ["manual_brc","Manual BRC"],
                  ["ebrc","eBRC"],
                ] as const).map(([key, label]) => (
                  <NumField key={key} label={label} value={(s.bankingTariff as any)[key]} onChange={(v) => set("bankingTariff", { ...s.bankingTariff, [key]: v })} suffix="₹" />
                ))}
              </div>
            </GroupCard>

            <GroupCard icon={TrendingUp} title="Percentage-based charges" subtitle="Calculated dynamically against bill value, subject to a minimum">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <NumField label="Bill negotiation %" value={s.bankingTariff.export_bill_negotiation_rate_percent} onChange={(v) => set("bankingTariff", { ...s.bankingTariff, export_bill_negotiation_rate_percent: v })} step={0.001} suffix="%" />
                <NumField label="Bill negotiation minimum" value={s.bankingTariff.export_bill_negotiation_minimum} onChange={(v) => set("bankingTariff", { ...s.bankingTariff, export_bill_negotiation_minimum: v })} suffix="₹" />
                <NumField label="Advance against bill %" value={s.bankingTariff.advance_against_export_bill_rate_percent} onChange={(v) => set("bankingTariff", { ...s.bankingTariff, advance_against_export_bill_rate_percent: v })} step={0.001} suffix="%" />
                <NumField label="Advance against bill minimum" value={s.bankingTariff.advance_against_export_bill_minimum} onChange={(v) => set("bankingTariff", { ...s.bankingTariff, advance_against_export_bill_minimum: v })} suffix="₹" />
                <NumField label="Bill crystallization %" value={s.bankingTariff.export_bill_crystallization_rate_percent} onChange={(v) => set("bankingTariff", { ...s.bankingTariff, export_bill_crystallization_rate_percent: v })} step={0.001} suffix="%" />
                <NumField label="Bill crystallization minimum" value={s.bankingTariff.export_bill_crystallization_minimum} onChange={(v) => set("bankingTariff", { ...s.bankingTariff, export_bill_crystallization_minimum: v })} suffix="₹" />
                <NumField label="Set-off fixed" value={s.bankingTariff.setoff_fixed} onChange={(v) => set("bankingTariff", { ...s.bankingTariff, setoff_fixed: v })} suffix="₹" />
                <NumField label="Set-off %" value={s.bankingTariff.setoff_rate_percent} onChange={(v) => set("bankingTariff", { ...s.bankingTariff, setoff_rate_percent: v })} step={0.001} suffix="%" />
                <NumField label="Commission in lieu of exchange %" value={s.bankingTariff.commission_in_lieu_rate_percent} onChange={(v) => set("bankingTariff", { ...s.bankingTariff, commission_in_lieu_rate_percent: v })} step={0.001} suffix="%" />
              </div>
            </GroupCard>

            <GroupCard icon={Sparkles} title="Variable charges">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <NumField label="GST %" value={s.bankingTariff.gst_percent} onChange={(v) => set("bankingTariff", { ...s.bankingTariff, gst_percent: v })} step={0.5} suffix="%" />
                <NumField label="Forex spread %" value={s.bankingTariff.forex_spread_percent} onChange={(v) => set("bankingTariff", { ...s.bankingTariff, forex_spread_percent: v })} step={0.05} suffix="%" />
                <NumField label="Correspondent bank fee" value={s.bankingTariff.correspondent_bank_fee_usd} onChange={(v) => set("bankingTariff", { ...s.bankingTariff, correspondent_bank_fee_usd: v })} suffix="USD" />
              </div>
            </GroupCard>
          </TabsContent>
        </Tabs>


        <footer className="text-center text-xs text-muted-foreground py-6 border-t mt-8">
          <div className="font-semibold tracking-widest" style={{ color: "var(--gold)" }}>VAALDRIN EXPORTS</div>
          <div className="mt-1">Export costing & quotation system for Vaaldrin Exports</div>
        </footer>

        <div className="print-area hidden print:block">
          <DocumentPreview s={s} priceINR={incotermPrice} docType={docType} forPrint />
        </div>
      </main>
      </div>
    </div>
  );
}

/* ---------- Smaller helpers ---------- */

function AccItem({ value, icon: Icon, title, summary, children }: {
  value: string; icon: React.ComponentType<{ className?: string }>;
  title: string; summary?: string; children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="border-b last:border-0 px-2">
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
          <div className="grid place-items-center w-8 h-8 rounded-md bg-secondary text-foreground/70 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm truncate">{title}</span>
          {summary && (
            <span className="ml-auto text-xs text-muted-foreground tabular-nums shrink-0">{summary}</span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-2 pb-5 pt-1">{children}</AccordionContent>
    </AccordionItem>
  );
}

function QuoteFact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/55 truncate">{label}</div><div className="mt-0.5 font-semibold break-words" title={value}>{value}</div></div>;
}

function DirectorCell({ label, value, tone, big, pct, hint }: {
  label: string; value: string; tone?: "gold" | "warn" | "danger"; big?: boolean; pct?: number; hint?: string;
}) {
  const cls =
    tone === "gold" ? "border-gold/60 bg-gold/15" :
    tone === "warn" ? "border-warning/40 bg-warning/10" :
    tone === "danger" ? "border-deep-red/50 bg-deep-red/10" :
    "border-primary-foreground/15 bg-primary-foreground/5";
  return (
    <div className={"min-w-0 overflow-hidden rounded-[14px] border p-5 transition-all duration-200 hover:-translate-y-[1px] " + cls} title={hint}>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-primary-foreground/75 font-semibold">
        <span className="truncate">{label}</span>
        {hint && <HelpCircle className="w-3 h-3 opacity-60 shrink-0" />}
      </div>
      <div className={"font-bold mt-2 tabular-nums break-all leading-[1.05] vx-count " + (big ? "[font-size:clamp(1.15rem,4.6cqi+0.7rem,1.85rem)]" : "[font-size:clamp(0.9rem,2.8cqi+0.55rem,1.05rem)]")} title={value}>{value}</div>
      <div className="text-xs text-primary-foreground/70 tabular-nums mt-1">
        {pct !== undefined && (
          <span className={"font-semibold " + (pct > 15 ? "text-success" : pct >= 8 ? "text-warning" : "text-deep-red")}>
            {fmtNum(pct)}% margin
          </span>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" | "warn" }) {
  const toneCls = tone === "green" ? "text-success" : tone === "red" ? "text-deep-red" : tone === "warn" ? "text-warning" : "";
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</div>
      <div className={"text-sm font-semibold tabular-nums mt-0.5 truncate " + toneCls}>{value}</div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" | "warn" }) {
  const cls = tone === "green" ? "text-success" : tone === "red" ? "text-deep-red" : tone === "warn" ? "text-warning" : "";
  return (
    <div className="min-w-0 rounded-md border border-border/40 bg-background/40 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{label}</div>
      <div
        className={"mt-0.5 font-semibold tabular-nums break-all leading-tight " + cls}
        style={{ fontSize: "clamp(0.75rem, 2.6vw, 0.95rem)" }}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function DocumentPreview({ s, priceINR, docType, forPrint }: {
  s: CalculatorState; priceINR: number; docType: DocType; forPrint?: boolean;
}) {
  const quote = getBuyerQuote(priceINR, s.quantity, s);
  const unitPrice = quote.unitPrice;
  const total = quote.totalContractValue;
  const meta = DOC_TYPES.find((d) => d.value === docType)!;

  // Visibility per spec
  const showPrices = docType !== "packing_list";
  const showCommercialTerms =
    docType === "quotation" || docType === "proforma" || docType === "purchase_order" || docType === "sales_contract" || docType === "internal_cost";
  const showValidity = docType === "quotation" || docType === "proforma";
  const showBank = docType === "proforma";
  const showOriginDestination = docType === "commercial_invoice" || docType === "packing_list";
  const showContainerInfo = docType === "packing_list";
  const showDeclaration = docType === "commercial_invoice";
  const isInternal = docType === "internal_cost";
  const isContract = docType === "sales_contract";

  const docNumberPrefix: Record<DocType, string> = {
    quotation: "",
    proforma: "PI-",
    commercial_invoice: "CI-",
    packing_list: "PL-",
    internal_cost: "",
    purchase_order: "PO-",
    sales_contract: "SC-",
  };
  const docNo = `${docNumberPrefix[docType]}${s.quotationNumber}`;

  const counterpartyLabel =
    docType === "purchase_order" ? "Supplier" :
    docType === "commercial_invoice" ? "Consignee" :
    "Buyer";

  // Internal cost summary
  const totalCost = isInternal ? (
    s.supplierPricePerUnit * s.quantity +
    s.pouchCost + s.labelCost + s.cartonCost + s.palletCost + s.otherPackaging +
    s.factoryToWarehouse + s.warehouseToPort + s.loadingCharges + s.unloadingCharges +
    s.certificateOfOrigin + s.phytosanitary + s.fumigation + s.labTesting + s.exportDocs + s.otherCertification +
    s.chaCharges + s.portHandling + s.terminalHandling + s.customsClearance + s.containerHandling +
    s.oceanFreight + s.airFreight + s.freightForwarderFee + s.localDestination +
    s.cargoInsurance +
    s.swiftCharges + s.bankCharges + s.exportRealization + s.currencyConversion + s.otherBanking +
    s.miscCost
  ) : 0;

  return (
    <div className={"bg-white text-[#111827] p-4 sm:p-8 " + (forPrint ? "" : "border rounded-lg")} style={{ fontFamily: "Helvetica, Arial, sans-serif" }}>
      {/* HEADER */}
      <div className="flex justify-between items-start pb-4" style={{ borderBottom: "1px solid #C99A2E" }}>
        <div className="flex items-start gap-3">
          <img src={logoAsset.url} alt="Vaaldrin Exports" className="w-14 h-14 object-contain" />
          <div>
            <div className="text-base font-bold tracking-tight">VAALDRIN EXPORTS</div>
            <div className="text-[10px] text-[#6B7280] mt-0.5">International Trade • Export House</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold" style={{ color: "#A61D24" }}>{meta.title}</div>
          <div className="text-xs mt-1">No: <span className="font-semibold">{docNo}</span></div>
          <div className="text-xs">Date: {s.quotationDate}</div>
          {isInternal && <div className="text-[10px] font-bold mt-1" style={{ color: "#A61D24" }}>CONFIDENTIAL</div>}
          {docType === "proforma" && <div className="text-[10px] italic text-[#6B7280] mt-1">PROFORMA — NOT A TAX INVOICE</div>}
        </div>
      </div>

      {/* PARTIES */}
      <div className="grid grid-cols-2 gap-6 mt-6 text-xs">
        <div>
          <SectionTitle>{docType === "sales_contract" ? "Seller" : "Exporter"}</SectionTitle>
          <div className="font-semibold mt-1">{s.companyName || "Vaaldrin Exports"}</div>
          {s.companyAddress && <div className="text-[#6B7280] whitespace-pre-line">{s.companyAddress}</div>}
          {(s.companyEmail || s.companyPhone) && (
            <div className="text-[#6B7280]">
              {s.companyEmail}{s.companyEmail && s.companyPhone ? " · " : ""}{s.companyPhone}
            </div>
          )}
          {s.companyIec && <div className="text-[#6B7280]">IEC: {s.companyIec}</div>}
          {s.companyGstin && <div className="text-[#6B7280]">GSTIN: {s.companyGstin}</div>}
          {s.companyFssai && <div className="text-[#6B7280]">FSSAI: {s.companyFssai}</div>}
        </div>
        <div>
          <SectionTitle>{counterpartyLabel}</SectionTitle>
          <div className="font-semibold mt-1">{s.buyerCompany || "—"}</div>
          {s.buyerName && <div>{s.buyerName}</div>}
          {s.buyerAddress && <div className="text-[#6B7280] whitespace-pre-line">{s.buyerAddress}</div>}
          {s.buyerCountry && <div>{s.buyerCountry}</div>}
          {s.buyerEmail && <div className="text-[#6B7280]">{s.buyerEmail}</div>}
          {s.buyerPhone && <div className="text-[#6B7280]">{s.buyerPhone}</div>}
        </div>
      </div>

      {/* Shipment / Origin */}
      {(showOriginDestination || showContainerInfo) && (
        <div className="mt-5 grid grid-cols-3 gap-4 text-xs border-t pt-4" style={{ borderColor: "#E5E7EB" }}>
          {showOriginDestination && <>
            <div><div className="text-[#6B7280]">Country of Origin</div><div className="font-semibold">India</div></div>
            <div><div className="text-[#6B7280]">Country of Destination</div><div className="font-semibold">{s.buyerCountry || "—"}</div></div>
            <div><div className="text-[#6B7280]">Incoterm</div><div className="font-semibold">{s.incoterm} (Incoterms 2020)</div></div>
            <div><div className="text-[#6B7280]">Port of Loading</div><div className="font-semibold">{s.portOfLoading || "—"}</div></div>
            <div><div className="text-[#6B7280]">Port of Discharge</div><div className="font-semibold">{s.portOfDischarge || "—"}</div></div>
            <div><div className="text-[#6B7280]">Final Destination</div><div className="font-semibold">{s.finalDestination || s.buyerCountry || "—"}</div></div>
            {s.modeOfTransport && <div><div className="text-[#6B7280]">Mode of Transport</div><div className="font-semibold">{s.modeOfTransport}</div></div>}
            {s.vesselFlight && <div><div className="text-[#6B7280]">Vessel / Flight</div><div className="font-semibold">{s.vesselFlight}</div></div>}
            {s.shipmentLeadTimeDays ? <div><div className="text-[#6B7280]">Lead Time</div><div className="font-semibold">{s.shipmentLeadTimeDays} days</div></div> : null}
          </>}
          {showContainerInfo && !showOriginDestination && <>
            <div><div className="text-[#6B7280]">Port of Loading</div><div className="font-semibold">{s.portOfLoading || "—"}</div></div>
            <div><div className="text-[#6B7280]">Port of Discharge</div><div className="font-semibold">{s.portOfDischarge || "—"}</div></div>
            <div><div className="text-[#6B7280]">Incoterm</div><div className="font-semibold">{s.incoterm}</div></div>
            <div><div className="text-[#6B7280]">Container No.</div><div className="font-semibold">{s.containerNo || "—"}</div></div>
            <div><div className="text-[#6B7280]">Seal No.</div><div className="font-semibold">{s.sealNo || "—"}</div></div>
            <div><div className="text-[#6B7280]">Vessel / Flight</div><div className="font-semibold">{s.vesselFlight || "—"}</div></div>
          </>}
        </div>
      )}

      {/* PRODUCT TABLE */}
      <table className="w-full mt-6 text-xs border-collapse">
        <thead>
          <tr style={{ backgroundColor: "#F8F9FA", color: "#111827" }}>
            <th className="text-left p-2 border" style={{ borderColor: "#E5E7EB" }}>HS Code</th>
            <th className="text-left p-2 border" style={{ borderColor: "#E5E7EB" }}>Description</th>
            <th className="text-right p-2 border" style={{ borderColor: "#E5E7EB" }}>Qty</th>
            <th className="text-left p-2 border" style={{ borderColor: "#E5E7EB" }}>UoM</th>
            {showPrices && <th className="text-right p-2 border" style={{ borderColor: "#E5E7EB" }}>Unit Price ({s.contractCurrency})</th>}
            {showPrices && <th className="text-right p-2 border" style={{ borderColor: "#E5E7EB" }}>Amount ({s.contractCurrency})</th>}
            {docType === "packing_list" && <>
              <th className="text-right p-2 border" style={{ borderColor: "#E5E7EB" }}>Net Wt (kg)</th>
              <th className="text-right p-2 border" style={{ borderColor: "#E5E7EB" }}>Gross Wt (kg)</th>
            </>}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2 border" style={{ borderColor: "#E5E7EB" }}>{s.hsCode || "—"}</td>
            <td className="p-2 border" style={{ borderColor: "#E5E7EB" }}>{s.productName || "—"}{s.productGrade ? ` — ${s.productGrade}` : ""}</td>
            <td className="p-2 border text-right" style={{ borderColor: "#E5E7EB" }}>{s.quantity}</td>
            <td className="p-2 border" style={{ borderColor: "#E5E7EB" }}>{s.uom}</td>
            {showPrices && <td className="p-2 border text-right tabular-nums" style={{ borderColor: "#E5E7EB" }}>{fmtCurrency(unitPrice, s.contractCurrency)}</td>}
            {showPrices && <td className="p-2 border text-right tabular-nums font-bold" style={{ borderColor: "#E5E7EB" }}>{fmtCurrency(total, s.contractCurrency)}</td>}
            {docType === "packing_list" && <>
              <td className="p-2 border text-right tabular-nums" style={{ borderColor: "#E5E7EB" }}>{s.quantity.toFixed(2)}</td>
              <td className="p-2 border text-right tabular-nums" style={{ borderColor: "#E5E7EB" }}>{(s.quantity * 1.05).toFixed(2)}</td>
            </>}
          </tr>
        </tbody>
      </table>

      {/* TOTALS */}
      {showPrices && !isInternal && (
        <div className="mt-4 flex justify-end">
          <div className="border p-3 rounded text-right min-w-[260px]" style={{ borderColor: "#E5E7EB" }}>
            <div className="text-[10px] uppercase tracking-widest text-[#6B7280]">
              {docType === "commercial_invoice" ? "Invoice Total" : "Total Contract Value"} ({s.contractCurrency})
            </div>
            <div className="font-bold text-xl tabular-nums" style={{ color: "#A61D24" }}>{fmtCurrency(total, s.contractCurrency)}</div>
          </div>
        </div>
      )}

      {/* COMMERCIAL TERMS */}
      {showCommercialTerms && (
        <div className="mt-6 grid grid-cols-2 gap-6 text-xs">
          <div>
            <SectionTitle>Commercial Terms</SectionTitle>
            <div className="mt-2 space-y-1">
              <KV k="Incoterm" v={`${s.incoterm} (Incoterms 2020)`} />
              <KV k="Currency" v={s.contractCurrency} />
              <KV k="Payment Terms" v={s.paymentTerms || "To be agreed"} />
              {showValidity && <KV k="Validity" v={`${s.quotationValidityDays} days from issue date`} />}
              <KV k="Country of Origin" v="India" />
            </div>
          </div>
          {showBank && (
            <div>
              <SectionTitle>Bank Details</SectionTitle>
              <div className="mt-2 space-y-1">
                <KV k="Bank Name" v={s.companyBankName || "—"} />
                <KV k="Account No." v={s.companyBankAccount || "—"} />
                <KV k="SWIFT" v={s.companyBankSwift || "—"} />
                <KV k="Branch" v={s.companyBankBranch || "—"} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* INTERNAL COST SUMMARY */}
      {isInternal && (
        <div className="mt-6 text-xs">
          <SectionTitle>Cost & Profit Summary</SectionTitle>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <KV k="Total Cost (INR)" v={fmtCurrency(totalCost, "INR")} />
            <KV k="Selling Price / unit" v={`${s.contractCurrency} ${fmtCurrency(unitPrice, s.contractCurrency)}`} />
            <KV k="Contract Value" v={`${s.contractCurrency} ${fmtCurrency(total, s.contractCurrency)}`} />
            <KV k="Country Risk" v={s.buyerCountry || "—"} />
          </div>
          <div className="mt-3 text-[10px] font-bold text-center text-[#6B7280] uppercase tracking-widest">
            Confidential — Internal Use Only
          </div>
        </div>
      )}

      {/* DECLARATION */}
      {showDeclaration && (
        <div className="mt-6 text-xs italic text-[#6B7280] border-t pt-3" style={{ borderColor: "#E5E7EB" }}>
          We hereby certify that the goods described above are of Indian origin.
        </div>
      )}

      {/* CONTRACT CLAUSES */}
      {isContract && (
        <div className="mt-6 text-xs space-y-1.5">
          <SectionTitle>Contract Clauses</SectionTitle>
          <div className="mt-2"><span className="font-bold">1. Goods:</span> {s.productName || "—"}{s.productGrade ? ` (${s.productGrade})` : ""}, HS {s.hsCode || "—"}</div>
          <div><span className="font-bold">2. Quantity:</span> {s.quantity} {s.uom}</div>
          <div><span className="font-bold">3. Price:</span> {s.contractCurrency} {fmtCurrency(unitPrice, s.contractCurrency)} per {s.uom}</div>
          <div><span className="font-bold">4. Payment:</span> {s.paymentTerms || "To be agreed with buyer"}</div>
          <div><span className="font-bold">5. Delivery:</span> {s.incoterm} as per Incoterms 2020</div>
          <div><span className="font-bold">6. Inspection:</span> Pre-shipment inspection at seller's premises</div>
          <div><span className="font-bold">7. Force Majeure:</span> Standard exclusion clause applies</div>
          <div><span className="font-bold">8. Disputes:</span> Arbitration under ICC Rules; jurisdiction of seller</div>
        </div>
      )}

      {/* SIGNATURES */}
      <div className="mt-10 pt-3" style={{ borderTop: "1px solid #C99A2E" }}>
        {isContract ? (
          <div className="grid grid-cols-2 gap-12 text-xs">
            <div>
              <div className="font-bold">Buyer</div>
              <div className="h-16" />
              <div className="border-t border-black/60 pt-1 text-[10px] text-[#6B7280]">Authorized Signatory</div>
            </div>
            <div>
              <div className="font-bold">Seller ({s.companyName || "Vaaldrin Exports"})</div>
              <div className="relative h-16">
                <img
                  src={SIGNATURE_PNG_DATA_URL}
                  alt="Signature"
                  className="absolute left-0 select-none pointer-events-none"
                  style={{ bottom: "-10px", width: "95px", transform: "rotate(-4deg)" }}
                />
              </div>
              <div className="border-t border-black/60 pt-1">
                <div className="text-[11px] font-semibold text-[#1E1E1E]">Vishwas M.H.</div>
                <div className="text-[10px] text-[#6B7280]">Proprietor, {s.companyName || "Vaaldrin Exports"}</div>
              </div>
            </div>
          </div>
        ) : !isInternal && (
          <div className="flex justify-end">
            <div className="text-right text-xs">
              <div className="font-bold">For {s.companyName || "Vaaldrin Exports"}</div>
              <div className="relative h-16 w-48 ml-auto">
                <img
                  src={SIGNATURE_PNG_DATA_URL}
                  alt="Signature"
                  className="absolute right-0 select-none pointer-events-none"
                  style={{ bottom: "-10px", width: "95px", transform: "rotate(-4deg)" }}
                />
              </div>
              <div className="border-t border-black/60 w-48 pt-1 ml-auto text-right">
                <div className="text-[11px] font-semibold text-[#1E1E1E]">Vishwas M.H.</div>
                <div className="text-[10px] text-[#6B7280]">Proprietor</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-widest pb-1" style={{ color: "#A61D24", borderBottom: "1px solid #E5E7EB" }}>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-[#6B7280]">{k}</span>
      <span className="font-semibold text-right">{v}</span>
    </div>
  );
}
