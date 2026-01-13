import fontkit from '@pdf-lib/fontkit';
import { Assets } from '..';
import { PDFDocument, DPart, StandardFonts } from '../../..';

// Simple PDF/VT sample generator.
export default async (assets: Assets) => {
  const pdfDoc = await PDFDocument.create();

  // Register fontkit and embed a font so the font is fully embedded in output
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(assets.fonts.ttf.ubuntu_r);

  // Build a DPartRoot and a logical record, attach to catalog
  const droot = pdfDoc.createDPartRoot();
  const record = DPart.createNode(pdfDoc.context, 'LogicalRecord');
  record.setAttr('ID', 'rec-1', pdfDoc.context);
  record.setAttr('Note', 'Generated for PDF/VT testing', pdfDoc.context);
  droot.addChild(pdfDoc.context, record);
  pdfDoc.setDPartRoot(droot);

  // Add a page, link it to the logical record and draw some text
  const page = pdfDoc.addPage([400, 200]);
  page.setFont(font);
  page.drawText('PDF/VT Sample — rec-1', { x: 50, y: 140, size: 14 });
  page.drawText('This page is logically linked to a DPart record.', {
    x: 50,
    y: 120,
    size: 10,
  });
  page.setDPart(record.asDict());

  // Inject minimal PDF/VT XMP metadata
  pdfDoc.setPDFVTXMP('1.0', 'PDF/VT-1');

  // Attach a simple (dummy) ICC profile as OutputIntent
  const iccBytes = new Uint8Array([0, 1, 2, 3, 4, 5]);
  pdfDoc.attachOutputIntent(iccBytes, {
    OutputConditionIdentifier: 'TestICC',
    Info: 'Dummy ICC Profile for PDF/VT example',
  });

  // Ensure fonts/images are embedded and register Names mapping
  await pdfDoc.ensureResourcesForPrint();

  // Save and return bytes (apps/node expects Uint8Array)
  return pdfDoc.save();
};
