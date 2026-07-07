import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProduction } from '@/hooks/useProduction';
import { useSales } from '@/hooks/useSales';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import { useFinishedStock } from '@/hooks/useFinishedStock';
import { useMaterialStock } from '@/hooks/useMaterialStock';
import { usePallets } from '@/hooks/usePallets';
import { useRole } from '@/contexts/RoleContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Light, professional palette
const C = {
  ink:      [30, 34, 45] as const,     // primary text
  mute:     [110, 118, 132] as const,  // secondary text
  faint:    [170, 178, 190] as const,  // hairline text
  line:     [225, 230, 238] as const,  // borders / gridlines
  paper:    [255, 255, 255] as const,  // background
  band:     [248, 250, 253] as const,  // section band bg
  cardBg:   [252, 253, 255] as const,  // card bg
  accent:   [234, 88, 12] as const,    // PegoFlex orange
  accent2:  [253, 186, 116] as const,  // orange soft
  ok:       [22, 163, 74] as const,
  warn:     [202, 138, 4] as const,
  danger:   [220, 38, 38] as const,
};

export function GYCReportButton() {
  const { isAdmin } = useRole();
  const [generating, setGenerating] = useState(false);
  const { records: prodRecords } = useProduction();
  const { records: saleRecords } = useSales();
  const { records: rawRecords } = useRawMaterials();
  const { items: finishedStock } = useFinishedStock();
  const { stocks: materialStock } = useMaterialStock();
  const { warehouse, inCirculation, balances } = usePallets();

  if (!isAdmin) return null;

  const generate = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF('p', 'mm', 'a4');
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const ML = 16, MR = 16;
      const CW = W - ML - MR;
      const now = new Date();
      const todayISO = format(now, 'yyyy-MM-dd');
      const monthName = format(now, "MMMM 'de' yyyy", { locale: es });

      // ----- primitives -----
      const setFill = (c: readonly [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
      const setText = (c: readonly [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
      const setDraw = (c: readonly [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
      const pageBg = () => { setFill(C.paper); doc.rect(0, 0, W, H, 'F'); };

      let page = 1;
      const drawFooter = () => {
        setDraw(C.line); doc.setLineWidth(0.2);
        doc.line(ML, H - 14, W - MR, H - 14);
        setText(C.faint); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        doc.text('PegoFlex · Reporte operativo', ML, H - 9);
        doc.text(`Página ${page}`, W - MR, H - 9, { align: 'right' });
        doc.text(format(now, "dd/MM/yyyy HH:mm"), W / 2, H - 9, { align: 'center' });
      };

      const newPage = () => { doc.addPage(); pageBg(); page++; drawFooter(); return 22; };
      const ensure = (y: number, need: number) => (y + need > H - 20) ? newPage() : y;

      const sectionTitle = (title: string, y: number) => {
        y = ensure(y, 14);
        setFill(C.band); doc.roundedRect(ML, y, CW, 9, 1.5, 1.5, 'F');
        setFill(C.accent); doc.rect(ML, y, 2, 9, 'F');
        setText(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
        doc.text(title.toUpperCase(), ML + 5, y + 6);
        return y + 13;
      };

      const kpi = (x: number, y: number, w: number, h: number, label: string, value: string, sub?: string, color: readonly [number, number, number] = C.accent) => {
        setFill(C.cardBg); setDraw(C.line); doc.setLineWidth(0.25);
        doc.roundedRect(x, y, w, h, 2, 2, 'FD');
        setFill(color); doc.roundedRect(x, y, w, 1.2, 0.6, 0.6, 'F');
        setText(C.mute); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
        doc.text(label.toUpperCase(), x + 3, y + 6);
        setText(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
        doc.text(value, x + 3, y + 15);
        if (sub) { setText(C.mute); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(sub, x + 3, y + 20); }
      };

      // Table with header + zebra rows
      const table = (y: number, cols: { label: string; width: number; align?: 'left' | 'right' | 'center' }[], rows: (string | number)[][]) => {
        // header
        y = ensure(y, 12);
        setFill(C.ink); doc.rect(ML, y, CW, 7, 'F');
        setText([255, 255, 255] as any); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
        let x = ML + 2;
        cols.forEach(c => {
          const tx = c.align === 'right' ? x + c.width - 2 : c.align === 'center' ? x + c.width / 2 : x;
          doc.text(c.label.toUpperCase(), tx, y + 4.8, { align: c.align || 'left' });
          x += c.width;
        });
        y += 7;
        // rows
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        rows.forEach((r, idx) => {
          y = ensure(y, 6);
          if (idx % 2 === 0) { setFill(C.band); doc.rect(ML, y, CW, 6, 'F'); }
          setText(C.ink);
          let cx = ML + 2;
          cols.forEach((c, i) => {
            const val = String(r[i] ?? '');
            const tx = c.align === 'right' ? cx + c.width - 2 : c.align === 'center' ? cx + c.width / 2 : cx;
            const trimmed = val.length > Math.floor(c.width / 1.8) ? val.substring(0, Math.floor(c.width / 1.8) - 1) + '…' : val;
            doc.text(trimmed, tx, y + 4.2, { align: c.align || 'left' });
            cx += c.width;
          });
          y += 6;
        });
        setDraw(C.line); doc.setLineWidth(0.2); doc.line(ML, y, ML + CW, y);
        return y + 4;
      };

      const bar = (x: number, y: number, w: number, h: number, entries: { label: string; value: number }[]) => {
        const max = Math.max(1, ...entries.map(e => e.value));
        const gap = 4; const barW = Math.max(6, (w - gap * (entries.length - 1)) / Math.max(1, entries.length));
        // baseline
        setDraw(C.line); doc.setLineWidth(0.2); doc.line(x, y + h, x + w, y + h);
        entries.forEach((e, i) => {
          const bx = x + i * (barW + gap);
          const bh = (e.value / max) * (h - 8);
          const by = y + h - bh;
          setFill(C.accent); doc.roundedRect(bx, by, barW, bh, 1, 1, 'F');
          setFill(C.accent2); doc.roundedRect(bx, by, barW, Math.min(bh, bh * 0.35), 1, 1, 'F');
          setText(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
          doc.text(e.value.toLocaleString(), bx + barW / 2, by - 1.2, { align: 'center' });
          setText(C.mute); doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
          const lbl = e.label.length > 10 ? e.label.substring(0, 10) + '…' : e.label;
          doc.text(lbl, bx + barW / 2, y + h + 3.5, { align: 'center' });
        });
      };

      // ============================ PAGE 1 ============================
      pageBg();
      drawFooter();

      // Elegant header
      setFill(C.accent); doc.rect(0, 0, W, 3, 'F');
      setText(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
      doc.text('PegoFlex', ML, 16);
      setText(C.mute); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text('Reporte Operativo Ejecutivo', ML, 22);
      setText(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text(monthName.charAt(0).toUpperCase() + monthName.slice(1), W - MR, 16, { align: 'right' });
      setText(C.mute); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.text(`Emitido: ${format(now, "EEEE d 'de' MMMM, HH:mm", { locale: es })}`, W - MR, 22, { align: 'right' });
      setDraw(C.line); doc.setLineWidth(0.4); doc.line(ML, 28, W - MR, 28);

      // === Filter helpers ===
      const monthNow = now.getMonth(), yearNow = now.getFullYear();
      const inMonth = <T extends { date: string }>(arr: T[]) => arr.filter(r => {
        const d = new Date(r.date + 'T12:00:00');
        return d.getMonth() === monthNow && d.getFullYear() === yearNow;
      });
      const today = <T extends { date: string }>(arr: T[]) => arr.filter(r => r.date === todayISO);

      const monthProd = inMonth(prodRecords);
      const monthSales = inMonth(saleRecords);
      const dayProd = today(prodRecords);
      const daySales = today(saleRecords);

      // === KPI row ===
      let y = 36;
      const totalMProd = monthProd.reduce((s, r) => s + r.quantity, 0);
      const totalMSales = monthSales.reduce((s, r) => s + r.quantity, 0);
      const totalDProd = dayProd.reduce((s, r) => s + r.quantity, 0);
      const totalDSales = daySales.reduce((s, r) => s + r.quantity, 0);
      const kpiW = (CW - 9) / 4;
      kpi(ML + 0 * (kpiW + 3), y, kpiW, 24, 'Producción hoy', `${totalDProd.toLocaleString()}`, 'sacos');
      kpi(ML + 1 * (kpiW + 3), y, kpiW, 24, 'Ventas hoy', `${totalDSales.toLocaleString()}`, 'sacos', C.ok);
      kpi(ML + 2 * (kpiW + 3), y, kpiW, 24, 'Producción mes', `${totalMProd.toLocaleString()}`, `${monthProd.length} lotes`);
      kpi(ML + 3 * (kpiW + 3), y, kpiW, 24, 'Ventas mes', `${totalMSales.toLocaleString()}`, `${monthSales.length} guías`, C.ok);
      y += 30;

      // ================== SECTION: PRODUCCIÓN DEL DÍA ==================
      y = sectionTitle('Producción del día', y);
      if (dayProd.length === 0) {
        setText(C.mute); doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5);
        doc.text('Sin lotes de producción registrados hoy.', ML, y + 2);
        y += 8;
      } else {
        const byProduct: Record<string, number> = {};
        dayProd.forEach(r => { byProduct[r.product_name] = (byProduct[r.product_name] || 0) + r.quantity; });
        const entries = Object.entries(byProduct).map(([label, value]) => ({ label, value }));

        y = ensure(y, 44);
        setFill(C.cardBg); setDraw(C.line); doc.setLineWidth(0.25);
        doc.roundedRect(ML, y, CW, 42, 2, 2, 'FD');
        setText(C.mute); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.text('DISTRIBUCIÓN POR PRODUCTO', ML + 4, y + 6);
        bar(ML + 6, y + 10, CW - 12, 26, entries);
        y += 46;

        y = table(y,
          [
            { label: 'Producto', width: 55 },
            { label: 'Cantidad', width: 30, align: 'right' },
            { label: 'Estado', width: 40 },
            { label: 'Notas', width: CW - 125 },
          ],
          dayProd.map(r => [r.product_name, `${r.quantity.toLocaleString()} sacos`, r.shift_status || 'Normal', r.notes || '—']),
        );
      }

      // ================== SECTION: RESUMEN DE VENTAS ==================
      y = sectionTitle('Resumen de Ventas', y);
      const salesByProd: Record<string, number> = {};
      monthSales.forEach(r => { salesByProd[r.product_name] = (salesByProd[r.product_name] || 0) + r.quantity; });
      const salesByClient: Record<string, number> = {};
      monthSales.forEach(r => { const c = r.client || 'Sin cliente'; salesByClient[c] = (salesByClient[c] || 0) + r.quantity; });
      const topClients = Object.entries(salesByClient).sort((a, b) => b[1] - a[1]).slice(0, 6);

      // side-by-side cards: product mix / top clients
      const half = (CW - 4) / 2;
      y = ensure(y, 48);
      setFill(C.cardBg); setDraw(C.line); doc.setLineWidth(0.25);
      doc.roundedRect(ML, y, half, 46, 2, 2, 'FD');
      doc.roundedRect(ML + half + 4, y, half, 46, 2, 2, 'FD');
      setText(C.mute); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
      doc.text('VENTAS POR PRODUCTO', ML + 4, y + 6);
      doc.text('TOP CLIENTES (SACOS)', ML + half + 8, y + 6);

      // Bars in left card
      const spEntries = Object.entries(salesByProd).map(([label, value]) => ({ label, value }));
      if (spEntries.length) bar(ML + 6, y + 10, half - 12, 30, spEntries);
      else { setText(C.faint); doc.setFontSize(8); doc.text('Sin ventas', ML + half / 2, y + 24, { align: 'center' }); }

      // Horizontal list right card
      const maxCli = topClients[0]?.[1] || 1;
      let ly = y + 12;
      topClients.forEach((c, i) => {
        const bw = ((c[1] / maxCli) * (half - 40));
        setText(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.text(`${i + 1}.`, ML + half + 8, ly + 3);
        doc.setFont('helvetica', 'normal');
        const name = c[0].length > 20 ? c[0].substring(0, 20) + '…' : c[0];
        doc.text(name, ML + half + 13, ly + 3);
        setFill(C.accent2); doc.roundedRect(ML + half + 8, ly + 4.2, bw, 1.6, 0.8, 0.8, 'F');
        setText(C.accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.text(String(c[1]), ML + 2 * half - 2, ly + 3, { align: 'right' });
        ly += 6;
      });
      if (!topClients.length) { setText(C.faint); doc.setFontSize(8); doc.text('Sin clientes', ML + half + 8 + (half - 16) / 2, y + 24, { align: 'center' }); }
      y += 50;

      // Ventas detalle mes (compact)
      const sortedSales = [...monthSales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25);
      if (sortedSales.length) {
        y = table(y,
          [
            { label: 'Fecha', width: 22 },
            { label: 'Producto', width: 40 },
            { label: 'Cliente', width: CW - 122 },
            { label: 'Guía', width: 22, align: 'center' },
            { label: 'Cant.', width: 22, align: 'right' },
            { label: 'Total', width: 16, align: 'right' },
          ],
          sortedSales.map(s => [s.date, s.product_name, s.client || 'Sin cliente', (s as any).guide_number ?? '—', s.quantity.toLocaleString(), s.quantity.toLocaleString()]),
        );
        if (monthSales.length > 25) {
          setText(C.mute); doc.setFont('helvetica', 'italic'); doc.setFontSize(7);
          doc.text(`Mostrando 25 de ${monthSales.length} ventas del mes. El Excel contiene el detalle completo.`, ML, y);
          y += 5;
        }
      }

      // ================== SECTION: MATERIA PRIMA ==================
      y = sectionTitle('Materia Prima e Inventario', y);

      // Finished product stock cards
      const finRows = finishedStock.length ? finishedStock : [];
      if (finRows.length) {
        const fw = (CW - (finRows.length - 1) * 3) / finRows.length;
        y = ensure(y, 22);
        finRows.forEach((f, i) => {
          kpi(ML + i * (fw + 3), y, fw, 20, `Terminado · ${f.product_name}`, `${(f.stock ?? 0).toLocaleString()}`, 'sacos', C.ok);
        });
        y += 24;
      }

      // Materials table
      if (materialStock.length) {
        y = table(y,
          [
            { label: 'Material', width: 70 },
            { label: 'Stock actual', width: 40, align: 'right' },
            { label: 'Unidad', width: 30 },
            { label: 'Última actualización', width: CW - 140, align: 'right' },
          ],
          [...materialStock].sort((a, b) => a.material_name.localeCompare(b.material_name)).map(m => [
            m.material_name,
            Number(m.stock || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
            m.unit || '—',
            m.updated_at ? format(new Date(m.updated_at), 'dd/MM/yyyy HH:mm') : '—',
          ]),
        );
      }

      // Latest raw material entries
      const recentRaw = [...rawRecords].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
      if (recentRaw.length) {
        y = ensure(y, 6);
        setText(C.mute); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.text('ÚLTIMAS ENTRADAS DE MATERIAL', ML, y + 2); y += 5;
        y = table(y,
          [
            { label: 'Fecha', width: 22 },
            { label: 'Material', width: 60 },
            { label: 'Cantidad', width: 30, align: 'right' },
            { label: 'Unidad', width: 24 },
            { label: 'Notas', width: CW - 136 },
          ],
          recentRaw.map(r => [r.date, r.material_name, r.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 }), r.unit, r.notes || '—']),
        );
      }

      // Paletas
      y = ensure(y, 30);
      const pw = (CW - 6) / 3;
      kpi(ML + 0 * (pw + 3), y, pw, 20, 'Paletas en almacén', warehouse.toLocaleString(), 'unidades', C.ok);
      kpi(ML + 1 * (pw + 3), y, pw, 20, 'Paletas en circulación', inCirculation.toLocaleString(), 'con clientes', C.warn);
      kpi(ML + 2 * (pw + 3), y, pw, 20, 'Deudores activos', String(balances.filter(b => b.balance > 0).length), 'clientes', C.danger);
      y += 24;

      // ============================ PAGE 2 — MATERIA PRIMA DETALLADA ============================
      doc.addPage();
      page++;
      pageBg();
      drawFooter();

      // Corporate blue/gray header
      const CORP_BLUE: [number, number, number] = [37, 99, 165];
      const CORP_BLUE_SOFT: [number, number, number] = [219, 234, 254];
      const CORP_GRAY: [number, number, number] = [71, 85, 105];

      doc.setFillColor(...CORP_BLUE);
      doc.rect(0, 0, W, 3, 'F');
      setText(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
      doc.text('Materia Prima', ML, 18);
      setText(CORP_GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
      doc.text('Detalle completo de inventario y movimientos', ML, 24);
      setText(CORP_GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.text(format(now, "dd/MM/yyyy HH:mm"), W - MR, 18, { align: 'right' });
      doc.setDrawColor(...CORP_BLUE); doc.setLineWidth(0.5);
      doc.line(ML, 28, W - MR, 28);

      let y2 = 38;

      // Stock actual por material
      setText(CORP_BLUE); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text('Stock Actual por Material', ML, y2); y2 += 4;

      autoTable(doc, {
        startY: y2,
        head: [['Material', 'Stock Actual', 'Unidad', 'Última Actualización']],
        body: [...materialStock]
          .sort((a, b) => a.material_name.localeCompare(b.material_name))
          .map(m => [
            m.material_name,
            Number(m.stock || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
            m.unit || '—',
            m.updated_at ? format(new Date(m.updated_at), 'dd/MM/yyyy HH:mm') : '—',
          ]),
        theme: 'grid',
        margin: { left: ML, right: MR },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, textColor: [30, 34, 45], lineColor: [203, 213, 225], lineWidth: 0.15 },
        headStyles: { fillColor: CORP_BLUE, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
        alternateRowStyles: { fillColor: [248, 250, 253] },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' },
          1: { halign: 'right', cellWidth: 35 },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'right' },
        },
      });

      y2 = (doc as any).lastAutoTable.finalY + 10;

      // Movimientos recientes
      if (rawRecords.length) {
        y2 = ensure(y2, 20);
        setText(CORP_BLUE); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
        doc.text('Historial de Entradas de Materia Prima', ML, y2); y2 += 4;

        autoTable(doc, {
          startY: y2,
          head: [['Fecha', 'Material', 'Cantidad', 'Unidad', 'Notas']],
          body: [...rawRecords]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 60)
            .map(r => [
              r.date,
              r.material_name,
              r.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 }),
              r.unit,
              r.notes || '—',
            ]),
          theme: 'striped',
          margin: { left: ML, right: MR },
          styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.5, textColor: [30, 34, 45] },
          headStyles: { fillColor: CORP_GRAY, textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: CORP_BLUE_SOFT },
          columnStyles: {
            0: { cellWidth: 24 },
            1: { cellWidth: 55, fontStyle: 'bold' },
            2: { halign: 'right', cellWidth: 28 },
            3: { halign: 'center', cellWidth: 22 },
            4: { cellWidth: 'auto' },
          },
        });
      }

      // ---- Save ----
      const fname = `PegoFlex_Reporte_${format(now, 'yyyy_MM_dd_HHmm')}.pdf`;
      doc.save(fname);
      toast.success('Reporte PDF generado');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Error al generar el reporte');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={generate}
      disabled={generating}
      size="icon"
      variant="ghost"
      title="Generar reporte PDF PegoFlex"
      className="text-muted-foreground hover:text-primary h-9 w-9"
    >
      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
    </Button>
  );
}