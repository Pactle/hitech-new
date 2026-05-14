"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnDef,
  useReactTable
} from "@tanstack/react-table";
import {
  ArrowDownToLine,
  Calculator,
  FileDown,
  FileSpreadsheet,
  PackageCheck,
  Plus,
  Printer,
  Search,
  Sparkles,
  Truck,
  UploadCloud,
  Weight,
  X
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import * as XLSX from "xlsx";
import { Sidebar } from "@/components/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MetricCard } from "@/components/metric-card";
import { TRAILER_12M_CAPACITY } from "@/lib/capacity";
import { getDefaultWeightPerMeter, getDiametersForPn, PN_OPTIONS } from "@/lib/pipe-options";
import { formatCurrency, formatInteger, formatNumber } from "@/lib/utils";
import { useQuotationStore } from "@/store/quotation-store";
import type { FamilyStep, ParsedInquiry, PipeItem, QuoteSettings, QuotationLine } from "@/types/quotation";

type ModeSettings = Pick<QuoteSettings, "nestingMode" | "vehicleType" | "finalRounding">;

export function QuotationWorkspace() {
  const { inquiry, items, settings, calculation, setInquiry, updateItem, addItem, updateSettings, loadDemo, loadDemoSuite2, clear } =
    useQuotationStore();
  const [query, setQuery] = useState("");
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const hasItems = items.length > 0;

  const form = useForm<QuoteSettings>({
    values: settings
  });

  const watchedSettings = form.watch();
  useEffect(() => {
    updateSettings(watchedSettings);
  }, [
    watchedSettings.finalRounding,
    watchedSettings.freightPerTrailer,
    watchedSettings.gstPercent,
    watchedSettings.nestingMode,
    watchedSettings.roundPipePieces,
    watchedSettings.tpiPercent,
    watchedSettings.vehicleType,
    updateSettings
  ]);

  const columns = useMemo<ColumnDef<PipeItem>[]>(
    () => [
      {
        accessorKey: "description",
        header: "Item description",
        cell: ({ row }) => (
          <EditableCell value={row.original.description} onChange={(value) => updateItem(row.original.id, "description", value)} />
        )
      },
      {
        accessorKey: "pn",
        header: "PN",
        cell: ({ row }) => (
          <EditableCell numeric value={row.original.pn} onChange={(value) => updateItem(row.original.id, "pn", value)} />
        )
      },
      {
        accessorKey: "dn",
        header: "DN",
        cell: ({ row }) => (
          <EditableCell numeric value={row.original.dn} onChange={(value) => updateItem(row.original.id, "dn", value)} />
        )
      },
      { accessorKey: "uom", header: "UOM" },
      {
        accessorKey: "qty",
        header: "Qty (m)",
        cell: ({ row }) => (
          <EditableCell numeric value={row.original.qty} onChange={(value) => updateItem(row.original.id, "qty", value)} />
        )
      },
      {
        accessorKey: "wtPerMeter",
        header: "Wt/m",
        cell: ({ row }) => (
          <EditableCell
            numeric
            value={row.original.wtPerMeter}
            onChange={(value) => updateItem(row.original.id, "wtPerMeter", value)}
          />
        )
      },
      {
        accessorKey: "rateKg",
        header: "Rate/kg",
        cell: ({ row }) => (
          <EditableCell numeric value={row.original.rateKg} onChange={(value) => updateItem(row.original.id, "rateKg", value)} />
        )
      },
      {
        accessorKey: "rateMeter",
        header: "Rate/m",
        cell: ({ row }) => formatNumber(row.original.rateMeter)
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => formatCurrency(row.original.amount, 0)
      },
      {
        accessorKey: "totalWeight",
        header: "Total weight",
        cell: ({ row }) => formatInteger(row.original.totalWeight)
      }
    ],
    [updateItem]
  );

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => `${item.description} ${item.pn} ${item.dn}`.toLowerCase().includes(needle));
  }, [items, query]);

  const table = useReactTable({
    data: filteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });

  async function handleFile(file: File | null, modeSettings: Pick<QuoteSettings, "nestingMode" | "vehicleType" | "finalRounding">) {
    if (!file) return;

    updateSettings(modeSettings);
    setUploadState("uploading");
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    try {
      await fetch("/api/upload", { method: "POST", body: uploadForm });

      setUploadState("processing");
      const parseResponse = await fetch("/api/parse", { method: "POST", body: uploadForm });
      if (!parseResponse.ok) {
        throw new Error("Parse failed");
      }
      const parsed = (await parseResponse.json()) as ParsedInquiry;
      setInquiry(parsed);
      setUploadState("done");
      setUploadModalOpen(false);
      setPendingUploadFile(null);
    } catch {
      setUploadState("error");
    }
  }

  async function exportPdf() {
    if (!hasItems) return;
    const response = await fetch("/api/export/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inquiry: { ...inquiry, items }, items, settings })
    });
    const blob = await response.blob();
    downloadBlob(blob, `${inquiry.quoteId}.pdf`);
  }

  function exportExcel() {
    if (!hasItems) return;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(calculation.lines), "Quotation");
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        calculation.nesting.families.flatMap((family) =>
          family.steps.map((step) => ({
            family: family.name,
            pn: family.pn,
            mode: family.mode,
            ...step
          }))
        )
      ),
      "Nesting"
    );
    XLSX.writeFile(workbook, `${inquiry.quoteId}.xlsx`);
  }

  return (
    <div className="flex min-h-screen bg-background text-ink">
      <Sidebar />
      <main className="erp-grid min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-steel">
                <span>Dashboard</span>
                <span>/</span>
                <span>Quotations</span>
              </div>
              <h1 className="mt-1 text-2xl font-semibold text-ink">Quotations</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="subtle" size="sm" onClick={loadDemo}>
                <Sparkles className="h-4 w-4" />
                Demo 1
              </Button>
              <Button variant="outline" size="sm" onClick={loadDemoSuite2}>
                <Sparkles className="h-4 w-4" />
                Demo 2
              </Button>
              {hasItems ? (
                <Button variant="outline" size="sm" onClick={clear}>
                  Clear
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" onClick={exportExcel} disabled={!hasItems}>
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button onClick={exportPdf} disabled={!hasItems}>
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        </header>

        <div className="space-y-5 p-4 md:p-6">
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 xl:grid-cols-[1fr_340px]">
            <Card>
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Quote details</CardTitle>
                  <p className="mt-1 text-xs text-steel">{inquiry.quoteId}</p>
                </div>
                <Badge>{hasItems ? "calculated" : uploadState === "idle" ? "waiting for inquiry" : uploadState}</Badge>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <Detail label="Date" value={inquiry.date} />
                <Detail label="Created by" value={inquiry.createdBy} />
                <Detail label="Customer" value={inquiry.customer} />
                <Detail label="Location" value={inquiry.location} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inquiry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed bg-muted px-3 py-5 text-sm font-medium text-steel transition hover:border-primary hover:text-primary"
                  onClick={() => setUploadModalOpen(true)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    setPendingUploadFile(event.dataTransfer.files[0] ?? null);
                    setUploadModalOpen(true);
                  }}
                >
                  <UploadCloud className="h-5 w-5" />
                  Upload document for Reducto
                </button>
                <p className="text-xs leading-relaxed text-steel">
                  Drop a PDF, image, or Excel sheet to parse live with Reducto. Use Demo data only when you want to inspect the reference calculation.
                </p>
                <div className="flex flex-wrap gap-2">
                  {inquiry.attachments.length > 0 ? (
                    inquiry.attachments.map((attachment) => (
                      <Badge key={attachment} className="bg-white">
                        {attachment}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-steel">No attachments yet</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard icon={Weight} label="Total weight" value={`${formatInteger(calculation.totals.totalWeight)} kg`} />
            <MetricCard
              icon={Truck}
              label={settings.vehicleType === "truck" ? "Total trucks" : "Total trailers"}
              value={formatInteger(calculation.totals.totalVehicles)}
              helper={`${formatNumber(calculation.nesting.totalPartialTrailers)} partial`}
            />
            <MetricCard icon={PackageCheck} label="Freight cost" value={formatCurrency(calculation.totals.totalFreight, 0)} />
            <MetricCard icon={Calculator} label="Freight per meter" value={formatCurrency(calculation.totals.freightPerMeter)} />
            <MetricCard icon={ArrowDownToLine} label="Total value" value={formatCurrency(calculation.totals.grandTotal, 0)} />
          </section>

          <section className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle>Items Table</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-steel" />
                    <Input className="w-56 pl-8" placeholder="Search items" value={query} onChange={(event) => setQuery(event.target.value)} />
                  </div>
                  <Button variant="outline" onClick={() => setManualModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[520px] overflow-auto">
                  <table className="w-full min-w-[1120px] border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-secondary text-xs uppercase text-steel">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          <th className="w-12 border-b px-3 py-2 text-left">#</th>
                          {headerGroup.headers.map((header) => (
                            <th key={header.id} className="border-b px-3 py-2 text-left font-semibold">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.length > 0 ? (
                        table.getRowModel().rows.map((row, index) => (
                          <tr key={row.id} className="border-b bg-white hover:bg-muted/60">
                            <td className="px-3 py-2 text-xs text-steel">{String(index + 1).padStart(2, "0")}.</td>
                            {row.getVisibleCells().map((cell) => (
                              <td key={cell.id} className="px-3 py-2 align-middle">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columns.length + 1}>
                            <EmptyTableState onUpload={() => setUploadModalOpen(true)} onDemo={loadDemo} onDemoSuite2={loadDemoSuite2} />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <NestingPanel />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
            <FinalQuotationTable lines={calculation.lines} />
            <Card>
              <CardHeader>
                <CardTitle>Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingsForm form={form} />
                <div className="space-y-2 border-t pt-4 text-sm">
                  <SummaryRow label="Subtotal" value={formatCurrency(calculation.totals.subtotalWithoutTax)} />
                  <SummaryRow label="GST" value={formatCurrency(calculation.totals.gstTotal)} />
                  <SummaryRow strong label="Grand Total" value={formatCurrency(calculation.totals.grandTotal)} />
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
        <ManualItemModal
          open={manualModalOpen}
          settings={settings}
          onClose={() => setManualModalOpen(false)}
          onSubmit={(item, modeSettings) => {
            updateSettings(modeSettings);
            addItem(item);
            setManualModalOpen(false);
          }}
        />
        <UploadDocumentModal
          open={uploadModalOpen}
          settings={settings}
          pendingFile={pendingUploadFile}
          uploadState={uploadState}
          onClose={() => {
            setUploadModalOpen(false);
            setPendingUploadFile(null);
          }}
          onSubmit={(file, modeSettings) => void handleFile(file, modeSettings)}
          onFileChange={setPendingUploadFile}
        />
      </main>
    </div>
  );
}

function EditableCell({
  value,
  numeric,
  onChange
}: {
  value: string | number;
  numeric?: boolean;
  onChange: (value: string | number) => void;
}) {
  return (
    <Input
      type={numeric ? "number" : "text"}
      value={value}
      onChange={(event) => onChange(numeric ? Number(event.target.value) : event.target.value)}
      className="min-w-20 border-transparent bg-transparent px-0 focus:bg-white focus:px-2"
    />
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-steel">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function ManualItemModal({
  open,
  settings,
  onClose,
  onSubmit
}: {
  open: boolean;
  settings: QuoteSettings;
  onClose: () => void;
  onSubmit: (item: PipeItem, modeSettings: ModeSettings) => void;
}) {
  const [pn, setPn] = useState<number>(4);
  const [dn, setDn] = useState<number>(90);
  const [qty, setQty] = useState<number>(0);
  const [rateKg, setRateKg] = useState<number>(165);
  const [vehicleType, setVehicleType] = useState<QuoteSettings["vehicleType"]>(settings.vehicleType);
  const [nestingMode, setNestingMode] = useState<QuoteSettings["nestingMode"]>(settings.nestingMode);
  const [finalRounding, setFinalRounding] = useState<QuoteSettings["finalRounding"]>(settings.finalRounding);
  const diameters = getDiametersForPn(pn);
  const wtPerMeter = getDefaultWeightPerMeter(dn);
  const rateMeter = Number((wtPerMeter * rateKg).toFixed(2));

  useEffect(() => {
    if (!diameters.includes(dn)) {
      setDn(diameters[0]);
    }
  }, [diameters, dn]);

  useEffect(() => {
    if (open) {
      setVehicleType(settings.vehicleType);
      setNestingMode(settings.nestingMode);
      setFinalRounding(settings.finalRounding);
    }
  }, [open, settings.finalRounding, settings.nestingMode, settings.vehicleType]);

  if (!open) return null;

  function submit() {
    const safeQty = Math.max(Number(qty) || 0, 0);
    const amount = Number((safeQty * rateMeter).toFixed(2));
    const item: PipeItem = {
      id: crypto.randomUUID(),
      description: `PE100 PN${pn} DN${dn}`,
      pn,
      dn,
      uom: "Rmt",
      qty: safeQty,
      wtPerMeter,
      rateKg,
      rateMeter,
      amount,
      totalWeight: Number((safeQty * wtPerMeter).toFixed(2))
    };

    onSubmit(item, { nestingMode, vehicleType, finalRounding });
  }

  return (
    <ModalShell title="Add item" onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="PN class" value={String(pn)} onChange={(value) => setPn(Number(value))}>
            {PN_OPTIONS.map((option) => (
              <option key={option} value={option}>
                PE100 PN{option}
              </option>
            ))}
          </SelectField>
          <SelectField label="Diameter" value={String(dn)} onChange={(value) => setDn(Number(value))}>
            {diameters.map((option) => (
              <option key={option} value={option}>
                DN {option}
              </option>
            ))}
          </SelectField>
          <label className="grid gap-1 text-xs font-medium text-steel">
            Quantity in Rmt
            <Input min={0} type="number" value={qty} onChange={(event) => setQty(Number(event.target.value))} />
          </label>
          <label className="grid gap-1 text-xs font-medium text-steel">
            Rate / kg
            <Input min={0} type="number" value={rateKg} onChange={(event) => setRateKg(Number(event.target.value))} />
          </label>
        </div>

        <ModeSelector
          vehicleType={vehicleType}
          nestingMode={nestingMode}
          finalRounding={finalRounding}
          onVehicleTypeChange={setVehicleType}
          onNestingModeChange={setNestingMode}
          onFinalRoundingChange={setFinalRounding}
        />

        <div className="grid grid-cols-3 gap-2 rounded-md bg-muted p-3 text-xs">
          <SummaryTile label="Wt/m" value={formatNumber(wtPerMeter, 3)} />
          <SummaryTile label="Rate/m" value={formatNumber(rateMeter)} />
          <SummaryTile label="Amount" value={formatCurrency(qty * rateMeter, 0)} />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!qty || qty <= 0}>
            Add item
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function UploadDocumentModal({
  open,
  settings,
  pendingFile,
  uploadState,
  onClose,
  onSubmit,
  onFileChange
}: {
  open: boolean;
  settings: QuoteSettings;
  pendingFile: File | null;
  uploadState: "idle" | "uploading" | "processing" | "done" | "error";
  onClose: () => void;
  onSubmit: (file: File | null, modeSettings: ModeSettings) => void;
  onFileChange: (file: File | null) => void;
}) {
  const [vehicleType, setVehicleType] = useState<QuoteSettings["vehicleType"]>(settings.vehicleType);
  const [nestingMode, setNestingMode] = useState<QuoteSettings["nestingMode"]>(settings.nestingMode);
  const [finalRounding, setFinalRounding] = useState<QuoteSettings["finalRounding"]>(settings.finalRounding);

  useEffect(() => {
    if (open) {
      setVehicleType(settings.vehicleType);
      setNestingMode(settings.nestingMode);
      setFinalRounding(settings.finalRounding);
    }
  }, [open, settings.finalRounding, settings.nestingMode, settings.vehicleType]);

  if (!open) return null;

  const busy = uploadState === "uploading" || uploadState === "processing";

  return (
    <ModalShell title="Upload inquiry" onClose={onClose}>
      <div className="grid gap-4">
        <ModeSelector
          vehicleType={vehicleType}
          nestingMode={nestingMode}
          finalRounding={finalRounding}
          onVehicleTypeChange={setVehicleType}
          onNestingModeChange={setNestingMode}
          onFinalRoundingChange={setFinalRounding}
        />

        <label className="grid gap-2 rounded-lg border border-dashed bg-muted p-4 text-sm text-steel">
          <span className="flex items-center gap-2 font-medium text-ink">
            <UploadCloud className="h-4 w-4" />
            Select document for Reducto
          </span>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
          {pendingFile ? <span className="text-xs text-primary">{pendingFile.name}</span> : null}
        </label>

        {uploadState === "error" ? <p className="text-xs font-medium text-red-600">Upload or parsing failed. Please try again.</p> : null}
        {busy ? <p className="text-xs font-medium text-primary">{uploadState === "uploading" ? "Uploading document..." : "Parsing with Reducto..."}</p> : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(pendingFile, { nestingMode, vehicleType, finalRounding })} disabled={!pendingFile || busy}>
            Send to Reducto
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function ModeSelector({
  vehicleType,
  nestingMode,
  finalRounding,
  onVehicleTypeChange,
  onNestingModeChange,
  onFinalRoundingChange
}: {
  vehicleType: QuoteSettings["vehicleType"];
  nestingMode: QuoteSettings["nestingMode"];
  finalRounding: QuoteSettings["finalRounding"];
  onVehicleTypeChange: (value: QuoteSettings["vehicleType"]) => void;
  onNestingModeChange: (value: QuoteSettings["nestingMode"]) => void;
  onFinalRoundingChange: (value: QuoteSettings["finalRounding"]) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <SelectField label="Vehicle" value={vehicleType} onChange={(value) => onVehicleTypeChange(value as QuoteSettings["vehicleType"])}>
        <option value="trailer">Trailer - 12m</option>
        <option value="truck">Truck - 6m / coil</option>
      </SelectField>
      <SelectField label="Algorithm" value={nestingMode} onChange={(value) => onNestingModeChange(value as QuoteSettings["nestingMode"])}>
        <option value="subtractive">Standard</option>
        <option value="stacked-waterfall">Stacked</option>
        <option value="reference-hybrid">Reference hybrid</option>
      </SelectField>
      <SelectField label="Rounding" value={finalRounding} onChange={(value) => onFinalRoundingChange(value as QuoteSettings["finalRounding"])}>
        <option value="ceil">Round up</option>
        <option value="nearest">Nearest</option>
        <option value="floor">Round down</option>
      </SelectField>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-steel">
      {label}
      <select
        className="h-8 rounded-md border bg-white px-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-2xl rounded-lg border bg-white shadow-panel">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function SettingsForm({ form }: { form: ReturnType<typeof useForm<QuoteSettings>> }) {
  const vehicleType = form.watch("vehicleType");

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-xs font-medium text-steel">
        Nesting mode
        <select
          className="h-8 rounded-md border bg-white px-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          {...form.register("nestingMode")}
        >
          <option value="subtractive">Subtractive waterfall</option>
          <option value="stacked-waterfall">Stacked waterfall</option>
          <option value="reference-hybrid">Reference hybrid</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs font-medium text-steel">
        Vehicle type
        <select
          className="h-8 rounded-md border bg-white px-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          {...form.register("vehicleType")}
        >
          <option value="trailer">Trailer - 12m</option>
          <option value="truck">Truck - 6m / coil</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs font-medium text-steel">
        Freight per {vehicleType === "truck" ? "truck" : "trailer"}
        <Input type="number" {...form.register("freightPerTrailer", { valueAsNumber: true })} />
      </label>
      <label className="grid gap-1 text-xs font-medium text-steel">
        TPI %
        <Input step="0.01" type="number" {...form.register("tpiPercent", { valueAsNumber: true })} />
      </label>
      <label className="grid gap-1 text-xs font-medium text-steel">
        GST %
        <Input step="0.01" type="number" {...form.register("gstPercent", { valueAsNumber: true })} />
      </label>
      <label className="flex items-center gap-2 text-xs font-medium text-steel">
        <input type="checkbox" className="h-4 w-4 rounded border" {...form.register("roundPipePieces")} />
        Round up pipe pieces
      </label>
      <label className="grid gap-1 text-xs font-medium text-steel">
        Final rounding
        <select
          className="h-8 rounded-md border bg-white px-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          {...form.register("finalRounding")}
        >
          <option value="ceil">Round up</option>
          <option value="nearest">Nearest whole</option>
          <option value="floor">Round down</option>
        </select>
      </label>
    </div>
  );
}

function NestingPanel() {
  const calculation = useQuotationStore((state) => state.calculation);
  const loadDemo = useQuotationStore((state) => state.loadDemo);
  const hasFamilies = calculation.nesting.families.length > 0;
  const chartData = calculation.nesting.families.map((family) => ({
    name: family.name.replace("Family ", ""),
    trailers: Number(family.subtotalTrailers.toFixed(2))
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nesting & Freight Calculation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasFamilies ? (
          <EmptyPanelState
            title="No nesting calculation yet"
            body="Upload an inquiry or load demo data to generate family waterfalls, residuals, slots, and trailer counts."
            actionLabel="Load demo data"
            onAction={loadDemo}
          />
        ) : (
          <>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <SummaryTile label="Partial count" value={formatNumber(calculation.nesting.totalPartialTrailers)} />
          <SummaryTile
            label={calculation.nesting.vehicleType === "truck" ? "Rounded trucks" : "Rounded trailers"}
            value={formatInteger(calculation.nesting.totalVehicles)}
          />
        </div>
        <MiniBars data={chartData} />
        <div className="space-y-2">
          {calculation.nesting.families.map((family) => (
            <details key={family.id} className="rounded-md border bg-white" open={family.name.includes("Black")}>
              <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-ink">
                {family.name}: {formatNumber(family.subtotalTrailers)} trailers
              </summary>
              <div className="space-y-2 border-t p-3">
                {family.steps.map((step) => (
                  <WaterfallStep key={`${family.id}-${step.dn}`} step={step} />
                ))}
              </div>
            </details>
          ))}
        </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MiniBars({ data }: { data: { name: string; trailers: number }[] }) {
  return (
    <div className="h-44 rounded-md border bg-white p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 8 }}>
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
          <Tooltip formatter={(value) => formatNumber(Number(value))} cursor={{ fill: "rgba(27, 127, 90, 0.08)" }} />
          <Bar dataKey="trailers" fill="#1b7f5a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function WaterfallStep({ step }: { step: FamilyStep }) {
  return (
    <div className="rounded-md bg-muted p-3 text-xs">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink">DN {step.dn}</p>
        <p className="text-steel">Cap: {TRAILER_12M_CAPACITY[step.dn] ?? step.capacity}</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-steel">
        <span>{formatNumber(step.totalSticks, 0)} total sticks</span>
        <span>{formatNumber(step.nestedSticks, 0)} nested</span>
        <span>{formatNumber(step.residualSticks, 0)} residual</span>
        <span>{formatNumber(step.fractionalTrailers)} trailers</span>
        <span>{formatNumber(step.slotsBefore, 0)} slots before</span>
        <span>{formatNumber(step.slotsAfter, 0)} slots after</span>
      </div>
    </div>
  );
}

function FinalQuotationTable({ lines }: { lines: QuotationLine[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Final quotation</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {lines.length === 0 ? (
          <EmptyPanelState
            title="No quotation lines"
            body="Parsed or demo rows will appear here with TPI, freight per meter, GST, final rate, and amount."
          />
        ) : (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead className="sticky top-0 bg-secondary text-xs uppercase text-steel">
              <tr>
                {["#", "Item description", "Rate/m", "TPI", "Freight/m", "Rate excl. tax", "GST", "Rate incl. tax", "Qty", "Amount"].map(
                  (header) => (
                    <th key={header} className="border-b px-3 py-2 text-left font-semibold">
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id} className="border-b bg-white">
                  <td className="px-3 py-2 text-xs text-steel">{String(index + 1).padStart(2, "0")}.</td>
                  <td className="px-3 py-2 font-medium">{line.description}</td>
                  <td className="px-3 py-2">{formatNumber(line.rateMeter)}</td>
                  <td className="px-3 py-2">{formatNumber(line.tpiAmount)}</td>
                  <td className="px-3 py-2">{formatNumber(line.freightPerMeter)}</td>
                  <td className="px-3 py-2">{formatNumber(line.rateExcludingTax)}</td>
                  <td className="px-3 py-2">{formatNumber(line.gstAmountPerMeter)}</td>
                  <td className="px-3 py-2 font-semibold">{formatNumber(line.rateIncludingTax)}</td>
                  <td className="px-3 py-2">{formatInteger(line.qty)}</td>
                  <td className="px-3 py-2 font-semibold">{formatCurrency(line.finalAmount, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyTableState({
  onUpload,
  onDemo,
  onDemoSuite2
}: {
  onUpload: () => void;
  onDemo: () => void;
  onDemoSuite2: () => void;
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 bg-white px-6 text-center">
      <div className="rounded-md bg-accent p-3 text-primary">
        <UploadCloud className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">Start with an inquiry document</p>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-steel">
          Upload a PDF, image, or Excel file to send it through Reducto and fill the quotation table.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" onClick={onUpload}>
          <UploadCloud className="h-4 w-4" />
          Upload document
        </Button>
        <Button size="sm" variant="outline" onClick={onDemo}>
          <Sparkles className="h-4 w-4" />
          Demo 1
        </Button>
        <Button size="sm" variant="outline" onClick={onDemoSuite2}>
          <Sparkles className="h-4 w-4" />
          Demo 2
        </Button>
      </div>
    </div>
  );
}

function EmptyPanelState({
  title,
  body,
  actionLabel,
  onAction
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-md border border-dashed bg-white px-5 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-steel">{body}</p>
      {actionLabel && onAction ? (
        <Button className="mt-3" size="sm" variant="outline" onClick={onAction}>
          <Sparkles className="h-4 w-4" />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted p-3">
      <p className="text-xs text-steel">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between text-base font-bold text-primary" : "flex justify-between text-steel"}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
