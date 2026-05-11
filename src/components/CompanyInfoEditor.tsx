import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRole } from '@/contexts/RoleContext';
import { getCompanyInfo, saveCompanyInfo, type CompanyInfo } from '@/lib/companyInfo';

export function CompanyInfoEditor() {
  const { isAdmin } = useRole();
  const [data, setData] = useState<CompanyInfo>({ name: '', rif: '', address: '', phones: '' });

  useEffect(() => { setData(getCompanyInfo()); }, []);

  const handleSave = () => {
    if (!data.name.trim()) { toast.error('El nombre de la empresa es obligatorio'); return; }
    saveCompanyInfo(data);
    toast.success('Información de la empresa guardada');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Información de la Empresa</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-muted-foreground text-xs">Nombre completo / Razón Social</Label>
          <Input
            value={data.name}
            onChange={e => setData(d => ({ ...d, name: e.target.value }))}
            placeholder="Mi Empresa, C.A."
            disabled={!isAdmin}
            className="mt-1 bg-secondary border-border"
          />
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">RIF</Label>
          <Input
            value={data.rif}
            onChange={e => setData(d => ({ ...d, rif: e.target.value }))}
            placeholder="J-12345678-9"
            disabled={!isAdmin}
            className="mt-1 bg-secondary border-border"
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-muted-foreground text-xs">Ubicación / Dirección</Label>
          <Textarea
            value={data.address}
            onChange={e => setData(d => ({ ...d, address: e.target.value }))}
            placeholder="Av. principal..."
            disabled={!isAdmin}
            rows={2}
            className="mt-1 bg-secondary border-border"
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-muted-foreground text-xs">Números telefónicos</Label>
          <Input
            value={data.phones}
            onChange={e => setData(d => ({ ...d, phones: e.target.value }))}
            placeholder="0212-1234567 / 0414-1234567"
            disabled={!isAdmin}
            className="mt-1 bg-secondary border-border"
          />
        </div>
      </div>
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={handleSave} className="gradient-orange text-primary-foreground">
            <Save className="w-4 h-4 mr-2" /> Guardar Información
          </Button>
        </div>
      )}
    </div>
  );
}
