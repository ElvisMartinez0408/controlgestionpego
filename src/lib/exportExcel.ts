import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Employee, AttendanceRecord } from '@/hooks/useAttendance';
import type { ProductionRecord } from '@/hooks/useProduction';
import type { SaleRecord } from '@/hooks/useSales';
import type { RawMaterialRecord } from '@/hooks/useRawMaterials';
import type { FinishedStockRecord } from '@/hooks/useFinishedStock';
import type { MaterialStockRow } from '@/hooks/useMaterialStock';
import type { CustomSupply } from '@/hooks/useCustomSupplies';
import type { GuideMetadata } from '@/lib/guidesDb';
import type { AuditEntry } from '@/lib/audit';
import { formatAuditStamp } from '@/lib/audit';
import type { ClientBalance, PalletMovement } from '@/lib/palletsDb';

export interface ExtrasPayload {
  rawRecords?: RawMaterialRecord[];
  finishedStock?: FinishedStockRecord[];
  materialStock?: MaterialStockRow[];
  customSupplies?: CustomSupply[];
  pallets?: { warehouse: number; inCirculation: number; balances: ClientBalance[]; movements: PalletMovement[] };
  guides?: GuideMetadata[];
  audits?: {
    sales?: Record<string, AuditEntry>;
    production?: Record<string, AuditEntry>;
    attendance?: Record<string, AuditEntry>;
    raw_materials?: Record<string, AuditEntry>;
    guides?: Record<string, AuditEntry>;
  };
}

// Brand colors matching the app's dark orange theme
const COLORS = {
  bgDark: 'FF1A1D23',        // --background ~220 20% 10%
  bgCard: 'FF1F232B',        // --card ~220 18% 13%
  orange: 'FFF97316',        // --primary 25 95% 53%
  orangeLight: 'FFFB923C',   // lighter orange
  green: 'FF22C55E',         // --success
  red: 'FFEF4444',           // --destructive
  yellow: 'FFEAB308',        // --warning
  blue: 'FF3B82F6',          // --chart-blue
  textLight: 'FFECE8E1',     // --foreground
  textMuted: 'FF7C818A',     // --muted-foreground
  border: 'FF2E3340',        // --border
  white: 'FFFFFFFF',
};

function styleHeaderRow(row: ExcelJS.Row, colCount: number) {
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, color: { argb: COLORS.white }, size: 11, name: 'Arial' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: COLORS.orangeLight } },
    };
  }
  row.height = 28;
}

function styleDataCell(cell: ExcelJS.Cell, isEven: boolean) {
  cell.font = { color: { argb: COLORS.textLight }, size: 10, name: 'Arial' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? COLORS.bgCard : COLORS.bgDark } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = {
    bottom: { style: 'thin', color: { argb: COLORS.border } },
  };
}

function addTitle(ws: ExcelJS.Worksheet, title: string, colSpan: number) {
  const row = ws.addRow([title]);
  ws.mergeCells(row.number, 1, row.number, colSpan);
  const cell = row.getCell(1);
  cell.font = { bold: true, size: 16, color: { argb: COLORS.orange }, name: 'Arial' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bgDark } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  row.height = 36;

  const subRow = ws.addRow([new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })]);
  ws.mergeCells(subRow.number, 1, subRow.number, colSpan);
  const subCell = subRow.getCell(1);
  subCell.font = { italic: true, size: 10, color: { argb: COLORS.textMuted }, name: 'Arial' };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bgDark } };
  subCell.alignment = { horizontal: 'center' };

  ws.addRow([]);
}

function setSheetBackground(ws: ExcelJS.Worksheet) {
  ws.properties.tabColor = { argb: COLORS.orange };
  ws.views = [{ showGridLines: false }];
}

export async function exportToExcel(
  employees: Employee[],
  attRecords: AttendanceRecord[],
  prodRecords: ProductionRecord[],
  saleRecords: SaleRecord[],
  extras: ExtrasPayload = {},
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PegoFlex';
  wb.created = new Date();

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const monthName = now.toLocaleString('es-MX', { month: 'long' });
  const today = now.toISOString().split('T')[0];

  // ===== 1. RESUMEN (Dashboard) =====
  const wsResumen = wb.addWorksheet('Resumen');
  setSheetBackground(wsResumen);
  wsResumen.columns = [
    { width: 28 }, { width: 20 }, { width: 20 }, { width: 20 },
  ];

  addTitle(wsResumen, '📊 TABLERO DE CONTROL', 4);

  // KPI section
  const kpiHeaders = ['Indicador', 'Hoy', 'Mes', 'Total'];
  const kpiRow = wsResumen.addRow(kpiHeaders);
  styleHeaderRow(kpiRow, 4);

  const todayAtt = attRecords.filter(r => r.date === today);
  const monthAtt = attRecords.filter(r => { const d = new Date(r.date); return d.getMonth() === month && d.getFullYear() === year; });
  const todayProd = prodRecords.filter(r => r.date === today);
  const monthProd = prodRecords.filter(r => { const d = new Date(r.date); return d.getMonth() === month && d.getFullYear() === year; });
  const todaySales = saleRecords.filter(r => r.date === today);
  const monthSales = saleRecords.filter(r => { const d = new Date(r.date); return d.getMonth() === month && d.getFullYear() === year; });

  const kpis = [
    ['Empleados Registrados', employees.length, employees.length, employees.length],
    ['Presentes', todayAtt.filter(r => r.status === 'present').length, monthAtt.filter(r => r.status === 'present').length, attRecords.filter(r => r.status === 'present').length],
    ['Ausentes', todayAtt.filter(r => r.status === 'absent').length, monthAtt.filter(r => r.status === 'absent').length, attRecords.filter(r => r.status === 'absent').length],
    ['Producción (unidades)', todayProd.reduce((s, r) => s + r.quantity, 0), monthProd.reduce((s, r) => s + r.quantity, 0), prodRecords.reduce((s, r) => s + r.quantity, 0)],
    ['Ventas (unidades)', todaySales.reduce((s, r) => s + r.quantity, 0), monthSales.reduce((s, r) => s + r.quantity, 0), saleRecords.reduce((s, r) => s + r.quantity, 0)],
  ];

  kpis.forEach((kpi, i) => {
    const row = wsResumen.addRow(kpi);
    for (let c = 1; c <= 4; c++) {
      styleDataCell(row.getCell(c), i % 2 === 0);
    }
    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(1).font = { bold: true, color: { argb: COLORS.orangeLight }, size: 10, name: 'Arial' };
    row.height = 22;
  });

  // ===== 2. ASISTENCIA =====
  const wsAtt = wb.addWorksheet('Asistencia');
  setSheetBackground(wsAtt);
  wsAtt.columns = [
    { width: 24 }, { width: 20 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 28 },
  ];

  addTitle(wsAtt, '👥 REGISTRO DE ASISTENCIA', 7);

  const attHeaders = ['Empleado', 'Puesto', 'Fecha', 'Entrada', 'Salida', 'Estado', 'Registrado por'];
  const attHeaderRow = wsAtt.addRow(attHeaders);
  styleHeaderRow(attHeaderRow, 7);

  // Sort by date desc, then employee name
  const sortedAtt = [...attRecords].sort((a, b) => b.date.localeCompare(a.date));

  sortedAtt.forEach((rec, i) => {
    const emp = employees.find(e => e.id === rec.employee_id);
    const statusMap: Record<string, string> = { present: '✅ Presente', absent: '❌ Ausente', late: '⚠️ Tardanza' };
    const row = wsAtt.addRow([
      emp?.name || 'Desconocido',
      emp?.position || '-',
      rec.date,
      rec.check_in || '-',
      rec.check_out || '-',
      statusMap[rec.status] || rec.status,
      formatAuditStamp(extras.audits?.attendance?.[rec.id]),
    ]);
    for (let c = 1; c <= 7; c++) {
      styleDataCell(row.getCell(c), i % 2 === 0);
    }
    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

    // Conditional formatting via cell color
    const statusCell = row.getCell(6);
    if (rec.status === 'present') {
      statusCell.font = { color: { argb: COLORS.green }, bold: true, size: 10, name: 'Arial' };
    } else if (rec.status === 'absent') {
      statusCell.font = { color: { argb: COLORS.red }, bold: true, size: 10, name: 'Arial' };
    } else if (rec.status === 'late') {
      statusCell.font = { color: { argb: COLORS.yellow }, bold: true, size: 10, name: 'Arial' };
    }
    row.height = 22;
  });

  // Attendance summary section
  wsAtt.addRow([]);
  const summTitleRow = wsAtt.addRow(['RESUMEN DE ASISTENCIA - ' + monthName.toUpperCase() + ' ' + year]);
  wsAtt.mergeCells(summTitleRow.number, 1, summTitleRow.number, 6);
  summTitleRow.getCell(1).font = { bold: true, size: 13, color: { argb: COLORS.orange }, name: 'Arial' };
  summTitleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bgDark } };
  summTitleRow.getCell(1).alignment = { horizontal: 'center' };

  const summHeaders = wsAtt.addRow(['Empleado', 'Presentes', 'Ausentes', 'Tardanzas', '% Asistencia', '']);
  styleHeaderRow(summHeaders, 5);

  employees.forEach((emp, i) => {
    const empRecords = monthAtt.filter(r => r.employee_id === emp.id);
    const present = empRecords.filter(r => r.status === 'present').length;
    const absent = empRecords.filter(r => r.status === 'absent').length;
    const late = empRecords.filter(r => r.status === 'late').length;
    const total = empRecords.length || 1;
    const pct = Math.round((present / total) * 100);

    const row = wsAtt.addRow([emp.name, present, absent, late, pct + '%', '']);
    for (let c = 1; c <= 5; c++) {
      styleDataCell(row.getCell(c), i % 2 === 0);
    }
    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

    // Color the percentage
    const pctCell = row.getCell(5);
    if (pct >= 80) pctCell.font = { color: { argb: COLORS.green }, bold: true, size: 10, name: 'Arial' };
    else if (pct >= 50) pctCell.font = { color: { argb: COLORS.yellow }, bold: true, size: 10, name: 'Arial' };
    else pctCell.font = { color: { argb: COLORS.red }, bold: true, size: 10, name: 'Arial' };
    row.height = 22;
  });

  // ===== 3. PRODUCCIÓN =====
  const wsProd = wb.addWorksheet('Producción');
  setSheetBackground(wsProd);
  wsProd.columns = [
    { width: 16 }, { width: 24 }, { width: 16 }, { width: 16 }, { width: 24 }, { width: 28 },
  ];

  addTitle(wsProd, '📦 REGISTRO DE PRODUCCIÓN', 6);

  const prodHeaders = ['Fecha', 'Producto', 'Cantidad (sacos)', 'Turno', 'Notas', 'Registrado por'];
  const prodHeaderRow = wsProd.addRow(prodHeaders);
  styleHeaderRow(prodHeaderRow, 6);

  const sortedProd = [...prodRecords].sort((a, b) => b.date.localeCompare(a.date));
  sortedProd.forEach((rec, i) => {
    const row = wsProd.addRow([
      rec.date,
      rec.product_name,
      rec.quantity,
      rec.shift_status || 'Normal',
      rec.notes || '-',
      formatAuditStamp(extras.audits?.production?.[rec.id]),
    ]);
    for (let c = 1; c <= 6; c++) {
      styleDataCell(row.getCell(c), i % 2 === 0);
    }
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };

    // Highlight high production
    if (rec.quantity >= 100) {
      row.getCell(3).font = { color: { argb: COLORS.green }, bold: true, size: 10, name: 'Arial' };
    }
    row.height = 22;
  });

  // Production summary by product
  wsProd.addRow([]);
  const prodSummTitle = wsProd.addRow(['RESUMEN POR PRODUCTO - ' + monthName.toUpperCase() + ' ' + year]);
  wsProd.mergeCells(prodSummTitle.number, 1, prodSummTitle.number, 5);
  prodSummTitle.getCell(1).font = { bold: true, size: 13, color: { argb: COLORS.orange }, name: 'Arial' };
  prodSummTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bgDark } };
  prodSummTitle.getCell(1).alignment = { horizontal: 'center' };

  const prodSummHeaders = wsProd.addRow(['Producto', 'Cantidad Total', 'Registros', '', '']);
  styleHeaderRow(prodSummHeaders, 3);

  const prodBreakdown: Record<string, { qty: number; count: number }> = {};
  monthProd.forEach(r => {
    if (!prodBreakdown[r.product_name]) prodBreakdown[r.product_name] = { qty: 0, count: 0 };
    prodBreakdown[r.product_name].qty += r.quantity;
    prodBreakdown[r.product_name].count += 1;
  });

  Object.entries(prodBreakdown).sort((a, b) => b[1].qty - a[1].qty).forEach(([name, data], i) => {
    const row = wsProd.addRow([name, data.qty, data.count, '', '']);
    for (let c = 1; c <= 3; c++) {
      styleDataCell(row.getCell(c), i % 2 === 0);
    }
    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(2).font = { color: { argb: COLORS.orangeLight }, bold: true, size: 10, name: 'Arial' };
    row.height = 22;
  });

  // Total row
  const totalProd = Object.values(prodBreakdown).reduce((s, d) => s + d.qty, 0);
  const totalProdRow = wsProd.addRow(['TOTAL', totalProd, Object.values(prodBreakdown).reduce((s, d) => s + d.count, 0), '', '']);
  for (let c = 1; c <= 3; c++) {
    const cell = totalProdRow.getCell(c);
    cell.font = { bold: true, color: { argb: COLORS.white }, size: 11, name: 'Arial' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'medium', color: { argb: COLORS.orangeLight } } };
  }
  totalProdRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  totalProdRow.height = 26;

  // ===== 4. VENTAS =====
  const wsSales = wb.addWorksheet('Ventas');
  setSheetBackground(wsSales);
  wsSales.columns = [
    { width: 16 }, { width: 24 }, { width: 16 }, { width: 22 }, { width: 22 }, { width: 28 },
  ];

  addTitle(wsSales, '💰 REGISTRO DE VENTAS', 6);

  const salesHeaders = ['Fecha', 'Producto', 'Cantidad', 'Cliente', 'Nº Guía', 'Registrado por'];
  const salesHeaderRow = wsSales.addRow(salesHeaders);
  styleHeaderRow(salesHeaderRow, 6);

  const sortedSales = [...saleRecords].sort((a, b) => b.date.localeCompare(a.date));
  sortedSales.forEach((rec, i) => {
    const row = wsSales.addRow([
      rec.date,
      rec.product_name,
      rec.quantity,
      rec.client || '-',
      rec.notes || '-',
      formatAuditStamp(extras.audits?.sales?.[rec.id]),
    ]);
    for (let c = 1; c <= 6; c++) {
      styleDataCell(row.getCell(c), i % 2 === 0);
    }
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };

    if (rec.quantity >= 50) {
      row.getCell(3).font = { color: { argb: COLORS.green }, bold: true, size: 10, name: 'Arial' };
    }
    row.height = 22;
  });

  // Sales summary by product
  wsSales.addRow([]);
  const salesSummTitle = wsSales.addRow(['RESUMEN POR PRODUCTO - ' + monthName.toUpperCase() + ' ' + year]);
  wsSales.mergeCells(salesSummTitle.number, 1, salesSummTitle.number, 5);
  salesSummTitle.getCell(1).font = { bold: true, size: 13, color: { argb: COLORS.orange }, name: 'Arial' };
  salesSummTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bgDark } };
  salesSummTitle.getCell(1).alignment = { horizontal: 'center' };

  const salesSummHeaders = wsSales.addRow(['Producto', 'Cantidad Total', 'Ventas', '', '']);
  styleHeaderRow(salesSummHeaders, 3);

  const salesBreakdown: Record<string, { qty: number; count: number }> = {};
  monthSales.forEach(r => {
    if (!salesBreakdown[r.product_name]) salesBreakdown[r.product_name] = { qty: 0, count: 0 };
    salesBreakdown[r.product_name].qty += r.quantity;
    salesBreakdown[r.product_name].count += 1;
  });

  Object.entries(salesBreakdown).sort((a, b) => b[1].qty - a[1].qty).forEach(([name, data], i) => {
    const row = wsSales.addRow([name, data.qty, data.count, '', '']);
    for (let c = 1; c <= 3; c++) {
      styleDataCell(row.getCell(c), i % 2 === 0);
    }
    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(2).font = { color: { argb: COLORS.orangeLight }, bold: true, size: 10, name: 'Arial' };
    row.height = 22;
  });

  const totalSales = Object.values(salesBreakdown).reduce((s, d) => s + d.qty, 0);
  const totalSalesRow = wsSales.addRow(['TOTAL', totalSales, Object.values(salesBreakdown).reduce((s, d) => s + d.count, 0), '', '']);
  for (let c = 1; c <= 3; c++) {
    const cell = totalSalesRow.getCell(c);
    cell.font = { bold: true, color: { argb: COLORS.white }, size: 11, name: 'Arial' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'medium', color: { argb: COLORS.orangeLight } } };
  }
  totalSalesRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  totalSalesRow.height = 26;

  // Sales by client
  wsSales.addRow([]);
  const clientTitle = wsSales.addRow(['RESUMEN POR CLIENTE - ' + monthName.toUpperCase() + ' ' + year]);
  wsSales.mergeCells(clientTitle.number, 1, clientTitle.number, 5);
  clientTitle.getCell(1).font = { bold: true, size: 13, color: { argb: COLORS.orange }, name: 'Arial' };
  clientTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bgDark } };
  clientTitle.getCell(1).alignment = { horizontal: 'center' };

  const clientHeaders = wsSales.addRow(['Cliente', 'Cantidad Total', 'Ventas', '', '']);
  styleHeaderRow(clientHeaders, 3);

  const clientBreakdown: Record<string, { qty: number; count: number }> = {};
  monthSales.forEach(r => {
    const client = r.client || 'Sin cliente';
    if (!clientBreakdown[client]) clientBreakdown[client] = { qty: 0, count: 0 };
    clientBreakdown[client].qty += r.quantity;
    clientBreakdown[client].count += 1;
  });

  Object.entries(clientBreakdown).sort((a, b) => b[1].qty - a[1].qty).forEach(([name, data], i) => {
    const row = wsSales.addRow([name, data.qty, data.count, '', '']);
    for (let c = 1; c <= 3; c++) {
      styleDataCell(row.getCell(c), i % 2 === 0);
    }
    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    row.height = 22;
  });

  // ===== 5. EMPLEADOS =====
  const wsEmp = wb.addWorksheet('Empleados');
  setSheetBackground(wsEmp);
  wsEmp.columns = [
    { width: 8 }, { width: 28 }, { width: 24 },
  ];

  addTitle(wsEmp, '🏢 DIRECTORIO DE EMPLEADOS', 3);

  const empHeaders = ['#', 'Nombre', 'Puesto'];
  const empHeaderRow = wsEmp.addRow(empHeaders);
  styleHeaderRow(empHeaderRow, 3);

  employees.forEach((emp, i) => {
    const row = wsEmp.addRow([i + 1, emp.name, emp.position]);
    for (let c = 1; c <= 3; c++) {
      styleDataCell(row.getCell(c), i % 2 === 0);
    }
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
    row.height = 22;
  });

  // ===== 6. MATERIAS PRIMAS =====
  const rawRecords = extras.rawRecords ?? [];
  if (rawRecords.length > 0) {
    const wsRaw = wb.addWorksheet('Materias Primas');
    setSheetBackground(wsRaw);
    wsRaw.columns = [
      { width: 14 }, { width: 24 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 28 }, { width: 28 },
    ];
    addTitle(wsRaw, '🧱 ENTRADAS DE MATERIA PRIMA', 8);
    const rawHeaders = ['Fecha', 'Material', 'Cantidad', 'Unidad', 'Sacos', 'Kilos/Saco', 'Notas', 'Registrado por'];
    styleHeaderRow(wsRaw.addRow(rawHeaders), 8);
    [...rawRecords].sort((a, b) => b.date.localeCompare(a.date)).forEach((rec, i) => {
      const row = wsRaw.addRow([
        rec.date, rec.material_name, rec.quantity, rec.unit,
        rec.sack_count ?? '-', rec.kilos_per_sack ?? '-', rec.notes || '-',
        formatAuditStamp(extras.audits?.raw_materials?.[rec.id]),
      ]);
      for (let c = 1; c <= 8; c++) styleDataCell(row.getCell(c), i % 2 === 0);
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      row.height = 22;
    });
  }

  // ===== 7. INVENTARIOS (Stock actual) =====
  const finStock = extras.finishedStock ?? [];
  const matStock = extras.materialStock ?? [];
  const supplies = extras.customSupplies ?? [];
  if (finStock.length + matStock.length + supplies.length > 0) {
    const wsInv = wb.addWorksheet('Inventarios');
    setSheetBackground(wsInv);
    wsInv.columns = [{ width: 28 }, { width: 18 }, { width: 14 }, { width: 22 }];
    addTitle(wsInv, '📊 INVENTARIOS ACTUALES', 4);

    const addBlock = (title: string, headers: string[], rows: (string | number)[][]) => {
      const t = wsInv.addRow([title]);
      wsInv.mergeCells(t.number, 1, t.number, 4);
      t.getCell(1).font = { bold: true, size: 12, color: { argb: COLORS.orange }, name: 'Arial' };
      t.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bgDark } };
      t.getCell(1).alignment = { horizontal: 'left' };
      styleHeaderRow(wsInv.addRow(headers), headers.length);
      rows.forEach((r, i) => {
        const row = wsInv.addRow(r);
        for (let c = 1; c <= headers.length; c++) styleDataCell(row.getCell(c), i % 2 === 0);
        row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        row.height = 22;
      });
      wsInv.addRow([]);
    };

    if (finStock.length) {
      addBlock('PRODUCTO TERMINADO (sacos)', ['Producto', 'Stock', '', 'Actualizado'],
        finStock.map(s => [s.product_name, s.stock, '', new Date(s.updated_at).toLocaleString('es-VE')]));
    }
    if (matStock.length) {
      addBlock('MATERIA PRIMA EN STOCK', ['Material', 'Stock', 'Unidad', 'Actualizado'],
        matStock.map(s => [s.material_name, Number(s.stock), s.unit, new Date(s.updated_at).toLocaleString('es-VE')]));
    }
    if (supplies.length) {
      addBlock('INSUMOS PERSONALIZADOS', ['Nombre', 'Cantidad', 'Unidad', 'Umbral de alerta'],
        supplies.map(s => [s.name, Number(s.current_quantity), s.unit, Number(s.alert_threshold)]));
    }
  }

  // ===== 8. GUÍAS =====
  const guides = extras.guides ?? [];
  if (guides.length > 0) {
    const wsG = wb.addWorksheet('Guías');
    setSheetBackground(wsG);
    wsG.columns = [
      { width: 14 }, { width: 14 }, { width: 24 }, { width: 14 }, { width: 14 }, { width: 22 }, { width: 20 }, { width: 18 }, { width: 16 }, { width: 28 },
    ];
    addTitle(wsG, '🚚 REGISTRO DE GUÍAS', 10);
    const gh = ['Nº Guía', 'Fecha', 'Cliente', 'RIF', 'Producto', 'Cantidad', 'Chofer', 'Cédula', 'Placa', 'Registrado por'];
    styleHeaderRow(wsG.addRow(gh), 10);
    [...guides].sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach((g, i) => {
      const row = wsG.addRow([
        g.guideNumber, g.date || '-', g.client || '-', g.rif || '-',
        g.productName || g.product || '-', g.quantity ?? '-',
        g.driverName || '-', g.driverId || '-', g.vehiclePlate || '-',
        formatAuditStamp(extras.audits?.guides?.[g.guideNumber]),
      ]);
      for (let c = 1; c <= 10; c++) styleDataCell(row.getCell(c), i % 2 === 0);
      row.height = 22;
    });
  }

  // ===== 9. PALETAS =====
  const pal = extras.pallets;
  if (pal && (pal.movements.length > 0 || pal.warehouse > 0 || pal.inCirculation > 0)) {
    const wsP = wb.addWorksheet('Paletas');
    setSheetBackground(wsP);
    wsP.columns = [{ width: 28 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 28 }];
    addTitle(wsP, '🪵 GESTIÓN DE PALETAS', 6);

    // KPIs
    styleHeaderRow(wsP.addRow(['Indicador', 'Cantidad', '', '', '', '']), 2);
    [['Disponibles en almacén', pal.warehouse], ['En circulación (deudores)', pal.inCirculation], ['Clientes con saldo', pal.balances.filter(b => b.balance > 0).length]]
      .forEach((r, i) => {
        const row = wsP.addRow([r[0], r[1], '', '', '', '']);
        for (let c = 1; c <= 2; c++) styleDataCell(row.getCell(c), i % 2 === 0);
        row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(2).font = { color: { argb: COLORS.orangeLight }, bold: true, size: 11, name: 'Arial' };
        row.height = 22;
      });
    wsP.addRow([]);

    // Balances por cliente
    if (pal.balances.length > 0) {
      const tb = wsP.addRow(['SALDOS POR CLIENTE']);
      wsP.mergeCells(tb.number, 1, tb.number, 6);
      tb.getCell(1).font = { bold: true, size: 12, color: { argb: COLORS.orange }, name: 'Arial' };
      tb.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bgDark } };
      styleHeaderRow(wsP.addRow(['Cliente', 'Entregadas', 'Devueltas', 'Saldo', 'Movimientos', '']), 5);
      pal.balances.forEach((b, i) => {
        const row = wsP.addRow([b.client, b.delivered, b.received, b.balance, b.movements, '']);
        for (let c = 1; c <= 5; c++) styleDataCell(row.getCell(c), i % 2 === 0);
        row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        const bal = row.getCell(4);
        bal.font = { color: { argb: b.balance > 0 ? COLORS.red : COLORS.green }, bold: true, size: 10, name: 'Arial' };
        row.height = 22;
      });
      wsP.addRow([]);
    }

    // Movimientos
    if (pal.movements.length > 0) {
      const tm = wsP.addRow(['HISTORIAL DE MOVIMIENTOS']);
      wsP.mergeCells(tm.number, 1, tm.number, 6);
      tm.getCell(1).font = { bold: true, size: 12, color: { argb: COLORS.orange }, name: 'Arial' };
      tm.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bgDark } };
      styleHeaderRow(wsP.addRow(['Fecha', 'Cliente', 'Entregadas', 'Devueltas', 'Nota', 'Registrado por']), 6);
      [...pal.movements].sort((a, b) => b.createdAt - a.createdAt).forEach((m, i) => {
        const row = wsP.addRow([
          m.date, m.client, m.delivered, m.received, m.note || '-',
          `${m.userName} · ${new Date(m.createdAt).toLocaleString('es-VE')}`,
        ]);
        for (let c = 1; c <= 6; c++) styleDataCell(row.getCell(c), i % 2 === 0);
        row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(6).alignment = { horizontal: 'left', vertical: 'middle' };
        row.height = 22;
      });
    }
  }

  // Generate and download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `PegoFlex_${year}_${String(month + 1).padStart(2, '0')}.xlsx`;
  saveAs(blob, fileName);
}
