import { useState, useMemo, useEffect } from "react";
import type { Asset } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Printer, X, Settings2, Check, Loader2 } from "lucide-react";

type PageSize = "letter" | "a4";
type CardPreset = "poker" | "bridge" | "tarot" | "mini" | "square" | "custom";
type CutLineStyle = "solid" | "dashed" | "none";

interface PrintSheetProps {
  open: boolean;
  onClose: () => void;
  assets: Asset[];
  initialAssetIds?: number[];
}

const PAGE_DIMENSIONS_IN: Record<PageSize, { w: number; h: number; label: string }> = {
  letter: { w: 8.5, h: 11, label: "US Letter (8.5 × 11 in)" },
  a4: { w: 8.27, h: 11.69, label: "A4 (210 × 297 mm)" },
};

const CARD_PRESETS: Record<CardPreset, { w: number; h: number; label: string }> = {
  poker: { w: 2.5, h: 3.5, label: "Poker (2.5 × 3.5 in)" },
  bridge: { w: 2.25, h: 3.5, label: "Bridge (2.25 × 3.5 in)" },
  tarot: { w: 2.75, h: 4.75, label: "Tarot (2.75 × 4.75 in)" },
  mini: { w: 1.75, h: 2.5, label: "Mini (1.75 × 2.5 in)" },
  square: { w: 2.5, h: 2.5, label: "Square (2.5 × 2.5 in)" },
  custom: { w: 2.5, h: 3.5, label: "Custom…" },
};

const PAGE_MARGIN_IN = 0.25; // safe printable area on most consumer printers

/**
 * Rasterize an image data URL to a target pixel size using a canvas.
 * This is the "real" DPI step: the browser otherwise prints whatever native
 * resolution the source has. We resample once, ahead of print, so the print
 * stream contains exactly the requested pixels per inch.
 *
 * If the source image already covers the target pixel area (i.e. its native
 * resolution meets/exceeds the requested DPI for the chosen card size on both
 * axes), we skip the canvas pass entirely and return the original source —
 * resampling-down loses no real information for printing and just costs CPU
 * and memory, so we let the printer's own driver do the downscale.
 */
async function rasterizeImageToDpi(
  src: string,
  targetWpx: number,
  targetHpx: number,
): Promise<string> {
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
  const w = Math.max(1, Math.round(targetWpx));
  const h = Math.max(1, Math.round(targetHpx));
  // Source already at-or-above target on both axes → no resample needed.
  if (img.width >= w && img.height >= h) return src;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // Cover-fit (matches CSS object-fit: cover used in preview).
  const srcAspect = img.width / img.height;
  const dstAspect = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (srcAspect > dstAspect) {
    sw = img.height * dstAspect;
    sx = (img.width - sw) / 2;
  } else if (srcAspect < dstAspect) {
    sh = img.width / dstAspect;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

export function PrintSheet({ open, onClose, assets, initialAssetIds }: PrintSheetProps) {
  const [pageSize, setPageSize] = useState<PageSize>("letter");
  const [cardPreset, setCardPreset] = useState<CardPreset>("poker");
  const [customW, setCustomW] = useState(2.5);
  const [customH, setCustomH] = useState(3.5);
  const [dpi, setDpi] = useState<150 | 300 | 600>(300);
  const [bleedMm, setBleedMm] = useState(3);
  const [cutLineStyle, setCutLineStyle] = useState<CutLineStyle>("dashed");
  const [cutLineWidthPx, setCutLineWidthPx] = useState(1);
  const [showBleed, setShowBleed] = useState(true);
  const [respectQuantity, setRespectQuantity] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(initialAssetIds ?? assets.filter((a) => a.imageDataUrl).map((a) => a.id)),
  );
  const [previewMode, setPreviewMode] = useState(true);

  // Preselect when assets change & nothing was preselected explicitly
  useEffect(() => {
    if (!initialAssetIds && selectedIds.size === 0) {
      setSelectedIds(new Set(assets.filter((a) => a.imageDataUrl).map((a) => a.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.length]);

  const cardSize = useMemo(() => {
    if (cardPreset === "custom") {
      return {
        w: Math.max(0.5, Math.min(8, customW)),
        h: Math.max(0.5, Math.min(11, customH)),
      };
    }
    return CARD_PRESETS[cardPreset];
  }, [cardPreset, customW, customH]);

  const page = PAGE_DIMENSIONS_IN[pageSize];
  const bleedIn = bleedMm / 25.4;
  const cardWithBleed = {
    w: cardSize.w + (showBleed ? bleedIn * 2 : 0),
    h: cardSize.h + (showBleed ? bleedIn * 2 : 0),
  };

  const usablePage = {
    w: page.w - PAGE_MARGIN_IN * 2,
    h: page.h - PAGE_MARGIN_IN * 2,
  };

  // Layout math
  const cols = Math.max(1, Math.floor(usablePage.w / cardWithBleed.w));
  const rows = Math.max(1, Math.floor(usablePage.h / cardWithBleed.h));
  const perPage = cols * rows;

  // Build the flat list of cards to render (respecting quantity if enabled)
  const printItems = useMemo(() => {
    const items: { asset: Asset; copyIndex: number }[] = [];
    for (const a of assets) {
      if (!selectedIds.has(a.id)) continue;
      const qty = respectQuantity ? Math.max(1, a.quantity ?? 1) : 1;
      for (let i = 0; i < qty; i++) items.push({ asset: a, copyIndex: i });
    }
    return items;
  }, [assets, selectedIds, respectQuantity]);

  const pages = useMemo(() => {
    if (perPage <= 0) return [] as { asset: Asset; copyIndex: number }[][];
    const out: { asset: Asset; copyIndex: number }[][] = [];
    for (let i = 0; i < printItems.length; i += perPage) {
      out.push(printItems.slice(i, i + perPage));
    }
    return out;
  }, [printItems, perPage]);

  const toggleAll = (on: boolean) => {
    setSelectedIds(on ? new Set(assets.filter((a) => a.imageDataUrl).map((a) => a.id)) : new Set());
  };
  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Build the @page CSS dynamically based on selected page size.
  // @page margin is 0; our print grid handles margins itself so geometry math
  // matches preview exactly (no double-margin bug).
  // The print tree (.gf-print-root) is `display:none` inline by default so it
  // never leaks into the normal on-screen layout, and is unhidden only inside
  // @media print, where we also hide the rest of the document.
  const printCss = `
    @page {
      size: ${pageSize === "letter" ? "letter" : "A4"} portrait;
      margin: 0;
    }
    @media print {
      body * { visibility: hidden !important; }
      .gf-print-root { display: block !important; position: absolute !important; inset: 0 !important; background: white !important; }
      .gf-print-root, .gf-print-root * { visibility: visible !important; }
      .gf-print-page { page-break-after: always; break-after: page; }
      .gf-print-page:last-child { page-break-after: auto; break-after: auto; }
      .gf-no-print { display: none !important; }
      img { image-rendering: -webkit-optimize-contrast; }
    }
  `;

  // ── Real DPI: rasterize the unique selected images to target pixel size ──
  // Map of asset.id → rasterized dataURL. Print uses this when populated;
  // falls back to original src otherwise. We rebuild whenever inputs change.
  const [rasterMap, setRasterMap] = useState<Map<number, string>>(new Map());
  const [preparingPrint, setPreparingPrint] = useState(false);

  // Invalidate rasterMap when DPI / card size / selection changes.
  useEffect(() => {
    setRasterMap(new Map());
  }, [dpi, cardSize.w, cardSize.h, bleedMm, showBleed, selectedIds]);

  const handlePrint = async () => {
    setPreparingPrint(true);
    try {
      const targetW = Math.round((cardSize.w + (showBleed ? bleedIn * 2 : 0)) * dpi);
      const targetH = Math.round((cardSize.h + (showBleed ? bleedIn * 2 : 0)) * dpi);
      const uniqueAssets = new Map<number, string>();
      for (const a of assets) {
        if (selectedIds.has(a.id) && a.imageDataUrl) uniqueAssets.set(a.id, a.imageDataUrl);
      }
      const next = new Map<number, string>();
      await Promise.all(
        Array.from(uniqueAssets.entries()).map(async ([id, src]) => {
          try {
            next.set(id, await rasterizeImageToDpi(src, targetW, targetH));
          } catch {
            next.set(id, src); // fall back to original
          }
        }),
      );
      setRasterMap(next);
      // Wait one tick so React commits the new srcs into the print tree.
      await new Promise((r) => setTimeout(r, 50));
      window.print();
    } finally {
      setPreparingPrint(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-[95vw] w-[95vw] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden"
      >
        <DialogHeader className="px-5 py-3 border-b border-border flex-row items-center justify-between gf-no-print">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Printer className="h-4 w-4 text-primary" />
            Print Sheet — {printItems.length} card{printItems.length === 1 ? "" : "s"} across {pages.length} page{pages.length === 1 ? "" : "s"}
          </DialogTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewMode((v) => !v)} className="gap-1.5 text-xs">
              <Settings2 className="h-3 w-3" /> {previewMode ? "Edit settings" : "Preview"}
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs"
              disabled={printItems.length === 0 || preparingPrint}
              data-testid="print-sheet-print"
            >
              {preparingPrint ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
              {preparingPrint ? `Rendering ${dpi} DPI…` : "Print"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 text-xs">
              <X className="h-3 w-3" /> Close
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex min-h-0 gf-no-print">
          {/* Settings panel */}
          {!previewMode && (
            <div className="w-[320px] shrink-0 border-r border-border overflow-y-auto p-4 space-y-4 bg-muted/20">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Page</p>
                <div className="space-y-1">
                  <Label className="text-xs">Page size</Label>
                  <Select value={pageSize} onValueChange={(v) => setPageSize(v as PageSize)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PAGE_DIMENSIONS_IN) as PageSize[]).map((k) => (
                        <SelectItem key={k} value={k}>{PAGE_DIMENSIONS_IN[k].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Print resolution</Label>
                  <Select value={String(dpi)} onValueChange={(v) => setDpi(parseInt(v) as 150 | 300 | 600)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="150">150 DPI — draft</SelectItem>
                      <SelectItem value="300">300 DPI — standard</SelectItem>
                      <SelectItem value="600">600 DPI — high quality</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    {dpi}×{Math.round(cardSize.w * dpi)}×{Math.round(cardSize.h * dpi)}px target per card
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Card</p>
                <div className="space-y-1">
                  <Label className="text-xs">Card size</Label>
                  <Select value={cardPreset} onValueChange={(v) => setCardPreset(v as CardPreset)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CARD_PRESETS) as CardPreset[]).map((k) => (
                        <SelectItem key={k} value={k}>{CARD_PRESETS[k].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {cardPreset === "custom" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Width (in)</Label>
                      <Input
                        type="number" step="0.05" min="0.5" max="8"
                        value={customW}
                        onChange={(e) => setCustomW(parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Height (in)</Label>
                      <Input
                        type="number" step="0.05" min="0.5" max="11"
                        value={customH}
                        onChange={(e) => setCustomH(parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {cols}×{rows} = {perPage} per page
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bleed & cut lines</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Bleed (mm)</Label>
                    <Input
                      type="number" step="0.5" min="0" max="10"
                      value={bleedMm}
                      onChange={(e) => setBleedMm(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="h-8 text-xs"
                      disabled={!showBleed}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Show bleed</Label>
                    <Select value={showBleed ? "on" : "off"} onValueChange={(v) => setShowBleed(v === "on")}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on">Yes</SelectItem>
                        <SelectItem value="off">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Cut line</Label>
                    <Select value={cutLineStyle} onValueChange={(v) => setCutLineStyle(v as CutLineStyle)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dashed">Dashed</SelectItem>
                        <SelectItem value="solid">Solid</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Line width (px)</Label>
                    <Input
                      type="number" step="0.5" min="0.5" max="4"
                      value={cutLineWidthPx}
                      onChange={(e) => setCutLineWidthPx(Math.max(0.5, parseFloat(e.target.value) || 1))}
                      className="h-8 text-xs"
                      disabled={cutLineStyle === "none"}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quantities</p>
                <div className="space-y-1">
                  <Label className="text-xs">Use asset quantity</Label>
                  <Select value={respectQuantity ? "on" : "off"} onValueChange={(v) => setRespectQuantity(v === "on")}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on">Yes — print N copies per asset</SelectItem>
                      <SelectItem value="off">No — one copy each</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Assets ({selectedIds.size}/{assets.filter((a) => a.imageDataUrl).length})
                  </p>
                  <div className="flex gap-1">
                    <button type="button" className="text-[10px] text-primary hover:underline" onClick={() => toggleAll(true)}>All</button>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <button type="button" className="text-[10px] text-primary hover:underline" onClick={() => toggleAll(false)}>None</button>
                  </div>
                </div>
                <div className="space-y-1 max-h-72 overflow-y-auto border border-border rounded-md p-1.5 bg-background">
                  {assets.length === 0 && <p className="text-xs text-muted-foreground p-2">No assets in this project.</p>}
                  {assets.map((a) => {
                    const hasImg = !!a.imageDataUrl;
                    const checked = selectedIds.has(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => hasImg && toggleOne(a.id)}
                        disabled={!hasImg}
                        className={`w-full flex items-center gap-2 p-1.5 rounded text-left text-xs transition-colors ${
                          checked ? "bg-primary/10" : "hover:bg-muted/50"
                        } ${!hasImg ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        <div className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center ${checked ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                          {checked && <Check className="h-3 w-3" />}
                        </div>
                        {hasImg ? (
                          <img src={a.imageDataUrl!} alt="" className="h-7 w-7 rounded object-cover shrink-0" />
                        ) : (
                          <div className="h-7 w-7 rounded bg-muted shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{a.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {a.kind}{respectQuantity && (a.quantity ?? 1) > 1 ? ` × ${a.quantity}` : ""}
                            {!hasImg ? " · no image" : ""}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Preview pane */}
          <div className="flex-1 overflow-auto bg-muted/40 p-6">
            {printItems.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No assets selected, or selected assets have no image.
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6">
                {pages.map((pageItems, pIdx) => (
                  <PrintSheetPage
                    key={pIdx}
                    pageIn={page}
                    items={pageItems}
                    cols={cols}
                    rows={rows}
                    cardSizeIn={cardSize}
                    bleedIn={showBleed ? bleedIn : 0}
                    cutLineStyle={cutLineStyle}
                    cutLineWidthPx={cutLineWidthPx}
                    pageNumber={pIdx + 1}
                    totalPages={pages.length}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Print-only tree. `display:none` by default so it never leaks into
            normal layout; the @media print rule above flips it to `display:block
            !important` and hides everything else for the print stream. */}
        <style dangerouslySetInnerHTML={{ __html: printCss }} />
        <div className="gf-print-root" aria-hidden style={{ display: "none" }}>
          {pages.map((pageItems, pIdx) => (
            <div
              key={pIdx}
              className="gf-print-page"
              style={{
                width: `${page.w}in`,
                height: `${page.h}in`,
                boxSizing: "border-box",
                padding: 0,
                background: "white",
                position: "relative",
              }}
            >
              <PrintSheetGrid
                items={pageItems}
                cols={cols}
                rows={rows}
                cardSizeIn={cardSize}
                bleedIn={showBleed ? bleedIn : 0}
                cutLineStyle={cutLineStyle}
                cutLineWidthPx={cutLineWidthPx}
                rasterMap={rasterMap}
                forPrint
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PrintSheetPageProps {
  pageIn: { w: number; h: number };
  items: { asset: Asset; copyIndex: number }[];
  cols: number;
  rows: number;
  cardSizeIn: { w: number; h: number };
  bleedIn: number;
  cutLineStyle: CutLineStyle;
  cutLineWidthPx: number;
  pageNumber: number;
  totalPages: number;
}

const PREVIEW_DPI = 72; // CSS px per inch in preview pane

function PrintSheetPage(props: PrintSheetPageProps) {
  const { pageIn, items, cols, rows, cardSizeIn, bleedIn, cutLineStyle, cutLineWidthPx, pageNumber, totalPages } = props;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground text-center">Page {pageNumber} of {totalPages}</p>
      <div
        className="bg-white shadow-lg rounded-sm relative"
        style={{
          width: `${pageIn.w * PREVIEW_DPI}px`,
          height: `${pageIn.h * PREVIEW_DPI}px`,
          padding: `${PAGE_MARGIN_IN * PREVIEW_DPI}px`,
          boxSizing: "border-box",
        }}
      >
        <PrintSheetGrid
          items={items}
          cols={cols}
          rows={rows}
          cardSizeIn={cardSizeIn}
          bleedIn={bleedIn}
          cutLineStyle={cutLineStyle}
          cutLineWidthPx={cutLineWidthPx}
        />
      </div>
    </div>
  );
}

interface PrintSheetGridProps {
  items: { asset: Asset; copyIndex: number }[];
  cols: number;
  rows: number;
  cardSizeIn: { w: number; h: number };
  bleedIn: number;
  cutLineStyle: CutLineStyle;
  cutLineWidthPx: number;
  rasterMap?: Map<number, string>;
  forPrint?: boolean;
}

function PrintSheetGrid(props: PrintSheetGridProps) {
  const { items, cols, cardSizeIn, bleedIn, cutLineStyle, cutLineWidthPx, rasterMap, forPrint } = props;
  const unit = forPrint ? "in" : "px";
  const scale = forPrint ? 1 : PREVIEW_DPI;
  const cardW = cardSizeIn.w * scale;
  const cardH = cardSizeIn.h * scale;
  const bleed = bleedIn * scale;
  const cellW = cardW + bleed * 2;
  const cellH = cardH + bleed * 2;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${cellW}${unit})`,
        gridAutoRows: `${cellH}${unit}`,
        gap: 0,
        width: "100%",
        height: forPrint ? "100%" : undefined,
        padding: forPrint ? `${PAGE_MARGIN_IN}in` : 0,
        boxSizing: "border-box",
      }}
    >
      {items.map((it, idx) => (
        <div
          key={`${it.asset.id}-${it.copyIndex}-${idx}`}
          style={{
            width: `${cellW}${unit}`,
            height: `${cellH}${unit}`,
            position: "relative",
            boxSizing: "border-box",
            outline:
              cutLineStyle === "none"
                ? "none"
                : `${cutLineWidthPx}px ${cutLineStyle} #555`,
            outlineOffset: `-${cutLineWidthPx / 2}px`,
            overflow: "hidden",
          }}
        >
          {it.asset.imageDataUrl ? (
            <img
              src={(forPrint && rasterMap?.get(it.asset.id)) || it.asset.imageDataUrl}
              alt={it.asset.name}
              style={{
                position: "absolute",
                left: `${bleed}${unit}`,
                top: `${bleed}${unit}`,
                width: `${cardW}${unit}`,
                height: `${cardH}${unit}`,
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                left: `${bleed}${unit}`,
                top: `${bleed}${unit}`,
                width: `${cardW}${unit}`,
                height: `${cardH}${unit}`,
                background: "#eee",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: forPrint ? "10pt" : "10px",
                color: "#888",
              }}
            >
              {it.asset.name}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
