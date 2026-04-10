import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAttendance } from '@/hooks/useAttendance';
import { useProduction } from '@/hooks/useProduction';
import { useSales } from '@/hooks/useSales';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import { useRole } from '@/contexts/RoleContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Color palette
const C = {
  bg: [26, 29, 35] as const,
  bgLight: [35, 39, 47] as const,
  bgCard: [42, 46, 56] as const,
  orange: [249, 115, 22] as const,
  orangeLight: [251, 146, 60] as const,
  white: [255, 255, 255] as const,
  gray: [156, 163, 175] as const,
  grayLight: [209, 213, 219] as const,
  grayDark: [75, 85, 99] as const,
  green: [34, 197, 94] as const,
  red: [239, 68, 68] as const,
};

export function GYCReportButton() {
  const { isAdmin } = useRole();
  const [generating, setGenerating] = useState(false);
  const { employees, records: attRecords } = useAttendance();
  const { records: prodRecords } = useProduction();
  const { records: saleRecords } = useSales();
  const { records: rawMatRecords } = useRawMaterials();

  if (!isAdmin) return null;

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const now = new Date();
      const doc = new jsPDF('p', 'mm', 'a4');
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const monthNow = now.getMonth();
      const yearNow = now.getFullYear();
      const monthName = format(now, 'MMMM yyyy', { locale: es }).toUpperCase();
      const marginL = 14;
      const marginR = 14;
      const contentW = W - marginL - marginR;

      // Helpers
      const rgb = (c: readonly [number, number, number]) => c;
      const setFill = (c: readonly [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
      const setTextC = (c: readonly [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
      const setDraw = (c: readonly [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

      const drawDarkPage = () => {
        setFill(C.bg);
        doc.rect(0, 0, W, H, 'F');
      };

      const ensureSpace = (y: number, needed: number): number => {
        if (y + needed > H - 20) {
          doc.addPage();
          drawDarkPage();
          return 18;
        }
        return y;
      };

      const drawSectionTitle = (title: string, y: number): number => {
        y = ensureSpace(y, 14);
        // Orange accent line
        setFill(C.orange);
        doc.rect(marginL, y, 4, 8, 'F');
        setTextC(C.white);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(title, marginL + 8, y + 6);
        return y + 14;
      };

      const drawCardBg = (x: number, y: number, w: number, h: number) => {
        setFill(C.bgLight);
        doc.roundedRect(x, y, w, h, 2, 2, 'F');
      };

      // ===== Filter data for current month =====
      const filterMonth = <T extends { date: string }>(arr: T[]) =>
        arr.filter(r => {
          const d = new Date(r.date + 'T12:00:00');
          return d.getMonth() === monthNow && d.getFullYear() === yearNow;
        });

      const monthProd = filterMonth(prodRecords);
      const monthSales = filterMonth(saleRecords);
      const monthAtt = filterMonth(attRecords);

      // ===== PAGE 1: Cover + KPIs =====
      drawDarkPage();

      // Header band
      setFill(C.bgLight);
      doc.rect(0, 0, W, 52, 'F');
      setFill(C.orange);
      doc.rect(0, 50, W, 2.5, 'F');

      setTextC(C.orange);
      doc.setFontSize(26);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE GYC', W / 2, 22, { align: 'center' });

      setTextC(C.grayLight);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Control de Gestión — ${monthName}`, W / 2, 32, { align: 'center' });

      setTextC(C.gray);
      doc.setFontSize(8);
      doc.text(`Generado: ${format(now, 'dd/MM/yyyy')} a las ${format(now, 'HH:mm:ss')}`, W / 2, 42, { align: 'center' });

      // KPI Cards
      let y = 62;
      const totalProd = monthProd.reduce((s, r) => s + r.quantity, 0);
      const totalSales = monthSales.reduce((s, r) => s + r.quantity, 0);
      const totalPresent = monthAtt.filter(r => r.status === 'present').length;
      const totalAbsent = monthAtt.filter(r => r.status === 'absent').length;
      const attRate = monthAtt.length > 0 ? Math.round((totalPresent / monthAtt.length) * 100) : 0;

      const kpiW = (contentW - 8) / 3;
      const kpis = [
        { label: 'PRODUCCIÓN', value: `${totalProd.toLocaleString()}`, sub: 'sacos producidos' },
        { label: 'VENTAS', value: `${totalSales.toLocaleString()}`, sub: 'sacos vendidos' },
        { label: 'ASISTENCIA', value: `${attRate}%`, sub: `${totalPresent} presentes / ${totalAbsent} ausentes` },
      ];

      kpis.forEach((kpi, i) => {
        const x = marginL + i * (kpiW + 4);
        drawCardBg(x, y, kpiW, 28);
        setFill(C.orange);
        doc.rect(x, y, kpiW, 1.5, 'F');

        setTextC(C.gray);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(kpi.label, x + kpiW / 2, y + 8, { align: 'center' });

        setTextC(C.orange);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(kpi.value, x + kpiW / 2, y + 18, { align: 'center' });

        setTextC(C.gray);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.text(kpi.sub, x + kpiW / 2, y + 24, { align: 'center' });
      });

      y += 38;

      // ===== PRODUCCIÓN SECTION =====
      y = drawSectionTitle('PRODUCCIÓN MENSUAL', y);

      // Product breakdown table
      const prodByType: Record<string, number> = {};
      monthProd.forEach(r => { prodByType[r.product_name] = (prodByType[r.product_name] || 0) + r.quantity; });
      const prodEntries = Object.entries(prodByType).sort((a, b) => b[1] - a[1]);

      // Summary cards
      const prodCardW = (contentW - 4) / 2;
      drawCardBg(marginL, y, prodCardW, 22);
      drawCardBg(marginL + prodCardW + 4, y, prodCardW, 22);

      setTextC(C.gray);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL PRODUCIDO', marginL + prodCardW / 2, y + 7, { align: 'center' });
      setTextC(C.orangeLight);
      doc.setFontSize(14);
      doc.text(`${totalProd.toLocaleString()} sacos`, marginL + prodCardW / 2, y + 16, { align: 'center' });

      setTextC(C.gray);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('TIPOS PRODUCIDOS', marginL + prodCardW + 4 + prodCardW / 2, y + 7, { align: 'center' });
      setTextC(C.orangeLight);
      doc.setFontSize(14);
      doc.text(`${prodEntries.length}`, marginL + prodCardW + 4 + prodCardW / 2, y + 16, { align: 'center' });

      y += 28;

      // Bar chart for production by product
      if (prodEntries.length > 0) {
        y = ensureSpace(y, 52);
        drawCardBg(marginL, y, contentW, 48);

        setTextC(C.gray);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('PRODUCCIÓN POR PRODUCTO', marginL + 6, y + 8);

        const chartX = marginL + 10;
        const chartY = y + 14;
        const chartW = contentW - 20;
        const chartH = 28;
        const maxVal = Math.max(...prodEntries.map(e => e[1]));
        const barW = Math.min(30, (chartW - 10) / prodEntries.length - 4);

        // Grid lines
        for (let g = 0; g <= 4; g++) {
          const gy = chartY + chartH - (g / 4) * chartH;
          setDraw(C.grayDark);
          doc.setLineWidth(0.1);
          doc.line(chartX, gy, chartX + chartW, gy);
          setTextC(C.grayDark);
          doc.setFontSize(5);
          doc.setFont('helvetica', 'normal');
          doc.text(Math.round((g / 4) * maxVal).toString(), chartX - 2, gy + 1, { align: 'right' });
        }

        prodEntries.forEach((entry, i) => {
          const bx = chartX + 10 + i * ((chartW - 10) / prodEntries.length) + ((chartW - 10) / prodEntries.length - barW) / 2;
          const bh = (entry[1] / maxVal) * chartH;
          const by = chartY + chartH - bh;

          // Gradient effect - draw two rects
          setFill(C.orange);
          doc.roundedRect(bx, by, barW, bh, 1, 1, 'F');
          setFill(C.orangeLight);
          doc.roundedRect(bx, by, barW, bh * 0.4, 1, 1, 'F');

          // Value on top
          setTextC(C.white);
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.text(entry[1].toLocaleString(), bx + barW / 2, by - 2, { align: 'center' });

          // Label below
          setTextC(C.gray);
          doc.setFontSize(5.5);
          doc.setFont('helvetica', 'normal');
          const label = entry[0].length > 12 ? entry[0].substring(0, 12) + '…' : entry[0];
          doc.text(label, bx + barW / 2, chartY + chartH + 5, { align: 'center' });
        });

        y += 54;
      }

      // Daily production line chart
      const daysInMonth = new Date(yearNow, monthNow + 1, 0).getDate();
      const dailyProd: number[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${yearNow}-${String(monthNow + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        dailyProd.push(monthProd.filter(r => r.date === ds).reduce((s, r) => s + r.quantity, 0));
      }

      if (dailyProd.some(v => v > 0)) {
        y = ensureSpace(y, 55);
        drawCardBg(marginL, y, contentW, 50);

        setTextC(C.gray);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('TENDENCIA DIARIA DE PRODUCCIÓN', marginL + 6, y + 8);

        const lx = marginL + 14;
        const ly = y + 14;
        const lw = contentW - 24;
        const lh = 30;
        const maxDay = Math.max(...dailyProd, 1);

        // Grid
        for (let g = 0; g <= 4; g++) {
          const gy = ly + lh - (g / 4) * lh;
          setDraw(C.grayDark);
          doc.setLineWidth(0.1);
          doc.line(lx, gy, lx + lw, gy);
          setTextC(C.grayDark);
          doc.setFontSize(4.5);
          doc.setFont('helvetica', 'normal');
          doc.text(Math.round((g / 4) * maxDay).toString(), lx - 2, gy + 1, { align: 'right' });
        }

        // Line
        setDraw(C.orange);
        doc.setLineWidth(0.6);
        const points: [number, number][] = [];
        for (let d = 0; d < daysInMonth; d++) {
          const px = lx + (d / (daysInMonth - 1)) * lw;
          const py = ly + lh - (dailyProd[d] / maxDay) * lh;
          points.push([px, py]);
          if (d > 0) {
            doc.line(points[d - 1][0], points[d - 1][1], px, py);
          }
        }

        // Area fill under curve
        setFill(C.orange);
        doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
        const areaPoints: number[] = [];
        points.forEach(p => { areaPoints.push(p[0], p[1]); });
        // Draw area as thin rects per segment
        for (let d = 0; d < points.length - 1; d++) {
          const x1 = points[d][0], y1 = points[d][1];
          const x2 = points[d + 1][0], y2 = points[d + 1][1];
          const segW = x2 - x1;
          const topY = Math.min(y1, y2);
          const botY = ly + lh;
          setFill(C.orange);
          doc.rect(x1, topY, segW, botY - topY, 'F');
        }
        doc.setGState(new (doc as any).GState({ opacity: 1 }));

        // Dots
        points.forEach((p, d) => {
          if (dailyProd[d] > 0) {
            setFill(C.orange);
            doc.circle(p[0], p[1], 0.8, 'F');
          }
        });

        // X-axis labels (every 5 days)
        for (let d = 0; d < daysInMonth; d += 5) {
          const px = lx + (d / (daysInMonth - 1)) * lw;
          setTextC(C.grayDark);
          doc.setFontSize(4.5);
          doc.text(String(d + 1), px, ly + lh + 4, { align: 'center' });
        }

        y += 56;
      }

      // ===== VENTAS SECTION =====
      y = ensureSpace(y, 20);
      y = drawSectionTitle('VENTAS MENSUAL', y);

      // Sales by product pie chart
      const salesByProd: Record<string, number> = {};
      monthSales.forEach(r => { salesByProd[r.product_name] = (salesByProd[r.product_name] || 0) + r.quantity; });
      const salesEntries = Object.entries(salesByProd).sort((a, b) => b[1] - a[1]);

      // Sales by client
      const salesByClient: Record<string, number> = {};
      monthSales.forEach(r => {
        const cl = r.client || 'Sin cliente';
        salesByClient[cl] = (salesByClient[cl] || 0) + r.quantity;
      });
      const clientEntries = Object.entries(salesByClient).sort((a, b) => b[1] - a[1]);

      if (salesEntries.length > 0 || clientEntries.length > 0) {
        y = ensureSpace(y, 56);
        const halfW = (contentW - 4) / 2;

        // Pie chart card
        drawCardBg(marginL, y, halfW, 52);
        setTextC(C.gray);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('VENTAS POR PRODUCTO', marginL + halfW / 2, y + 8, { align: 'center' });

        // Draw pie chart
        const pieColors = [C.orange, C.orangeLight, [251, 191, 36] as const, [234, 88, 12] as const, C.grayDark];
        const cx = marginL + halfW / 2;
        const cy = y + 28;
        const radius = 14;
        let startAngle = -Math.PI / 2;

        salesEntries.forEach((entry, i) => {
          const slice = (entry[1] / totalSales) * 2 * Math.PI;
          const endAngle = startAngle + slice;
          const color = pieColors[i % pieColors.length];

          // Draw pie slice as filled sectors using many triangles
          setFill(color as readonly [number, number, number]);
          const steps = Math.max(8, Math.ceil(slice / 0.1));
          for (let s = 0; s < steps; s++) {
            const a1 = startAngle + (s / steps) * slice;
            const a2 = startAngle + ((s + 1) / steps) * slice;
            const x1 = cx + Math.cos(a1) * radius;
            const y1_ = cy + Math.sin(a1) * radius;
            const x2 = cx + Math.cos(a2) * radius;
            const y2_ = cy + Math.sin(a2) * radius;
            doc.triangle(cx, cy, x1, y1_, x2, y2_, 'F');
          }

          startAngle = endAngle;
        });

        // Legend
        let legendY = y + 44;
        salesEntries.forEach((entry, i) => {
          if (i > 3) return;
          const color = pieColors[i % pieColors.length];
          const pct = Math.round((entry[1] / totalSales) * 100);
          setFill(color as readonly [number, number, number]);
          doc.rect(marginL + 4, legendY - 2, 3, 3, 'F');
          setTextC(C.grayLight);
          doc.setFontSize(5);
          doc.setFont('helvetica', 'normal');
          const txt = `${entry[0]} (${pct}%)`;
          doc.text(txt, marginL + 9, legendY);
          legendY += 4;
        });

        // Client breakdown card
        drawCardBg(marginL + halfW + 4, y, halfW, 52);
        setTextC(C.gray);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('TOP CLIENTES', marginL + halfW + 4 + halfW / 2, y + 8, { align: 'center' });

        // Horizontal bar chart for clients
        const topClients = clientEntries.slice(0, 5);
        const maxClientVal = topClients.length > 0 ? topClients[0][1] : 1;
        const cBarStartY = y + 14;
        const cBarX = marginL + halfW + 10;
        const cBarMaxW = halfW - 16;

        topClients.forEach((cl, i) => {
          const barY = cBarStartY + i * 7.5;
          const barW = (cl[1] / maxClientVal) * cBarMaxW;

          setTextC(C.grayLight);
          doc.setFontSize(5.5);
          doc.setFont('helvetica', 'normal');
          const name = cl[0].length > 14 ? cl[0].substring(0, 14) + '…' : cl[0];
          doc.text(name, cBarX, barY);

          setFill(C.orange);
          doc.roundedRect(cBarX, barY + 1, barW, 3.5, 1, 1, 'F');

          setTextC(C.orangeLight);
          doc.setFontSize(5);
          doc.setFont('helvetica', 'bold');
          doc.text(`${cl[1].toLocaleString()}`, cBarX + barW + 2, barY + 4);
        });

        y += 58;
      }

      // Sales detail table
      const sortedSales = [...monthSales].sort((a, b) => b.date.localeCompare(a.date));
      if (sortedSales.length > 0) {
        y = ensureSpace(y, 20);

        drawCardBg(marginL, y, contentW, 8);
        setFill(C.orange);
        doc.rect(marginL, y, contentW, 7, 'F');
        setTextC(C.white);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        const cols = [marginL + 3, marginL + 28, marginL + 65, marginL + 95, marginL + 135];
        doc.text('FECHA', cols[0], y + 5);
        doc.text('PRODUCTO', cols[1], y + 5);
        doc.text('CANTIDAD', cols[2], y + 5);
        doc.text('CLIENTE', cols[3], y + 5);
        doc.text('Nº GUÍA', cols[4], y + 5);
        y += 9;

        sortedSales.forEach((sale, i) => {
          y = ensureSpace(y, 7);
          if (i % 2 === 0) {
            setFill(C.bgLight);
            doc.rect(marginL, y - 3.5, contentW, 6.5, 'F');
          }
          setTextC(C.grayLight);
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.text(sale.date, cols[0], y);
          doc.text(sale.product_name, cols[1], y);
          doc.text(`${sale.quantity} sacos`, cols[2], y);
          doc.text(sale.client || '-', cols[3], y);
          setTextC(C.orangeLight);
          doc.text(sale.notes || '-', cols[4], y);
          y += 6.5;
        });
        y += 6;
      }

      // ===== ASISTENCIA SECTION =====
      y = ensureSpace(y, 20);
      y = drawSectionTitle('ASISTENCIA DEL PERSONAL', y);

      // Attendance bar chart by employee
      if (employees.length > 0) {
        y = ensureSpace(y, 56);
        drawCardBg(marginL, y, contentW, 52);

        setTextC(C.gray);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('ASISTENCIA POR EMPLEADO', marginL + 6, y + 8);

        const chartX = marginL + 8;
        const chartY2 = y + 14;
        const chartW2 = contentW - 16;
        const chartH2 = 30;

        const empData = employees.map(emp => {
          const empRecs = monthAtt.filter(r => r.employee_id === emp.id);
          return {
            name: emp.name,
            present: empRecs.filter(r => r.status === 'present').length,
            absent: empRecs.filter(r => r.status === 'absent').length,
          };
        });
        const maxEmp = Math.max(...empData.map(e => e.present + e.absent), 1);
        const groupW = chartW2 / empData.length;
        const barW = Math.min(12, groupW * 0.35);

        // Grid
        for (let g = 0; g <= 4; g++) {
          const gy = chartY2 + chartH2 - (g / 4) * chartH2;
          setDraw(C.grayDark);
          doc.setLineWidth(0.1);
          doc.line(chartX, gy, chartX + chartW2, gy);
        }

        empData.forEach((emp, i) => {
          const gx = chartX + i * groupW + groupW / 2;

          // Present bar (green-ish orange)
          const ph = (emp.present / maxEmp) * chartH2;
          setFill(C.green);
          if (ph > 0) doc.roundedRect(gx - barW - 0.5, chartY2 + chartH2 - ph, barW, ph, 0.8, 0.8, 'F');

          // Absent bar (red)
          const ah = (emp.absent / maxEmp) * chartH2;
          setFill(C.red);
          if (ah > 0) doc.roundedRect(gx + 0.5, chartY2 + chartH2 - ah, barW, ah, 0.8, 0.8, 'F');

          // Name
          setTextC(C.gray);
          doc.setFontSize(4.5);
          doc.setFont('helvetica', 'normal');
          const shortName = emp.name.length > 10 ? emp.name.substring(0, 10) + '…' : emp.name;
          doc.text(shortName, gx, chartY2 + chartH2 + 5, { align: 'center' });
        });

        // Legend
        setFill(C.green);
        doc.rect(marginL + contentW - 40, y + 6, 3, 3, 'F');
        setTextC(C.grayLight);
        doc.setFontSize(5);
        doc.text('Presente', marginL + contentW - 36, y + 8.5);
        setFill(C.red);
        doc.rect(marginL + contentW - 22, y + 6, 3, 3, 'F');
        doc.text('Ausente', marginL + contentW - 18, y + 8.5);

        y += 58;
      }

      // Attendance detail table
      y = ensureSpace(y, 20);
      drawCardBg(marginL, y, contentW, 8);
      setFill(C.orange);
      doc.rect(marginL, y, contentW, 7, 'F');
      setTextC(C.white);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      const attCols = [marginL + 3, marginL + 50, marginL + 80, marginL + 110, marginL + 145];
      doc.text('EMPLEADO', attCols[0], y + 5);
      doc.text('PRESENTES', attCols[1], y + 5);
      doc.text('AUSENTES', attCols[2], y + 5);
      doc.text('% ASISTENCIA', attCols[3], y + 5);
      doc.text('ESTADO', attCols[4], y + 5);
      y += 9;

      employees.forEach((emp, i) => {
        y = ensureSpace(y, 7);
        const empRecs = monthAtt.filter(r => r.employee_id === emp.id);
        const present = empRecs.filter(r => r.status === 'present').length;
        const absent = empRecs.filter(r => r.status === 'absent').length;
        const total = empRecs.length || 1;
        const pct = Math.round((present / total) * 100);

        if (i % 2 === 0) {
          setFill(C.bgLight);
          doc.rect(marginL, y - 3.5, contentW, 6.5, 'F');
        }

        setTextC(C.grayLight);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text(emp.name, attCols[0], y);
        doc.text(String(present), attCols[1], y);
        doc.text(String(absent), attCols[2], y);

        // Pct with color coding
        if (pct >= 80) setTextC(C.green);
        else if (pct >= 50) setTextC(C.orangeLight);
        else setTextC(C.red);
        doc.setFont('helvetica', 'bold');
        doc.text(`${pct}%`, attCols[3], y);

        // Status badge
        const status = pct >= 80 ? 'ÓPTIMO' : pct >= 50 ? 'REGULAR' : 'CRÍTICO';
        const statusColor = pct >= 80 ? C.green : pct >= 50 ? C.orangeLight : C.red;
        setFill(statusColor as readonly [number, number, number]);
        doc.roundedRect(attCols[4] - 1, y - 3, 18, 5, 1, 1, 'F');
        setTextC(C.white);
        doc.setFontSize(5);
        doc.text(status, attCols[4] + 8, y, { align: 'center' });

        y += 6.5;
      });

      // ===== FOOTER on all pages =====
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        // Footer bar
        setFill(C.bgLight);
        doc.rect(0, H - 10, W, 10, 'F');
        setFill(C.orange);
        doc.rect(0, H - 10, W, 0.5, 'F');

        setTextC(C.gray);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text(`Control de Gestión — Reporte GYC — ${monthName}`, marginL, H - 4);

        setTextC(C.orangeLight);
        doc.setFont('helvetica', 'bold');
        doc.text(`${i} / ${pages}`, W - marginR, H - 4, { align: 'right' });
      }

      const fileName = `GYC_${format(now, 'ddMMyyyy')}.pdf`;
      doc.save(fileName);
      toast.success('Reporte GYC generado exitosamente');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar el reporte');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button onClick={generatePDF} disabled={generating} size="sm" className="gradient-orange text-primary-foreground hover:opacity-90 gap-2">
      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      {generating ? 'Generando...' : 'Reporte GYC'}
    </Button>
  );
}
