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
      size="icon"
      variant="ghost"
      title="Exportar Excel"
      className="text-muted-foreground hover:text-primary h-9 w-9"
    >
      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
    </Button>
  );
}
