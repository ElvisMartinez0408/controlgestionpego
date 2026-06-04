import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAttendance } from '@/hooks/useAttendance';
import { useProduction } from '@/hooks/useProduction';
import { useSales } from '@/hooks/useSales';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import { useFinishedStock } from '@/hooks/useFinishedStock';
import { useMaterialStock } from '@/hooks/useMaterialStock';
import { useCustomSupplies } from '@/hooks/useCustomSupplies';
import { usePallets } from '@/hooks/usePallets';
import { listGuideMetadata } from '@/lib/guidesDb';
import { listAuditsFor } from '@/lib/audit';
import { exportToExcel } from '@/lib/exportExcel';
import { toast } from 'sonner';

export function ExportButton() {
  const [exporting, setExporting] = useState(false);
  const { employees, records: attRecords } = useAttendance();
  const { records: prodRecords } = useProduction();
  const { records: saleRecords } = useSales();
  const { records: rawRecords } = useRawMaterials();
  const { items: finishedStock } = useFinishedStock();
  const { stocks: materialStock } = useMaterialStock();
  const { supplies: customSupplies } = useCustomSupplies();
  const { warehouse, inCirculation, balances, movements } = usePallets();

  const handleExport = async () => {
    setExporting(true);
    try {
      const [guides, auditSales, auditProd, auditAtt, auditRaw, auditGuides] = await Promise.all([
        listGuideMetadata(),
        listAuditsFor('sales'),
        listAuditsFor('production'),
        listAuditsFor('attendance'),
        listAuditsFor('raw_materials'),
        listAuditsFor('guides'),
      ]);
      await exportToExcel(employees, attRecords, prodRecords, saleRecords, {
        rawRecords,
        finishedStock,
        materialStock,
        customSupplies,
        pallets: { warehouse, inCirculation, balances, movements },
        guides,
        audits: { sales: auditSales, production: auditProd, attendance: auditAtt, raw_materials: auditRaw, guides: auditGuides },
      });
      toast.success('Reporte Excel generado exitosamente');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar el reporte');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={exporting}
      size="icon"
      variant="ghost"
      title="Exportar Excel"
      className="text-muted-foreground hover:text-primary h-9 w-9"
    >
      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
    </Button>
  );
}
