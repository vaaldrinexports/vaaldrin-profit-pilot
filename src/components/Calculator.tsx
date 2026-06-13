import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  compute, defaultState, fmtINR, fmtUSD, fmtEUR, fmtNum,
  applyScenario, evaluatePrice, convertToINR, convertFromINR,
  type CalculatorState, type Incoterm,
} from "@/lib/calculations";
import { generateQuotationPDF } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from "recharts";
import {
  FileDown, Printer, Save, Upload, Copy, RotateCcw, ShieldCheck, AlertTriangle,
  TrendingUp, Lock, Sparkles, MoreHorizontal, HelpCircle, Package, Truck, FileText,
  Ship, Anchor, Landmark, Wallet, Coins, Globe2, Info,
} from "lucide-react";

const STORAGE_KEY = "vaaldrin.calc.v1";

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
    <Card className="p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        {Icon && (
          <div className="shrink-0 mt-0.5 grid place-items-center w-9 h-9 rounded-lg bg-gold/15 text-gold">
            <Icon className="w-4.5 h-4.5" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
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
    tone === "warn" ? "border-warning/50 bg-warning/5" : "";
  return (
    <div className={"rounded-lg border bg-card p-4 " + toneCls}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
      <div className="mt-1.5 text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

/* ---------- Main component ---------- */

export default function Calculator() {
  const [s, setS] = useState<CalculatorState>(defaultState);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      try { setS({ ...defaultState, ...JSON.parse(raw) }); } catch {}
    } else {
      setS((current) => ({ ...current, quotationDate: new Date().toISOString().slice(0, 10) }));
    }
  }, []);

  const c = useMemo(() => compute(s), [s]);
  const set = <K extends keyof CalculatorState>(k: K, v: CalculatorState[K]) => setS((p) => ({ ...p, [k]: v }));

  const usd = (inr: number) => inr / (s.actualBankUsdRate || 1);
  const eur = (inr: number) => inr / (s.actualBankEurRate || 1);

  const incotermPrice = s.incoterm === "EXW" ? c.exwPrice : s.incoterm === "FOB" ? c.fobPrice : s.incoterm === "CFR" ? c.cfrPrice : c.cifPrice;
  const minIncotermPrice = s.incoterm === "EXW" ? c.minExw : s.incoterm === "FOB" ? c.minFob : s.incoterm === "CFR" ? c.minCfr : c.minCif;
  const walkPrice = s.incoterm === "EXW" ? c.walkExw : s.incoterm === "FOB" ? c.walkFob : s.incoterm === "CFR" ? c.walkCfr : c.walkCif;

  const counterINR = s.buyerCounterCurrency === "INR" ? s.buyerCounterOffer :
    s.buyerCounterCurrency === "USD" ? s.buyerCounterOffer * s.actualBankUsdRate :
    s.buyerCounterOffer * s.actualBankEurRate;
  const counterAcceptable = counterINR >= minIncotermPrice;
  const discountedPrice = incotermPrice * (1 - s.requestedDiscountPct / 100);
  const discountAcceptable = discountedPrice >= minIncotermPrice;
  const lockTriggered = s.marginLock && (c.profitPct < s.minProfitPct || c.netProfit < s.minProfitAmount);

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
    { name: "− Buffers", value: -c.perUnit.buffers, color: "var(--deep-red)" },
    { name: "= Profit", value: c.profitPerUnit, color: "var(--success)" },
  ];

  const save = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); toast.success("Calculation saved"); };
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
  const generatePDF = () => {
    if (lockTriggered) { toast.error("Margin lock active — adjust pricing first"); return; }
    generateQuotationPDF(s);
  };

  // Quality summary
  const dq = c.dealQualityScore;
  const dqLabel = dq >= 90 ? "Excellent" : dq >= 75 ? "Good" : dq >= 60 ? "Acceptable" : "High Risk";
  const dqTone = dq >= 75 ? "text-success" : dq >= 60 ? "text-warning" : "text-deep-red";

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header — cleaner, fewer buttons */}
      <header className="no-print sticky top-0 z-30 bg-primary text-primary-foreground border-b border-gold/30 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate" style={{ color: "var(--gold)" }}>VAALDRIN EXPORTS</h1>
              <span className="text-[11px] text-gold/70 tracking-widest hidden md:inline">PRICING & PROFIT CONTROL</span>
            </div>
            <p className="text-xs text-primary-foreground/60 mt-0.5 hidden sm:block">Export costing & quotation system</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={generatePDF} className="bg-gold hover:bg-gold/90 text-gold-foreground font-semibold">
              <FileDown className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Generate PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button size="sm" variant="secondary" onClick={save}>
              <Save className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Save</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary"><MoreHorizontal className="w-4 h-4" /></Button>
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Executive Summary — simpler, more spacious */}
        <Card className="overflow-hidden border-gold/30 shadow-md">
          <div className="bg-gradient-to-br from-primary to-primary/95 text-primary-foreground p-6">
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DirectorCell label="Recommended price" inr={incotermPrice} usd={usd(incotermPrice)} tone="gold" big />
              <DirectorCell label="Expected profit" inr={c.netProfit} usd={usd(c.netProfit)} pct={c.profitPct} big />
              <DirectorCell label="Minimum acceptable" inr={minIncotermPrice} usd={usd(minIncotermPrice)} tone="warn" big />
              <DirectorCell label="Walk-away price" inr={walkPrice} usd={usd(walkPrice)} tone="danger" big />
            </div>
          </div>

          <div className="bg-card p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-sm border-t">
            <MiniStat label="EXW" value={fmtINR(c.exwPrice)} />
            <MiniStat label="FOB" value={fmtINR(c.fobPrice)} />
            <MiniStat label="CFR" value={fmtINR(c.cfrPrice)} />
            <MiniStat label="CIF" value={fmtINR(c.cifPrice)} />
            <MiniStat label="Break-even" value={fmtINR(c.breakEvenPrice)} />
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

        {/* Quick-start hint when empty */}
        {!s.productName && !s.quantity && (
          <Card className="p-4 border-gold/30 bg-gold/5 flex items-start gap-3">
            <Info className="w-5 h-5 text-gold mt-0.5 shrink-0" />
            <div className="text-sm text-foreground/80">
              <span className="font-semibold">Getting started:</span> open the <span className="font-semibold">Inputs</span> tab below and fill in shipment details, supplier price and quantity. The other sections (logistics, freight, etc.) are collapsed — expand only the ones you need.
            </div>
          </Card>
        )}

        <Tabs defaultValue="inputs" className="space-y-5">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full h-auto p-1 bg-secondary">
            <TabsTrigger value="inputs" className="py-2.5">1. Inputs</TabsTrigger>
            <TabsTrigger value="profit" className="py-2.5">2. Profit</TabsTrigger>
            <TabsTrigger value="incoterms" className="py-2.5">3. Incoterms</TabsTrigger>
            <TabsTrigger value="negotiation" className="py-2.5">4. Negotiation</TabsTrigger>
            <TabsTrigger value="scenario" className="py-2.5">5. Scenarios</TabsTrigger>
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
                <TextField label="Buyer company" value={s.buyerCompany} onChange={(v) => set("buyerCompany", v)} placeholder="ABC Trading Ltd." />
                <TextField label="Buyer contact name" value={s.buyerName} onChange={(v) => set("buyerName", v)} />
                <TextField label="Buyer country" value={s.buyerCountry} onChange={(v) => set("buyerCountry", v)} placeholder="Germany" />
                <TextField label="Buyer email" value={s.buyerEmail} onChange={(v) => set("buyerEmail", v)} type="email" />
                <TextField label="Product name" value={s.productName} onChange={(v) => set("productName", v)} placeholder="Basmati Rice 1121" />
                <TextField label="Product grade" value={s.productGrade} onChange={(v) => set("productGrade", v)} />
                <TextField label="HS code" value={s.hsCode} onChange={(v) => set("hsCode", v)} placeholder="1006.30.20" />
                <NumField label="Quantity" value={s.quantity} onChange={(v) => set("quantity", v)} hint="Total quantity in selected UoM" />
                <TextField label="Unit of measure" value={s.uom} onChange={(v) => set("uom", v)} placeholder="KG" />
              </div>
            </GroupCard>

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
                </AccItem>

                <AccItem value="insurance" icon={ShieldCheck} title="Insurance" summary={fmtINR(c.insuranceTotal)}>
                  <div className="grid grid-cols-2 gap-4">
                    <NumField label="Cargo insurance" value={s.cargoInsurance} onChange={(v) => set("cargoInsurance", v)} suffix="₹" />
                  </div>
                </AccItem>

                <AccItem value="banking" icon={Landmark} title="Banking costs" summary={fmtINR(c.bankingTotal)}>
                  <div className="mb-4 rounded-md bg-warning/10 px-3 py-2 text-xs text-foreground/80">
                    Enter shipment totals. Include the expected FX spread under currency conversion; it is often the largest hidden bank cost.
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <NumField label="SWIFT — shipment total" value={s.swiftCharges} onChange={(v) => set("swiftCharges", v)} suffix="₹" hint="Typical test range: ₹1,000–₹3,000" />
                    <NumField label="Bank fees — shipment total" value={s.bankCharges} onChange={(v) => set("bankCharges", v)} suffix="₹" hint="Typical test range: ₹1,000–₹5,000" />
                    <NumField label="Export realization — total" value={s.exportRealization} onChange={(v) => set("exportRealization", v)} suffix="₹" />
                    <NumField label="FX spread — shipment total" value={s.currencyConversion} onChange={(v) => set("currencyConversion", v)} suffix="₹" hint="Bank rate spread across the full invoice; often ₹10,000–₹50,000+" />
                    <NumField label="Other banking — total" value={s.otherBanking} onChange={(v) => set("otherBanking", v)} suffix="₹" />
                  </div>
                </AccItem>

                <AccItem value="misc" icon={Wallet} title="Miscellaneous & contingency" summary={fmtINR(c.miscTotal + c.contingencyAmount)}>
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

                <AccItem value="forex" icon={Globe2} title="Currency & forex protection" summary={`${fmtNum(s.forexBufferPct)}% buffer`}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <NumField label="Market USD rate" value={s.marketUsdRate} onChange={(v) => set("marketUsdRate", v)} step={0.01} suffix="₹" />
                    <NumField label="Actual bank USD rate" value={s.actualBankUsdRate} onChange={(v) => set("actualBankUsdRate", v)} step={0.01} suffix="₹" hint="Used for actual profit calculation" />
                    <NumField label="Market EUR rate" value={s.marketEurRate} onChange={(v) => set("marketEurRate", v)} step={0.01} suffix="₹" />
                    <NumField label="Actual bank EUR rate" value={s.actualBankEurRate} onChange={(v) => set("actualBankEurRate", v)} step={0.01} suffix="₹" />
                    <NumField label="Forex risk buffer" value={s.forexBufferPct} onChange={(v) => set("forexBufferPct", v)} step={0.1} suffix="%" />
                    <NumField label="Forex buffer amount" value={c.forexBufferAmount} onChange={() => {}} readOnly suffix="₹" />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground italic">Profit is always computed using the actual bank conversion rate.</p>
                </AccItem>
              </Accordion>
            </Card>
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
                <KPI label="Break-even price" value={fmtINR(c.breakEvenPrice)} sub={`${fmtUSD(usd(c.breakEvenPrice))} / unit`} />
                <KPI label="Target selling price" value={fmtINR(c.targetSellingPrice)} sub={`${fmtUSD(usd(c.targetSellingPrice))} / unit`} tone="gold" />
                <KPI label="Net profit" value={fmtINR(c.netProfit)} tone={c.profitPct > 15 ? "green" : c.profitPct >= 8 ? "warn" : "red"} />
                <KPI label="Profit %" value={`${fmtNum(c.profitPct)}%`} tone={c.profitPct > 15 ? "green" : c.profitPct >= 8 ? "warn" : "red"} />
                <KPI label="Profit / unit" value={fmtINR(c.profitPerUnit)} />
                <KPI label="Profit / kg" value={fmtINR(c.profitPerKg)} />
                <KPI label="Profit / container" value={fmtINR(c.profitPerContainer)} sub={`${s.containerKg} kg`} />
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
                      <th className="text-right p-3 font-semibold">Per unit (INR)</th>
                      <th className="text-right p-3 font-semibold">Per unit (USD)</th>
                      <th className="text-right p-3 font-semibold">Per unit (EUR)</th>
                      <th className="text-right p-3 font-semibold">Total (INR)</th>
                      <th className="text-right p-3 font-semibold">Total (USD)</th>
                      <th className="text-right p-3 font-semibold">Total (EUR)</th>
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
                        <td className="p-3 text-right tabular-nums font-semibold">{fmtINR(row.price)}</td>
                        <td className="p-3 text-right tabular-nums">{fmtUSD(usd(row.price))}</td>
                        <td className="p-3 text-right tabular-nums">{fmtEUR(eur(row.price))}</td>
                        <td className="p-3 text-right tabular-nums font-semibold">{fmtINR(row.price * s.quantity)}</td>
                        <td className="p-3 text-right tabular-nums">{fmtUSD(usd(row.price * s.quantity))}</td>
                        <td className="p-3 text-right tabular-nums">{fmtEUR(eur(row.price * s.quantity))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GroupCard>

            <GroupCard icon={FileText} title="Quotation preview" subtitle="What your buyer will see in the PDF">
              <QuotationPreview s={s} priceINR={incotermPrice} />
            </GroupCard>
          </TabsContent>

          {/* NEGOTIATION */}
          <TabsContent value="negotiation" className="space-y-5">
            <GroupCard icon={TrendingUp} title="Negotiation thresholds" subtitle="Know exactly when to say yes, push back, or walk away">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <KPI label="Min EXW" value={fmtINR(c.minExw)} sub={fmtUSD(usd(c.minExw))} tone="warn" />
                <KPI label="Min FOB" value={fmtINR(c.minFob)} sub={fmtUSD(usd(c.minFob))} tone="warn" />
                <KPI label="Min CFR" value={fmtINR(c.minCfr)} sub={fmtUSD(usd(c.minCfr))} tone="warn" />
                <KPI label="Min CIF" value={fmtINR(c.minCif)} sub={fmtUSD(usd(c.minCif))} tone="warn" />
                <KPI label="Walk-away FOB" value={fmtINR(c.walkFob)} sub={fmtUSD(usd(c.walkFob))} tone="red" />
                <KPI label="Walk-away CFR" value={fmtINR(c.walkCfr)} sub={fmtUSD(usd(c.walkCfr))} tone="red" />
                <KPI label="Walk-away CIF" value={fmtINR(c.walkCif)} sub={fmtUSD(usd(c.walkCif))} tone="red" />
                <KPI label={`Recommended ${s.incoterm}`} value={fmtINR(incotermPrice)} sub={fmtUSD(usd(incotermPrice))} tone="gold" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="rounded-lg border p-5 space-y-4">
                  <div className="flex items-center gap-2 font-semibold"><TrendingUp className="w-4 h-4 text-gold" />Counter-offer check</div>
                  <p className="text-xs text-muted-foreground -mt-2">Enter what the buyer is proposing — we'll tell you if it's acceptable.</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <NumField label="Buyer counter offer (per unit)" value={s.buyerCounterOffer} onChange={(v) => set("buyerCounterOffer", v)} step={0.01} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Currency</FieldLabel>
                      <Select value={s.buyerCounterCurrency} onValueChange={(v) => set("buyerCounterCurrency", v as "INR" | "USD" | "EUR")}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">INR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <Row label="Counter offer in INR" value={fmtINR(counterINR)} />
                    <Row label="Minimum acceptable" value={fmtINR(minIncotermPrice)} />
                    <Row label="Price gap" value={fmtINR(counterINR - minIncotermPrice)} tone={counterINR >= minIncotermPrice ? "green" : "red"} />
                    <Row label="Net profit at counter" value={fmtINR((counterINR - c.protectedCost / s.quantity) * s.quantity)} />
                    <Row label="Profit % at counter" value={`${fmtNum(((counterINR * s.quantity - c.protectedCost) / Math.max(c.protectedCost, 1)) * 100)}%`} />
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
                    <Row label={`Original ${s.incoterm}`} value={fmtINR(incotermPrice)} />
                    <Row label={`Discounted ${s.incoterm}`} value={fmtINR(discountedPrice)} tone={discountAcceptable ? "green" : "red"} />
                    <Row label="New profit / unit" value={fmtINR(discountedPrice - c.protectedCost / s.quantity)} />
                    <Row label="New profit %" value={`${fmtNum(((discountedPrice * s.quantity - c.protectedCost) / Math.max(c.protectedCost, 1)) * 100)}%`} />
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Row label="Recommended" value={fmtINR(incotermPrice)} />
                  <Row label="Target" value={fmtINR(c.targetSellingPrice)} />
                  <Row label="Minimum acceptable" value={fmtINR(minIncotermPrice)} tone="warn" />
                  <Row label="Walk away" value={fmtINR(walkPrice)} tone="red" />
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
                <KPI label="Δ vs base" value={fmtINR(sc.netProfit - c.netProfit)} tone={sc.netProfit >= c.netProfit ? "green" : "red"} />
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
        </Tabs>

        <footer className="text-center text-xs text-muted-foreground py-6 border-t mt-8">
          <div className="font-semibold tracking-widest" style={{ color: "var(--gold)" }}>VAALDRIN EXPORTS</div>
          <div className="mt-1">Export Pricing & Profit Control · CFO-grade financial control</div>
        </footer>

        <div className="print-area hidden print:block">
          <QuotationPreview s={s} priceINR={incotermPrice} forPrint />
        </div>
      </main>
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

function DirectorCell({ label, inr, usd, tone, big, pct }: {
  label: string; inr: number; usd: number; tone?: "gold" | "warn" | "danger"; big?: boolean; pct?: number;
}) {
  const cls =
    tone === "gold" ? "border-gold/60 bg-gold/15" :
    tone === "warn" ? "border-warning/40 bg-warning/10" :
    tone === "danger" ? "border-deep-red/50 bg-deep-red/10" :
    "border-primary-foreground/15 bg-primary-foreground/5";
  return (
    <div className={"rounded-lg border p-4 " + cls}>
      <div className="text-[10px] uppercase tracking-widest text-primary-foreground/70 font-semibold">{label}</div>
      <div className={"font-bold mt-1.5 tabular-nums " + (big ? "text-xl sm:text-2xl" : "text-base")}>{fmtINR(inr)}</div>
      <div className="text-xs text-primary-foreground/60 tabular-nums mt-0.5">
        {fmtUSD(usd)}
        {pct !== undefined && (
          <span className={"ml-2 font-semibold " + (pct > 15 ? "text-success" : pct >= 8 ? "text-warning" : "text-deep-red")}>
            {fmtNum(pct)}%
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
    <div className="flex justify-between items-center py-1 border-b border-border/40 last:border-0 gap-3">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className={"font-semibold tabular-nums text-sm " + cls}>{value}</span>
    </div>
  );
}

function QuotationPreview({ s, priceINR, forPrint }: { s: CalculatorState; priceINR: number; forPrint?: boolean }) {
  const total = priceINR * s.quantity;
  return (
    <div className={"bg-white text-black p-8 " + (forPrint ? "" : "border rounded-lg")}>
      <div className="flex justify-between items-start border-b-4 pb-4" style={{ borderColor: "var(--gold)" }}>
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: "#1a1a1a" }}>VAALDRIN EXPORTS</h2>
          <div className="text-xs text-gray-600 mt-1 tracking-widest">EXPORT PRICING & PROFIT CONTROL</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold" style={{ color: "var(--deep-red)" }}>EXPORT QUOTATION</div>
          <div className="text-sm mt-1">No: <span className="font-semibold">{s.quotationNumber}</span></div>
          <div className="text-sm">Date: {s.quotationDate}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6 text-sm">
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Buyer</div>
          <div className="font-semibold">{s.buyerCompany || "—"}</div>
          <div>{s.buyerName}</div>
          <div>{s.buyerCountry}</div>
          <div className="text-gray-600">{s.buyerEmail}</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Terms</div>
          <div>Incoterm: <span className="font-semibold">{s.incoterm}</span></div>
          <div>Payment: 30% Advance / 70% B/L</div>
          <div>Validity: 30 days</div>
        </div>
      </div>

      <table className="w-full mt-6 text-sm border-collapse">
        <thead>
          <tr style={{ backgroundColor: "#1a1a1a", color: "var(--gold)" }}>
            <th className="text-left p-2">Product</th>
            <th className="text-left p-2">Grade</th>
            <th className="text-left p-2">HS Code</th>
            <th className="text-right p-2">Qty</th>
            <th className="text-left p-2">UoM</th>
            <th className="text-right p-2">Unit Price (INR)</th>
            <th className="text-right p-2">Total (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="p-2">{s.productName || "—"}</td>
            <td className="p-2">{s.productGrade || "—"}</td>
            <td className="p-2">{s.hsCode || "—"}</td>
            <td className="p-2 text-right">{s.quantity}</td>
            <td className="p-2">{s.uom}</td>
            <td className="p-2 text-right tabular-nums">{fmtINR(priceINR)}</td>
            <td className="p-2 text-right tabular-nums font-bold">{fmtINR(total)}</td>
          </tr>
        </tbody>
      </table>

      <div className="grid grid-cols-3 gap-3 mt-6 text-sm">
        <div className="border p-3 rounded">
          <div className="text-xs uppercase text-gray-500">Total INR</div>
          <div className="font-bold text-lg tabular-nums">{fmtINR(total)}</div>
        </div>
        <div className="border p-3 rounded">
          <div className="text-xs uppercase text-gray-500">Total USD</div>
          <div className="font-bold text-lg tabular-nums">{fmtUSD(total / (s.actualBankUsdRate || 1))}</div>
        </div>
        <div className="border p-3 rounded">
          <div className="text-xs uppercase text-gray-500">Total EUR</div>
          <div className="font-bold text-lg tabular-nums">{fmtEUR(total / (s.actualBankEurRate || 1))}</div>
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-700 leading-relaxed">
        <div className="font-bold uppercase tracking-widest mb-1">Terms & Conditions</div>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Payment Terms: 30% advance, 70% against B/L copy.</li>
          <li>Delivery Terms: {s.incoterm} as per Incoterms 2020.</li>
          <li>Validity: 30 days from quotation date.</li>
          <li>Subject to product availability at time of order confirmation.</li>
          <li>All disputes subject to jurisdiction of issuing office.</li>
        </ul>
      </div>

      <div className="mt-12 flex justify-end">
        <div className="text-right">
          <div className="text-sm font-bold">For Vaaldrin Exports</div>
          <div className="border-t border-gray-400 w-48 mt-12 pt-1 text-xs text-gray-600">Authorized Signatory</div>
        </div>
      </div>
    </div>
  );
}
