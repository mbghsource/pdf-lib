import fs from 'fs';
import os from 'os';
import { sep } from 'path';
import fontkit from '@pdf-lib/fontkit';

import PDFDocument from '../src/api/PDFDocument';
import DPart from '../src/api/DPart';

(async () => {
  try {
    const assetsDir = `${__dirname}${sep}..${sep}assets${sep}`;
    const ubuntuPath = `${assetsDir}fonts${sep}ubuntu${sep}Ubuntu-R.ttf`;
    const ubuntu = fs.readFileSync(ubuntuPath);

    const pdfDoc = await PDFDocument.create();

    pdfDoc.registerFontkit(fontkit as any);
    const font = await pdfDoc.embedFont(ubuntu);

    const droot = DPart.createRoot(pdfDoc.context);
    // Create a larger VDP sample: multiple logical records with images
    const recordsCount = 12;

    // Small 1x1 PNG base64 (same as tests) to keep the example bundled
    const tinyPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';
    const img = await pdfDoc.embedPng(tinyPngBase64);

    for (let i = 1; i <= recordsCount; i++) {
      const id = `rec-${i}`;
      const record = DPart.createNode(pdfDoc.context, 'LogicalRecord');
      record.setAttr('ID', id, pdfDoc.context);
      record.setAttr('Name', `Recipient ${i}`, pdfDoc.context);
      record.setAttr('Seq', i, pdfDoc.context);

      // Register the record so it can be referenced indirectly and added to root
      pdfDoc.context.register(record.asDict());
      droot.addChild(pdfDoc.context, record);

      const page = pdfDoc.addPage([400, 260]);
      page.setFont(font);
      page.drawText(`PDF/VT VDP Sample — ${id}`, { x: 50, y: 180, size: 14 });
      page.drawText(`Recipient: Recipient ${i}`, { x: 50, y: 160, size: 10 });
      page.drawText(`Sequence: ${i}`, { x: 50, y: 144, size: 10 });
      // Draw the tiny image on the page
      page.drawImage(img, { x: 300, y: 80, width: 48, height: 48 });
      page.setDPart(record.asDict());
    }

    pdfDoc.setDPartRoot(droot);

    pdfDoc.setPDFVTXMP('1.0', 'PDF/VT-1');

    const iccBytes = new Uint8Array([0, 1, 2, 3, 4, 5]);
    pdfDoc.attachOutputIntent(iccBytes, {
      OutputConditionIdentifier: 'TestICC',
      Info: 'Dummy ICC Profile for PDF/VT example',
    });

    await pdfDoc.ensureResourcesForPrint();

    const bytes = await pdfDoc.save();
    const path = `${os.tmpdir()}${sep}pdfvt-sample-${Date.now()}.pdf`;
    fs.writeFileSync(path, Buffer.from(bytes));
    console.log(`Wrote PDF to: ${path}`);
  } catch (err) {
    console.error('Error generating PDF/VT sample:', err);
    process.exit(1);
  }
})();
