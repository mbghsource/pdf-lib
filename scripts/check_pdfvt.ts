import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'src/api';
import { PDFName, PDFStream, PDFDict } from 'src/core';

async function check(pdfPath: string) {
  const bytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(bytes, { updateMetadata: false });

  // Check Catalog DPart
  const catalog = pdfDoc.catalog;
  const dpartRef = catalog.get(PDFName.of('DPart'));
  if (!dpartRef) {
    console.error('Catalog missing /DPartRoot (or DPart ref)');
    return 1;
  }

  // Check OutputIntents
  const oi = catalog.get(PDFName.of('OutputIntents'));
  if (!oi) {
    console.error('Catalog missing /OutputIntents');
    return 1;
  }

  // Check Metadata XMP for PDF/VT tags
  const metaRef = catalog.get(PDFName.of('Metadata'));
  if (!metaRef) {
    console.error('Catalog missing Metadata stream');
    return 1;
  }

  const metaStream = pdfDoc.context.lookup(metaRef as any) as PDFStream | undefined;
  if (!metaStream) {
    console.error('Metadata reference does not point to a stream');
    return 1;
  }

  const contents = metaStream.getContentsString();
  if (!contents.includes('<pdfvt:Conformance>PDF/VT-1</pdfvt:Conformance>')) {
    console.error('XMP metadata missing pdfvt:Conformance PDF/VT-1');
    return 1;
  }
  if (!contents.includes('<pdfvt:Version>1.0</pdfvt:Version>')) {
    console.error('XMP metadata missing pdfvt:Version 1.0');
    return 1;
  }

  // Check first page DPart link
  const pages = pdfDoc.getPages();
  if (!pages || pages.length === 0) {
    console.error('No pages in document');
    return 1;
  }
  const firstPage = pages[0];
  const pageDPartRef = firstPage.node.lookupMaybe(PDFName.of('DPart'), (Object as any));
  if (!pageDPartRef) {
    console.error('First page missing /DPart reference');
    return 1;
  }

  console.log('PDF/VT validation checks passed');
  return 0;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/check_pdfvt.ts <path-to-pdf>');
    process.exit(2);
  }
  const pdfPath = args[0];
  check(pdfPath).then((code) => process.exit(code)).catch((err) => {
    console.error('Error checking PDF:', err);
    process.exit(2);
  });
}

export default check;
