import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - vite worker import
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ExtractedGuide {
  guideNumber: string;
  client?: string;
  rif?: string;
  address?: string;
  phone?: string;
  product?: string;
  productName?: string;
  quantity?: number;
  date?: string;
  driverName?: string;
  driverId?: string;
  vehicleBrand?: string;
  vehiclePlate?: string;
  rawText: string;
}

function mapProductName(desc: string): string | undefined {
  const u = desc.toUpperCase();
  if (u.includes('BLANCO')) return 'Pego Blanco';
  if (u.includes('PREMIUM')) return 'Pego Premium';
  if (u.includes('GRIS') || u.includes('PEGO')) return 'Pego Gris';
  return undefined;
}

function parseDate(s?: string): string | undefined {
  if (!s) return undefined;
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return undefined;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export async function extractGuideFromPdf(file: File): Promise<ExtractedGuide> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const lineMap = new Map<number, string[]>();
    for (const item of tc.items as any[]) {
      const y = Math.round(item.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push(item.str);
    }
    const sorted = [...lineMap.entries()].sort((a, b) => b[0] - a[0]);
    fullText += sorted.map(([, parts]) => parts.join(' ')).join('\n') + '\n';
  }

  const text = fullText.replace(/\u00A0/g, ' ');

  const guideMatch = text.match(/N[°º]\s*CONTROL[:\s]*([A-Z0-9-]+)/i) || text.match(/(NE\d{6,})/);
  const dateMatch = text.match(/FECHA DE EMISION[:\s]*([\d/]+)/i);
  const clientMatch = text.match(/(?:Nombre\/Razon Social|Cliente)[:\s]*([^\n]+?)(?:\s+Cedula|\s+RIF|\n)/i);
  const rifMatch = text.match(/(?:Cedula\/Rif\.?|RIF)[:\s]*([JVEGPjvegp][\s-]?\d[\d\s.-]*)/);
  const addressMatch = text.match(/Direccion[:\s]*([^\n]+?)(?:\s+Telefono|\n)/i);
  const phoneMatch = text.match(/Telefono[:\s]*([\d\s.\-()]+)/i);

  // Product line (table row): code description qty
  const productLine = text.split('\n').find(l => /PEGO|PBF|PGF|PPF/i.test(l) && /\d/.test(l));
  let product: string | undefined;
  let quantity: number | undefined;
  if (productLine) {
    const qtyMatch = productLine.match(/(\d+)\s*$/);
    if (qtyMatch) quantity = parseInt(qtyMatch[1], 10);
    product = productLine.replace(/^\S+\s*/, '').replace(/\s*\d+\s*$/, '').trim();
  }

  // Conductor block: name, id, vehicle brand, plate (after the word "Conductor:")
  let driverName: string | undefined;
  let driverId: string | undefined;
  let vehicleBrand: string | undefined;
  let vehiclePlate: string | undefined;
  const condIdx = text.search(/Conductor[:\s]/i);
  if (condIdx >= 0) {
    const after = text.slice(condIdx).split('\n').slice(1, 8).map(s => s.trim()).filter(Boolean);
    // Filter out other section headers
    const filtered = after.filter(s => !/Despachado|Recibido|Autorizado|Firma|Nombre/i.test(s));
    driverName = filtered[0];
    driverId = filtered[1]?.replace(/[^\d.]/g, '');
    vehicleBrand = filtered[2];
    vehiclePlate = filtered[3];
  }

  return {
    guideNumber: guideMatch?.[1]?.trim() || '',
    client: clientMatch?.[1]?.trim(),
    rif: rifMatch?.[1]?.replace(/\s+/g, ' ').trim(),
    address: addressMatch?.[1]?.trim(),
    phone: phoneMatch?.[1]?.trim(),
    product,
    productName: product ? mapProductName(product) : undefined,
    quantity,
    date: parseDate(dateMatch?.[1]),
    driverName,
    driverId,
    vehicleBrand,
    vehiclePlate,
    rawText: text,
  };
}