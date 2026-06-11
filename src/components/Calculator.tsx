import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  compute, defaultState, fmtINR, fmtUSD, fmtEUR, fmtNum,
  profitColor, applyScenario, type CalculatorState, type Incoterm,
} from "@/lib/calc";
import { generateQuotationPDF } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from "recharts";
import {
  FileDown, Printer, Save, Upload, Copy, RotateCcw, ShieldCheck, AlertTriangle,
  TrendingUp, Lock, Sparkles,
} from "lucide-react";

const STORAGE_KEY = "vaaldrin.calc.v1";

type FieldProps = {
  label: string; value: number; onChange: (n: number) => void;
  step?: number; suffix?: string; readOnly?: boolean;
};
function NumField({ label, value, onChange, step = 1, suffix, readOnly }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          readOnly={readOnly}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={readOnly ? "bg-muted font-semibold" : ""}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (s: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Section({ title, num, children, accent }: { title: string; num: number; children: React.ReactNode; accent?: boolean }) {
  return (
    <Card className={"p-6 " + (accent ? "border-gold/40" : "")}>
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-xs font-bold text-gold tracking-widest">MODULE {String(num).padStart(2, "0")}</span>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <div className="gold-bar mb-5 opacity-40" />
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
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</div>
      <div className="mt-1.5 text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Calculator() {
  const [s, setS] = useState<CalculatorState>(defaultState);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      try { setS({ ...defaultState, ...JSON.parse(raw) }); } catch {}
    }
  }, []);

  const c = useMemo(() => compute(s), [s]);
  const set = <K extends keyof CalculatorState>(k: K, v: CalculatorState[K]) => setS((p) => ({ ...p, [k]: v }));

  const usd = (inr: number) => inr / (s.actualBankUsdRate || 1);
  const eur = (inr: number) => inr / (s.actualBankEurRate || 1);

  const incotermPrice = s.incoterm === "EXW" ? c.exwPrice : s.incoterm === "FOB" ? c.fobPrice : s.incoterm === "CFR" ? c.cfrPrice : c.cifPrice;
  const minIncotermPrice = s.incoterm === "EXW" ? c.minExw : s.incoterm === "FOB" ? c.minFob : s.incoterm === "CFR" ? c.minCfr : c.minCif;
  const walkPrice = s.incoterm === "FOB" ? c.walkFob : s.incoterm === "CFR" ? c.walkCfr : s.incoterm === "CIF" ? c.walkCif : c.walkFob;

  // Buyer counter offer in INR
  const counterINR = s.buyerCounterCurrency === "INR" ? s.buyerCounterOffer :
    s.buyerCounterCurrency === "USD" ? s.buyerCounterOffer * s.actualBankUsdRate :
    s.buyerCounterOffer * s.actualBankEurRate;
  const counterAcceptable = counterINR >= minIncotermPrice;

  // Discount preview
  const discountedPrice = incotermPrice * (1 - s.requestedDiscountPct / 100);
  const discountAcceptable = discountedPrice >= minIncotermPrice;

  // Margin lock check
  const lockTriggered = s.marginLock && (c.profitPct < s.minProfitPct || c.netProfit < s.minProfitAmount);

  // Scenario simulation
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

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    toast.success("Calculation saved");
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
  const reset = () => { setS(defaultState); toast.success("Reset"); };

  const generatePDF = () => {
    if (lockTriggered) { toast.error("Margin lock active — adjust pricing first"); return; }
    generateQuotationPDF(s);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="no-print sticky top-0 z-30 bg-primary text-primary-foreground border-b border-gold/30">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--gold)" }}>VAALDRIN EXPORTS</h1>
              <span className="text-xs text-gold/70 tracking-widest hidden sm:inline">PRICING & PROFIT CONTROL</span>
            </div>
            <p className="text-xs text-primary-foreground/60 mt-0.5">Executive export costing system · CFO-grade financial control</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={save}><Save className="w-4 h-4 mr-1.5" />Save</Button>
            <Button size="sm" variant="secondary" onClick={exportJSON}>Export JSON</Button>
            <Button size="sm" variant="secondary" onClick={importJSON}><Upload className="w-4 h-4 mr-1.5" />Import</Button>
            <Button size="sm" variant="secondary" onClick={duplicate}><Copy className="w-4 h-4 mr-1.5" />Duplicate</Button>
            <Button size="sm" variant="secondary" onClick={reset}><RotateCcw className="w-4 h-4 mr-1.5" />Reset</Button>
            <Button size="sm" onClick={generatePDF} className="bg-gold hover:bg-gold/90 text-gold-foreground"><FileDown className="w-4 h-4 mr-1.5" />PDF</Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="bg-transparent border-gold/40 text-gold hover:bg-gold/10"><Printer className="w-4 h-4 mr-1.5" />Print</Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {/* Executive Director View */}
        <Card className="p-6 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-gold/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs tracking-widest font-bold" style={{ color: "var(--gold)" }}>EXPORT DIRECTOR VIEW</div>
              <h2 className="text-xl font-semibold mt-0.5">Decision Summary · {s.incoterm}</h2>
            </div>
            <div className="text-right">
              <div className="text-xs text-primary-foreground/60 uppercase tracking-widest">Deal Quality</div>
              <div className="text-3xl font-bold" style={{ color: "var(--gold)" }}>{c.dealQualityScore}<span className="text-base text-primary-foreground/50">/100</span></div>
              <div className="text-xs text-primary-foreground/60">
                {c.dealQualityScore >= 90 ? "Excellent" : c.dealQualityScore >= 75 ? "Good" : c.dealQualityScore >= 60 ? "Acceptable" : "High Risk"}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
            <DirectorCell label="EXW" inr={c.exwPrice} usd={usd(c.exwPrice)} />
            <DirectorCell label="FOB" inr={c.fobPrice} usd={usd(c.fobPrice)} />
            <DirectorCell label="CFR" inr={c.cfrPrice} usd={usd(c.cfrPrice)} />
            <DirectorCell label="CIF" inr={c.cifPrice} usd={usd(c.cifPrice)} />
            <DirectorCell label="Break-even" inr={c.breakEvenPrice} usd={usd(c.breakEvenPrice)} />
            <DirectorCell label="Min Acceptable" inr={minIncotermPrice} usd={usd(minIncotermPrice)} tone="warn" />
            <DirectorCell label="Walk Away" inr={walkPrice} usd={usd(walkPrice)} tone="danger" />
            <DirectorCell label="Recommended" inr={incotermPrice} usd={usd(incotermPrice)} tone="gold" />
            <div className="rounded border border-primary-foreground/10 bg-primary-foreground/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-primary-foreground/60">Expected Profit</div>
              <div className="text-base font-bold mt-1">{fmtINR(c.netProfit)}</div>
              <div className={"text-xs font-semibold " + (c.profitPct > 15 ? "text-success" : c.profitPct >= 8 ? "text-warning" : "text-deep-red")}>{fmtNum(c.profitPct)}%</div>
            </div>
            <div className="rounded border border-primary-foreground/10 bg-primary-foreground/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-primary-foreground/60">Risk Level</div>
              <div className={"text-base font-bold mt-1 " + (c.riskLevel === "Low" ? "text-success" : c.riskLevel === "Medium" ? "text-warning" : "text-deep-red")}>{c.riskLevel}</div>
              <div className="text-xs text-primary-foreground/60">Safety {fmtNum(c.marginSafetyScore, 0)}</div>
            </div>
            <div className="rounded border border-primary-foreground/10 bg-primary-foreground/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-primary-foreground/60">Forex Exposure</div>
              <div className="text-base font-bold mt-1">{fmtINR(c.forexExposure)}</div>
              <div className="text-xs text-primary-foreground/60">Bank vs Market</div>
            </div>
            <div className="rounded border border-primary-foreground/10 bg-primary-foreground/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-primary-foreground/60">Negotiation</div>
              <div className={"text-base font-bold mt-1 " + (lockTriggered ? "text-deep-red" : "text-success")}>
                {lockTriggered ? "LOCKED" : "OPEN"}
              </div>
              <div className="text-xs text-primary-foreground/60">{s.marginLock ? "Protection on" : "Protection off"}</div>
            </div>
          </div>
        </Card>

        {lockTriggered && (
          <div className="rounded-lg border-2 border-deep-red bg-deep-red/10 p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-deep-red mt-0.5" />
            <div>
              <div className="font-bold text-deep-red">Quotation Locked — Margin Protection Triggered</div>
              <div className="text-sm text-foreground/80">Current profit {fmtNum(c.profitPct)}% / {fmtINR(c.netProfit)} is below your minimum threshold of {fmtNum(s.minProfitPct)}% / {fmtINR(s.minProfitAmount)}. Adjust pricing or disable margin lock.</div>
            </div>
          </div>
        )}

        <Tabs defaultValue="inputs" className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full bg-secondary">
            <TabsTrigger value="inputs">Inputs</TabsTrigger>
            <TabsTrigger value="profit">Profit Engine</TabsTrigger>
            <TabsTrigger value="incoterms">Incoterm Pricing</TabsTrigger>
            <TabsTrigger value="negotiation">Negotiation</TabsTrigger>
            <TabsTrigger value="scenario">Scenarios</TabsTrigger>
          </TabsList>

          {/* INPUTS */}
          <TabsContent value="inputs" className="space-y-5">
            <Section num={1} title="Shipment Details">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <TextField label="Quotation Number" value={s.quotationNumber} onChange={(v) => set("quotationNumber", v)} />
                <TextField label="Quotation Date" value={s.quotationDate} onChange={(v) => set("quotationDate", v)} type="date" />
                <TextField label="Buyer Name" value={s.buyerName} onChange={(v) => set("buyerName", v)} />
                <TextField label="Buyer Company" value={s.buyerCompany} onChange={(v) => set("buyerCompany", v)} />
                <TextField label="Buyer Country" value={s.buyerCountry} onChange={(v) => set("buyerCountry", v)} />
                <TextField label="Buyer Email" value={s.buyerEmail} onChange={(v) => set("buyerEmail", v)} type="email" />
                <TextField label="Product Name" value={s.productName} onChange={(v) => set("productName", v)} />
                <TextField label="Product Grade" value={s.productGrade} onChange={(v) => set("productGrade", v)} />
                <TextField label="HS Code" value={s.hsCode} onChange={(v) => set("hsCode", v)} />
                <NumField label="Quantity" value={s.quantity} onChange={(v) => set("quantity", v)} />
                <TextField label="Unit of Measure" value={s.uom} onChange={(v) => set("uom", v)} />
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Incoterm</Label>
                  <Select value={s.incoterm} onValueChange={(v) => set("incoterm", v as Incoterm)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["EXW", "FOB", "CFR", "CIF"] as const).map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Section num={2} title="Product Costing">
                <div className="grid grid-cols-2 gap-4">
                  <NumField label="Supplier Price / Unit" value={s.supplierPricePerUnit} onChange={(v) => set("supplierPricePerUnit", v)} suffix="₹" />
                  <NumField label="Quantity" value={s.quantity} onChange={(v) => set("quantity", v)} />
                  <div className="col-span-2"><NumField label="Total Supplier Cost" value={c.supplierTotal} onChange={() => {}} readOnly suffix="₹" /></div>
                </div>
              </Section>

              <Section num={3} title="Packaging Cost">
                <div className="grid grid-cols-2 gap-4">
                  <NumField label="Pouch Cost" value={s.pouchCost} onChange={(v) => set("pouchCost", v)} suffix="₹" />
                  <NumField label="Label Cost" value={s.labelCost} onChange={(v) => set("labelCost", v)} suffix="₹" />
                  <NumField label="Carton Cost" value={s.cartonCost} onChange={(v) => set("cartonCost", v)} suffix="₹" />
                  <NumField label="Pallet Cost" value={s.palletCost} onChange={(v) => set("palletCost", v)} suffix="₹" />
                  <NumField label="Other Packaging" value={s.otherPackaging} onChange={(v) => set("otherPackaging", v)} suffix="₹" />
                  <NumField label="Total Packaging" value={c.packagingTotal} onChange={() => {}} readOnly suffix="₹" />
                </div>
              </Section>

              <Section num={4} title="Inland Logistics">
                <div className="grid grid-cols-2 gap-4">
                  <NumField label="Factory → Warehouse" value={s.factoryToWarehouse} onChange={(v) => set("factoryToWarehouse", v)} suffix="₹" />
                  <NumField label="Warehouse → Port" value={s.warehouseToPort} onChange={(v) => set("warehouseToPort", v)} suffix="₹" />
                  <NumField label="Loading Charges" value={s.loadingCharges} onChange={(v) => set("loadingCharges", v)} suffix="₹" />
                  <NumField label="Unloading Charges" value={s.unloadingCharges} onChange={(v) => set("unloadingCharges", v)} suffix="₹" />
                  <div className="col-span-2"><NumField label="Total Inland Logistics" value={c.inlandTotal} onChange={() => {}} readOnly suffix="₹" /></div>
                </div>
              </Section>

              <Section num={5} title="Documentation & Certification">
                <div className="grid grid-cols-2 gap-4">
                  <NumField label="Certificate of Origin" value={s.certificateOfOrigin} onChange={(v) => set("certificateOfOrigin", v)} suffix="₹" />
                  <NumField label="Phytosanitary" value={s.phytosanitary} onChange={(v) => set("phytosanitary", v)} suffix="₹" />
                  <NumField label="Fumigation" value={s.fumigation} onChange={(v) => set("fumigation", v)} suffix="₹" />
                  <NumField label="Lab Testing" value={s.labTesting} onChange={(v) => set("labTesting", v)} suffix="₹" />
                  <NumField label="Export Documentation" value={s.exportDocs} onChange={(v) => set("exportDocs", v)} suffix="₹" />
                  <NumField label="Other Certification" value={s.otherCertification} onChange={(v) => set("otherCertification", v)} suffix="₹" />
                  <div className="col-span-2"><NumField label="Total Documentation" value={c.documentationTotal} onChange={() => {}} readOnly suffix="₹" /></div>
                </div>
              </Section>

              <Section num={6} title="Customs & Port Charges">
                <div className="grid grid-cols-2 gap-4">
                  <NumField label="CHA Charges" value={s.chaCharges} onChange={(v) => set("chaCharges", v)} suffix="₹" />
                  <NumField label="Port Handling" value={s.portHandling} onChange={(v) => set("portHandling", v)} suffix="₹" />
                  <NumField label="Terminal Handling" value={s.terminalHandling} onChange={(v) => set("terminalHandling", v)} suffix="₹" />
                  <NumField label="Customs Clearance" value={s.customsClearance} onChange={(v) => set("customsClearance", v)} suffix="₹" />
                  <NumField label="Container Handling" value={s.containerHandling} onChange={(v) => set("containerHandling", v)} suffix="₹" />
                  <NumField label="Total Customs & Port" value={c.customsTotal} onChange={() => {}} readOnly suffix="₹" />
                </div>
              </Section>

              <Section num={7} title="Freight Forwarding">
                <div className="grid grid-cols-2 gap-4">
                  <NumField label="Ocean Freight" value={s.oceanFreight} onChange={(v) => set("oceanFreight", v)} suffix="₹" />
                  <NumField label="Air Freight" value={s.airFreight} onChange={(v) => set("airFreight", v)} suffix="₹" />
                  <NumField label="Forwarder Fee" value={s.freightForwarderFee} onChange={(v) => set("freightForwarderFee", v)} suffix="₹" />
                  <NumField label="Local Destination" value={s.localDestination} onChange={(v) => set("localDestination", v)} suffix="₹" />
                  <div className="col-span-2"><NumField label="Total Freight" value={c.freightTotal} onChange={() => {}} readOnly suffix="₹" /></div>
                </div>
              </Section>

              <Section num={8} title="Insurance">
                <div className="grid grid-cols-2 gap-4">
                  <NumField label="Cargo Insurance" value={s.cargoInsurance} onChange={(v) => set("cargoInsurance", v)} suffix="₹" />
                  <NumField label="Insurance Total" value={c.insuranceTotal} onChange={() => {}} readOnly suffix="₹" />
                </div>
              </Section>

              <Section num={9} title="Banking Costs">
                <div className="grid grid-cols-2 gap-4">
                  <NumField label="SWIFT Charges" value={s.swiftCharges} onChange={(v) => set("swiftCharges", v)} suffix="₹" />
                  <NumField label="Bank Charges" value={s.bankCharges} onChange={(v) => set("bankCharges", v)} suffix="₹" />
                  <NumField label="Export Realization" value={s.exportRealization} onChange={(v) => set("exportRealization", v)} suffix="₹" />
                  <NumField label="Currency Conversion" value={s.currencyConversion} onChange={(v) => set("currencyConversion", v)} suffix="₹" />
                  <NumField label="Other Banking" value={s.otherBanking} onChange={(v) => set("otherBanking", v)} suffix="₹" />
                  <NumField label="Total Banking" value={c.bankingTotal} onChange={() => {}} readOnly suffix="₹" />
                </div>
              </Section>

              <Section num={10} title="Miscellaneous & Contingency">
                <div className="grid grid-cols-2 gap-4">
                  <NumField label="Miscellaneous Cost" value={s.miscCost} onChange={(v) => set("miscCost", v)} suffix="₹" />
                  <NumField label="Contingency Buffer" value={s.contingencyPct} onChange={(v) => set("contingencyPct", v)} suffix="%" step={0.1} />
                  <div className="col-span-2"><NumField label="Contingency Amount" value={c.contingencyAmount} onChange={() => {}} readOnly suffix="₹" /></div>
                </div>
              </Section>

              <Section num={11} title="Export Incentives">
                <div className="grid grid-cols-2 gap-4">
                  <NumField label="RoDTEP %" value={s.rodtepPct} onChange={(v) => set("rodtepPct", v)} suffix="%" step={0.1} />
                  <NumField label="Duty Drawback %" value={s.dutyDrawbackPct} onChange={(v) => set("dutyDrawbackPct", v)} suffix="%" step={0.1} />
                  <NumField label="Other Incentives" value={s.otherIncentives} onChange={(v) => set("otherIncentives", v)} suffix="₹" />
                  <NumField label="Total Incentive Value" value={c.incentiveValue} onChange={() => {}} readOnly suffix="₹" />
                </div>
              </Section>

              <Section num={12} title="Currency & Forex Protection" accent>
                <div className="grid grid-cols-2 gap-4">
                  <NumField label="Market USD Rate" value={s.marketUsdRate} onChange={(v) => set("marketUsdRate", v)} step={0.01} suffix="₹" />
                  <NumField label="Actual Bank USD Rate" value={s.actualBankUsdRate} onChange={(v) => set("actualBankUsdRate", v)} step={0.01} suffix="₹" />
                  <NumField label="Market EUR Rate" value={s.marketEurRate} onChange={(v) => set("marketEurRate", v)} step={0.01} suffix="₹" />
                  <NumField label="Actual Bank EUR Rate" value={s.actualBankEurRate} onChange={(v) => set("actualBankEurRate", v)} step={0.01} suffix="₹" />
                  <NumField label="Forex Risk Buffer" value={s.forexBufferPct} onChange={(v) => set("forexBufferPct", v)} step={0.1} suffix="%" />
                  <NumField label="Forex Buffer Amount" value={c.forexBufferAmount} onChange={() => {}} readOnly suffix="₹" />
                </div>
                <div className="mt-3 text-xs text-muted-foreground italic">Profit is always computed using the actual bank conversion rate.</div>
              </Section>
            </div>
          </TabsContent>

          {/* PROFIT ENGINE */}
          <TabsContent value="profit" className="space-y-5">
            <Section num={13} title="Profit Control Engine" accent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <NumField label="Target Profit %" value={s.targetProfitPct} onChange={(v) => set("targetProfitPct", v)} suffix="%" step={0.5} />
                <NumField label="Minimum Profit Amount" value={s.minProfitAmount} onChange={(v) => set("minProfitAmount", v)} suffix="₹" />
                <NumField label="Minimum Profit %" value={s.minProfitPct} onChange={(v) => set("minProfitPct", v)} suffix="%" step={0.5} />
                <NumField label="Container Size" value={s.containerKg} onChange={(v) => set("containerKg", v)} suffix="kg" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <KPI label="Total Cost" value={fmtINR(c.totalCost)} />
                <KPI label="Effective Cost" value={fmtINR(c.effectiveCost)} sub={`− ${fmtINR(c.incentiveValue)} incentives`} />
                <KPI label="Protected Cost" value={fmtINR(c.protectedCost)} sub={`+ buffers ${fmtINR(c.contingencyAmount + c.forexBufferAmount)}`} />
                <KPI label="Break-even Price" value={fmtINR(c.breakEvenPrice)} sub={`${fmtUSD(usd(c.breakEvenPrice))} / unit`} />
                <KPI label="Target Selling Price" value={fmtINR(c.targetSellingPrice)} sub={`${fmtUSD(usd(c.targetSellingPrice))} / unit`} tone="gold" />
                <KPI label="Net Profit" value={fmtINR(c.netProfit)} tone={c.profitPct > 15 ? "green" : c.profitPct >= 8 ? "warn" : "red"} />
                <KPI label="Profit %" value={`${fmtNum(c.profitPct)}%`} tone={c.profitPct > 15 ? "green" : c.profitPct >= 8 ? "warn" : "red"} />
                <KPI label="Profit / Unit" value={fmtINR(c.profitPerUnit)} />
                <KPI label="Profit / KG" value={fmtINR(c.profitPerKg)} />
                <KPI label="Profit / Container" value={fmtINR(c.profitPerContainer)} sub={`${s.containerKg} kg`} />
                <KPI label="Margin Safety" value={`${fmtNum(c.marginSafetyScore, 0)} / 100`} />
                <KPI label="Risk Level" value={c.riskLevel} tone={c.riskLevel === "Low" ? "green" : c.riskLevel === "Medium" ? "warn" : "red"} />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Switch checked={s.marginLock} onCheckedChange={(v) => set("marginLock", v)} id="margin-lock" />
                <Label htmlFor="margin-lock" className="cursor-pointer flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-gold" />
                  Margin Protection Lock — block quotations below minimum thresholds
                </Label>
              </div>
            </Section>

            <Section num={16} title="Profit Waterfall (per unit)">
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
            </Section>
          </TabsContent>

          {/* INCOTERMS */}
          <TabsContent value="incoterms" className="space-y-5">
            <Section num={14} title="Incoterm Pricing Engine">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gold/30 bg-gold/5">
                      <th className="text-left p-3 font-semibold">Incoterm</th>
                      <th className="text-right p-3 font-semibold">Per Unit (INR)</th>
                      <th className="text-right p-3 font-semibold">Per Unit (USD)</th>
                      <th className="text-right p-3 font-semibold">Per Unit (EUR)</th>
                      <th className="text-right p-3 font-semibold">Total Shipment (INR)</th>
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
            </Section>

            <Section num={17} title="Professional Quotation Preview">
              <QuotationPreview s={s} priceINR={incotermPrice} />
            </Section>
          </TabsContent>

          {/* NEGOTIATION */}
          <TabsContent value="negotiation" className="space-y-5">
            <Section num={22} title="Negotiation & Profit Protection Engine" accent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
                <KPI label={`Min Acceptable EXW`} value={fmtINR(c.minExw)} sub={fmtUSD(usd(c.minExw))} tone="warn" />
                <KPI label={`Min Acceptable FOB`} value={fmtINR(c.minFob)} sub={fmtUSD(usd(c.minFob))} tone="warn" />
                <KPI label={`Min Acceptable CFR`} value={fmtINR(c.minCfr)} sub={fmtUSD(usd(c.minCfr))} tone="warn" />
                <KPI label={`Min Acceptable CIF`} value={fmtINR(c.minCif)} sub={fmtUSD(usd(c.minCif))} tone="warn" />
                <KPI label={`Walk Away FOB`} value={fmtINR(c.walkFob)} sub={fmtUSD(usd(c.walkFob))} tone="red" />
                <KPI label={`Walk Away CFR`} value={fmtINR(c.walkCfr)} sub={fmtUSD(usd(c.walkCfr))} tone="red" />
                <KPI label={`Walk Away CIF`} value={fmtINR(c.walkCif)} sub={fmtUSD(usd(c.walkCif))} tone="red" />
                <KPI label={`Recommended ${s.incoterm}`} value={fmtINR(incotermPrice)} sub={fmtUSD(usd(incotermPrice))} tone="gold" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="rounded-lg border p-5 space-y-4">
                  <div className="flex items-center gap-2 font-semibold"><TrendingUp className="w-4 h-4 text-gold" />Live Buyer Counter-Offer Simulator</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <NumField label="Buyer Counter Offer (per unit)" value={s.buyerCounterOffer} onChange={(v) => set("buyerCounterOffer", v)} step={0.01} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Currency</Label>
                      <Select value={s.buyerCounterCurrency} onValueChange={(v) => set("buyerCounterCurrency", v as "INR" | "USD" | "EUR")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <div className="flex items-center gap-2 font-semibold"><Sparkles className="w-4 h-4 text-gold" />Discount Control</div>
                  <NumField label="Requested Discount %" value={s.requestedDiscountPct} onChange={(v) => set("requestedDiscountPct", v)} step={0.5} suffix="%" />
                  <div className="space-y-2 text-sm">
                    <Row label={`Original ${s.incoterm}`} value={fmtINR(incotermPrice)} />
                    <Row label={`Discounted ${s.incoterm}`} value={fmtINR(discountedPrice)} tone={discountAcceptable ? "green" : "red"} />
                    <Row label="New profit / unit" value={fmtINR(discountedPrice - c.protectedCost / s.quantity)} />
                    <Row label="New profit %" value={`${fmtNum(((discountedPrice * s.quantity - c.protectedCost) / Math.max(c.protectedCost, 1)) * 100)}%`} />
                  </div>
                  <div className={"rounded-md p-3 text-sm " + (discountAcceptable ? "bg-success/10 text-success" : "bg-deep-red/10 text-deep-red")}>
                    {discountAcceptable
                      ? `Discount acceptable. Projected profit remains above minimum.`
                      : `Discount not recommended. Profit falls below required threshold.`}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-lg border bg-secondary/30 p-5">
                <div className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-deep-red" />Negotiation Summary Card</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Row label="Recommended" value={fmtINR(incotermPrice)} />
                  <Row label="Target" value={fmtINR(c.targetSellingPrice)} />
                  <Row label="Minimum acceptable" value={fmtINR(minIncotermPrice)} tone="warn" />
                  <Row label="Walk away" value={fmtINR(walkPrice)} tone="red" />
                  <Row label="Expected profit" value={fmtINR(c.netProfit)} tone={c.profitPct > 15 ? "green" : c.profitPct >= 8 ? "warn" : "red"} />
                  <Row label="Profit %" value={`${fmtNum(c.profitPct)}%`} />
                  <Row label="Risk level" value={c.riskLevel} />
                  <Row label="Forex exposure" value={fmtINR(c.forexExposure)} />
                  <Row label="Deal quality score" value={`${c.dealQualityScore} / 100`} tone={c.dealQualityScore >= 75 ? "green" : c.dealQualityScore >= 60 ? "warn" : "red"} />
                </div>
              </div>
            </Section>
          </TabsContent>

          {/* SCENARIOS */}
          <TabsContent value="scenario" className="space-y-5">
            <Section num={15} title="Scenario Simulator">
              <div className="flex flex-wrap gap-2 mb-5">
                {[
                  { id: "base", label: "Base Case" },
                  { id: "freight+10", label: "Freight +10%" },
                  { id: "freight+20", label: "Freight +20%" },
                  { id: "usd-2", label: "USD Drops 2%" },
                  { id: "usd-5", label: "USD Drops 5%" },
                  { id: "packaging+5", label: "Packaging +5%" },
                  { id: "bank-2", label: "Bank Rate Drops 2%" },
                ].map((b) => (
                  <Button key={b.id} variant={scenario === b.id ? "default" : "outline"}
                    onClick={() => setScenario(b.id)}
                    className={scenario === b.id ? "bg-primary text-primary-foreground" : ""}>
                    {b.label}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <KPI label="Profit (scenario)" value={fmtINR(sc.netProfit)} tone={sc.profitPct > 15 ? "green" : sc.profitPct >= 8 ? "warn" : "red"} />
                <KPI label="Margin %" value={`${fmtNum(sc.profitPct)}%`} tone={sc.profitPct > 15 ? "green" : sc.profitPct >= 8 ? "warn" : "red"} />
                <KPI label="Break-even" value={fmtINR(sc.breakEvenPrice)} />
                <KPI label="FOB" value={fmtINR(sc.fobPrice)} />
                <KPI label="CIF" value={fmtINR(sc.cifPrice)} />
                <KPI label="Δ vs Base profit" value={fmtINR(sc.netProfit - c.netProfit)} tone={sc.netProfit >= c.netProfit ? "green" : "red"} />
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
            </Section>
          </TabsContent>
        </Tabs>

        <footer className="text-center text-xs text-muted-foreground py-6 border-t mt-8">
          <div className="font-semibold tracking-widest" style={{ color: "var(--gold)" }}>VAALDRIN EXPORTS</div>
          <div className="mt-1">Export Pricing & Profit Control · CFO-grade financial control</div>
        </footer>

        {/* Hidden print area */}
        <div className="print-area hidden print:block">
          <QuotationPreview s={s} priceINR={incotermPrice} forPrint />
        </div>
      </main>
    </div>
  );
}

function DirectorCell({ label, inr, usd, tone }: { label: string; inr: number; usd: number; tone?: "gold" | "warn" | "danger" }) {
  const cls =
    tone === "gold" ? "border-gold/60 bg-gold/10" :
    tone === "warn" ? "border-warning/40 bg-warning/10" :
    tone === "danger" ? "border-deep-red/50 bg-deep-red/10" :
    "border-primary-foreground/10 bg-primary-foreground/5";
  return (
    <div className={"rounded border p-3 " + cls}>
      <div className="text-[10px] uppercase tracking-widest text-primary-foreground/70">{label}</div>
      <div className="text-base font-bold mt-1 tabular-nums">{fmtINR(inr)}</div>
      <div className="text-xs text-primary-foreground/60 tabular-nums">{fmtUSD(usd)}</div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" | "warn" }) {
  const cls = tone === "green" ? "text-success" : tone === "red" ? "text-deep-red" : tone === "warn" ? "text-warning" : "";
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={"font-semibold tabular-nums " + cls}>{value}</span>
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
