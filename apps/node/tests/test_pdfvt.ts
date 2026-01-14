import fontkit from '@pdf-lib/fontkit';
import { Assets } from '..';
import { PDFDocument, DPart, StandardFonts } from '../../..';

// Simple PDF/VT sample generator.
export default async (assets: Assets) => {
  const pdfDoc = await PDFDocument.create();

  // Register fontkit and embed a font so the font is fully embedded in output
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(assets.fonts.ttf.ubuntu_r);

  // Build a DPartRoot and multiple logical records (VDP-style), attach to catalog
  const droot = pdfDoc.createDPartRoot();
  const numRecords = 10;

  const tinyPngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';
  const img = await pdfDoc.embedPng(tinyPngBase64);

  for (let i = 1; i <= numRecords; i++) {
    const id = `rec-${i}`;
    const record = DPart.createNode(pdfDoc.context, 'LogicalRecord');
    record.setAttr('ID', id, pdfDoc.context);
    record.setAttr('Name', `Recipient ${i}`, pdfDoc.context);
    record.setAttr('Note', `VDP sample ${i}`, pdfDoc.context);

    // Register the record so we have an indirect object for links
    pdfDoc.context.register(record.asDict());
    droot.addChild(pdfDoc.context, record);

    // Add a page for each record and link it
    const page = pdfDoc.addPage([400, 260]);
    page.setFont(font);
    page.drawText(`PDF/VT VDP Sample — ${id}`, { x: 50, y: 180, size: 14 });
    page.drawText(`Recipient: Recipient ${i}`, { x: 50, y: 160, size: 10 });
    page.drawText(`Note: VDP sample ${i}`, { x: 50, y: 144, size: 10 });
    page.drawImage(img, { x: 300, y: 80, width: 48, height: 48 });
    page.setDPart(record.asDict());
  }

  pdfDoc.setDPartRoot(droot);

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
