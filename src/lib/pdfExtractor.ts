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
  // Right-column text only (X > midpoint of page) — used for conductor block
  let rightColText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const midX = viewport.width / 2;
    const tc = await page.getTextContent();
    const lineMap = new Map<number, string[]>();
    const rightLineMap = new Map<number, string[]>();
    for (const item of tc.items as any[]) {
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push(item.str);
      if (x >= midX) {
        if (!rightLineMap.has(y)) rightLineMap.set(y, []);
        rightLineMap.get(y)!.push(item.str);
      }
    }
    const sorted = [...lineMap.entries()].sort((a, b) => b[0] - a[0]);
    fullText += sorted.map(([, parts]) => parts.join(' ')).join('\n') + '\n';
    const sortedR = [...rightLineMap.entries()].sort((a, b) => b[0] - a[0]);
    rightColText += sortedR.map(([, parts]) => parts.join(' ').trim()).filter(Boolean).join('\n') + '\n';
  }

  const text = fullText.replace(/\u00A0/g, ' ');

  const guideMatch = text.match(/N[°º]\s*CONTROL[:\s]*([A-Z0-9-]+)/i) || text.match(/(NE\d{6,})/);
  const dateMatch = text.match(/FECHA DE EMISION[:\s]*([\d/]+)/i);
  const rifMatch = text.match(/(?:Cedula\/Rif\.?|C\.I\.?\/RIF|RIF)\s*:?\s*([JVEGPjvegp][\s-]?\d[\d\s.\-]*)/);
  const addressMatch = text.match(/Direccion\s*:?\s*([^\n]+)/i);
  const phoneMatch = text.match(/Telefono\s*:?\s*([\d\s.\-()]+)/i);

  // Robust client (Razón Social) extraction: scan lines, skip label-only / RIF lines
  const allLines = text.split('\n').map(l => l.trim());
  const labelRe = /^(Nombre\s*\/?\s*Razon\s*Social|Cliente)\s*:?\s*(.*)$/i;
  const isOtherLabel = (s: string) => /^(Cedula|Rif|Direccion|Telefono|Material|Descripcion|N[°º]|FECHA|HORA|Conductor|Autorizado|Despachado|Recibido)/i.test(s);
  let clientName: string | undefined;
  for (let i = 0; i < allLines.length; i++) {
    const m = allLines[i].match(labelRe);
    if (!m) continue;
    let candidate = m[2].trim();
    // Strip trailing "Cedula/Rif..." appended on same line
    candidate = candidate.replace(/\s*(Cedula\/Rif|RIF|C\.I).*$/i, '').trim();
    if (!candidate || isOtherLabel(candidate)) {
      // Look at next non-empty lines for the actual name
      for (let j = i + 1; j < Math.min(i + 4, allLines.length); j++) {
        const nxt = allLines[j];
        if (!nxt) continue;
        if (isOtherLabel(nxt) || labelRe.test(nxt)) continue;
        candidate = nxt.replace(/\s*(Cedula\/Rif|RIF|C\.I).*$/i, '').trim();
        if (candidate) break;
      }
    }
    if (candidate && !/^[JVEGP][\s-]?\d/i.test(candidate)) {
      clientName = candidate;
      break;
    }
  }

  // Product line (table row): code description qty
  const productLine = text.split('\n').find(l => /PEGO|PBF|PGF|PPF/i.test(l) && /\d/.test(l));
  let product: string | undefined;
  let quantity: number | undefined;
  if (productLine) {
    const qtyMatch = productLine.match(/(\d+)\s*$/);
    if (qtyMatch) quantity = parseInt(qtyMatch[1], 10);
    product = productLine.replace(/^\S+\s*/, '').replace(/\s*\d+\s*$/, '').trim();
  }

  // Conductor block: extract from RIGHT column only (after "Conductor:")
  // Layout: Conductor: / <name> / <id V-xxxxx> / <vehicle brand+color> / <plate>
  let driverName: string | undefined;
  let driverId: string | undefined;
  let vehicleBrand: string | undefined;
  let vehiclePlate: string | undefined;
  const rLines = rightColText.split('\n').map(s => s.trim()).filter(Boolean);
  const condIdxR = rLines.findIndex(l => /^Conductor\b/i.test(l));
  if (condIdxR >= 0) {
    const block: string[] = [];
    for (let k = condIdxR + 1; k < rLines.length && block.length < 6; k++) {
      const ln = rLines[k];
      if (/^(Despachado|Recibido|Autorizado|Firma|Nombre|ESTE DOCUMENTO|ORIGINAL|COPIA)/i.test(ln)) break;
      if (/^[-_\s]+$/.test(ln)) continue;
      block.push(ln);
    }
    // Identify ID line (V-xxxxxx / E-xxxxxx / J-xxxxx)
    const idIdx = block.findIndex(l => /^[VEJPGvejpg][-\s]?\d{4,}/.test(l));
    if (idIdx >= 0) {
      driverName = block.slice(0, idIdx).join(' ').trim() || undefined;
      driverId = block[idIdx].replace(/\s+/g, '').toUpperCase();
      const rest = block.slice(idIdx + 1);
      // Plate: typical Venezuelan plate ~6-7 alphanumeric, mostly uppercase letters+digits
      const plateIdx = rest.findIndex(l => /^[A-Z0-9]{5,8}$/i.test(l.replace(/[-\s]/g, '')));
      if (plateIdx >= 0) {
        vehicleBrand = rest.slice(0, plateIdx).join(' ').trim() || undefined;
        vehiclePlate = rest[plateIdx].replace(/[-\s]/g, '').toUpperCase();
      } else {
        vehicleBrand = rest.join(' ').trim() || undefined;
      }
    } else {
      driverName = block[0];
      vehicleBrand = block.slice(1, -1).join(' ').trim() || undefined;
      vehiclePlate = block[block.length - 1];
    }
  }

  return {
    guideNumber: guideMatch?.[1]?.trim() || '',
    client: clientName,
    rif: rifMatch?.[1]?.replace(/\s+/g, ' ').trim(),
    address: addressMatch?.[1]?.trim().replace(/\s+Telefono.*$/i, '').trim(),
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