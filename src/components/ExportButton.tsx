import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAttendance } from '@/hooks/useAttendance';
import { useProduction } from '@/hooks/useProduction';
import { useSales } from '@/hooks/useSales';
import { exportToExcel } from '@/lib/exportExcel';
import { toast } from 'sonner';

export function ExportButton() {
  const [exporting, setExporting] = useState(false);
  const { employees, records: attRecords } = useAttendance();
  const { records: prodRecords } = useProduction();
  const { records: saleRecords } = useSales();

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToExcel(employees, attRecords, prodRecords, saleRecords);
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
      className="gradient-orange text-primary-foreground hover:opacity-90 gap-2"
      size="sm"
    >
      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {exporting ? 'Generando...' : 'Exportar Excel'}
    </Button>
  );
}
