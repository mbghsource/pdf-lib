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
    // Create a larger VDP sample: multiple logical records with varying images
    const recordsCount = 12;

    // Prefer a data-driven file if present
    const dataPath = `${assetsDir}vdp${sep}vdp-data.json`;
    let data: any[] | undefined;
    if (fs.existsSync(dataPath)) {
      try {
        const raw = fs.readFileSync(dataPath, 'utf8');
        data = JSON.parse(raw) as any[];
        console.log(`Using VDP data from ${dataPath} (${data.length} records)`);
      } catch (e) {
        console.warn('Failed to parse VDP data JSON, falling back to default images', e);
      }
    }

    if (data && data.length > 0) {
      for (let i = 0; i < data.length; i++) {
        const rec = data[i];
        const id = rec.id || `rec-${i + 1}`;
        const record = DPart.createNode(pdfDoc.context, 'LogicalRecord');
        record.setAttr('ID', id, pdfDoc.context);
        if (rec.name) record.setAttr('Name', rec.name, pdfDoc.context);
        if (rec.note) record.setAttr('Note', rec.note, pdfDoc.context);

        pdfDoc.context.register(record.asDict());
        droot.addChild(pdfDoc.context, record);

        const page = pdfDoc.addPage([400, 260]);
        page.setFont(font);
        page.drawText(`PDF/VT VDP Sample — ${id}`, { x: 50, y: 180, size: 14 });
        if (rec.name) page.drawText(`Recipient: ${rec.name}`, { x: 50, y: 160, size: 10 });
        if (rec.note) page.drawText(`${rec.note}`, { x: 50, y: 144, size: 10 });

        if (rec.image) {
          const imgPath = `${assetsDir}images${sep}${rec.image}`;
          if (fs.existsSync(imgPath)) {
            const b = fs.readFileSync(imgPath);
            if (rec.image.toLowerCase().endsWith('.png')) {
              const embeddedImg = await pdfDoc.embedPng(b);
              page.drawImage(embeddedImg, { x: 300, y: 80, width: 64, height: 64 });
            } else {
              const embeddedImg = await pdfDoc.embedJpg(b);
              page.drawImage(embeddedImg, { x: 300, y: 80, width: 64, height: 64 });
            }
          } else {
            console.warn(`Image ${imgPath} not found for record ${id}`);
          }
        }

        page.setDPart(record.asDict());
      }
    } else {
      // Fallback: use rotating images bundled in assets
      const imageFiles = [
        'small_mario.png',
        'minions_laughing.jpg',
        'cat_riding_unicorn.jpg',
        'minions_banana_no_alpha.png',
        'greyscale_bird.png',
        'self_drive.png',
      ];

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

        // Pick an image file per record and embed appropriately
        const imgFile = imageFiles[(i - 1) % imageFiles.length];
        const imgPath = `${assetsDir}images${sep}${imgFile}`;
        let embeddedImg: any;
        if (imgFile.toLowerCase().endsWith('.png')) {
          const b = fs.readFileSync(imgPath);
          embeddedImg = await pdfDoc.embedPng(b);
        } else if (imgFile.toLowerCase().endsWith('.jpg') || imgFile.toLowerCase().endsWith('.jpeg')) {
          const b = fs.readFileSync(imgPath);
          embeddedImg = await pdfDoc.embedJpg(b);
        }

        if (embeddedImg) page.drawImage(embeddedImg, { x: 300, y: 80, width: 64, height: 64 });

        page.setDPart(record.asDict());
      }
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
