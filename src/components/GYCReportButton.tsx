import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAttendance } from '@/hooks/useAttendance';
import { useProduction } from '@/hooks/useProduction';
import { useSales } from '@/hooks/useSales';
import { useRole } from '@/contexts/RoleContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function GYCReportButton() {
  const { isAdmin } = useRole();
  const [generating, setGenerating] = useState(false);
  const { employees, records: attRecords } = useAttendance();
  const { records: prodRecords } = useProduction();
  const { records: saleRecords } = useSales();

  if (!isAdmin) return null;

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const now = new Date();
      const doc = new jsPDF('p', 'mm', 'a4');
      const w = doc.internal.pageSize.getWidth();
      const today = now.toISOString().split('T')[0];
      const monthNow = now.getMonth();
      const yearNow = now.getFullYear();

      // Header
      doc.setFillColor(26, 29, 35);
      doc.rect(0, 0, w, 40, 'F');
      doc.setFillColor(249, 115, 22);
      doc.rect(0, 37, w, 3, 'F');

      doc.setTextColor(249, 115, 22);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE GYC', w / 2, 18, { align: 'center' });

      doc.setTextColor(200, 200, 200);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${format(now, 'dd/MM/yyyy')} — ${format(now, 'HH:mm:ss')}`, w / 2, 28, { align: 'center' });

      let y = 50;

      // Production Section
      const monthProd = prodRecords.filter(r => {
        const d = new Date(r.date + 'T12:00:00');
        return d.getMonth() === monthNow && d.getFullYear() === yearNow;
      });
      const totalProd = monthProd.reduce((s, r) => s + r.quantity, 0);
      const prodByType: Record<string, number> = {};
      monthProd.forEach(r => { prodByType[r.product_name] = (prodByType[r.product_name] || 0) + r.quantity; });

      doc.setTextColor(249, 115, 22);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('PRODUCCIÓN', 15, y);
      y += 8;

      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total del Mes: ${totalProd.toLocaleString()} sacos`, 15, y);
      y += 7;

      Object.entries(prodByType).forEach(([name, qty]) => {
        doc.text(`• ${name}: ${qty.toLocaleString()} sacos`, 20, y);
        y += 6;
      });
      y += 5;

      // Sales Section
      const monthSales = saleRecords.filter(r => {
        const d = new Date(r.date + 'T12:00:00');
        return d.getMonth() === monthNow && d.getFullYear() === yearNow;
      });
      const totalSales = monthSales.reduce((s, r) => s + r.quantity, 0);

      doc.setTextColor(249, 115, 22);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('VENTAS', 15, y);
      y += 8;

      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total del Mes: ${totalSales.toLocaleString()} sacos`, 15, y);
      y += 8;

      // Table header
      doc.setFillColor(249, 115, 22);
      doc.rect(15, y - 4, w - 30, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Fecha', 17, y);
      doc.text('Producto', 42, y);
      doc.text('Cantidad', 82, y);
      doc.text('Cliente', 107, y);
      doc.text('Nº Guía', 152, y);
      y += 6;

      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      const sortedSales = [...monthSales].sort((a, b) => b.date.localeCompare(a.date));
      sortedSales.forEach((sale, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        if (i % 2 === 0) { doc.setFillColor(245, 245, 245); doc.rect(15, y - 4, w - 30, 6, 'F'); }
        doc.text(sale.date, 17, y);
        doc.text(sale.product_name, 42, y);
        doc.text(`${sale.quantity} sacos`, 82, y);
        doc.text(sale.client || '-', 107, y);
        doc.text(sale.notes || '-', 152, y);
        y += 6;
      });
      y += 8;

      // Attendance Section
      if (y > 240) { doc.addPage(); y = 20; }
      const monthAtt = attRecords.filter(r => {
        const d = new Date(r.date + 'T12:00:00');
        return d.getMonth() === monthNow && d.getFullYear() === yearNow;
      });

      doc.setTextColor(249, 115, 22);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ASISTENCIA', 15, y);
      y += 8;

      doc.setFillColor(249, 115, 22);
      doc.rect(15, y - 4, w - 30, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Empleado', 17, y);
      doc.text('Presentes', 82, y);
      doc.text('Ausentes', 112, y);
      doc.text('% Asistencia', 142, y);
      y += 6;

      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      employees.forEach((emp, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const empRecs = monthAtt.filter(r => r.employee_id === emp.id);
        const present = empRecs.filter(r => r.status === 'present').length;
        const absent = empRecs.filter(r => r.status === 'absent').length;
        const total = empRecs.length || 1;
        const pct = Math.round((present / total) * 100);

        if (i % 2 === 0) { doc.setFillColor(245, 245, 245); doc.rect(15, y - 4, w - 30, 6, 'F'); }
        doc.text(emp.name, 17, y);
        doc.text(String(present), 82, y);
        doc.text(String(absent), 112, y);
        doc.text(`${pct}%`, 142, y);
        y += 6;
      });

      // Footer
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFillColor(26, 29, 35);
        doc.rect(0, 287, w, 10, 'F');
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(7);
        doc.text(`Control de Gestión — Reporte GYC — Página ${i}/${pages}`, w / 2, 293, { align: 'center' });
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
