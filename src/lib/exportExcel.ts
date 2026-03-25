import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Employee, AttendanceRecord } from '@/hooks/useAttendance';
import type { ProductionRecord } from '@/hooks/useProduction';
import type { SaleRecord } from '@/hooks/useSales';

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
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Control de Gestión';
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
    { width: 24 }, { width: 20 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 },
  ];

  addTitle(wsAtt, '👥 REGISTRO DE ASISTENCIA', 6);

  const attHeaders = ['Empleado', 'Puesto', 'Fecha', 'Entrada', 'Salida', 'Estado'];
  const attHeaderRow = wsAtt.addRow(attHeaders);
  styleHeaderRow(attHeaderRow, 6);

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
    ]);
    for (let c = 1; c <= 6; c++) {
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
    { width: 16 }, { width: 24 }, { width: 16 }, { width: 14 }, { width: 28 },
  ];

  addTitle(wsProd, '📦 REGISTRO DE PRODUCCIÓN', 5);

  const prodHeaders = ['Fecha', 'Producto', 'Cantidad', 'Unidad', 'Notas'];
  const prodHeaderRow = wsProd.addRow(prodHeaders);
  styleHeaderRow(prodHeaderRow, 5);

  const sortedProd = [...prodRecords].sort((a, b) => b.date.localeCompare(a.date));
  sortedProd.forEach((rec, i) => {
    const row = wsProd.addRow([rec.date, rec.product_name, rec.quantity, rec.unit, rec.notes || '-']);
    for (let c = 1; c <= 5; c++) {
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
    { width: 16 }, { width: 24 }, { width: 16 }, { width: 22 }, { width: 28 },
  ];

  addTitle(wsSales, '💰 REGISTRO DE VENTAS', 5);

  const salesHeaders = ['Fecha', 'Producto', 'Cantidad', 'Cliente', 'Observaciones'];
  const salesHeaderRow = wsSales.addRow(salesHeaders);
  styleHeaderRow(salesHeaderRow, 5);

  const sortedSales = [...saleRecords].sort((a, b) => b.date.localeCompare(a.date));
  sortedSales.forEach((rec, i) => {
    const row = wsSales.addRow([rec.date, rec.product_name, rec.quantity, rec.client || '-', rec.notes || '-']);
    for (let c = 1; c <= 5; c++) {
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

  // Generate and download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `Control_Gestion_${year}_${String(month + 1).padStart(2, '0')}.xlsx`;
  saveAs(blob, fileName);
}
