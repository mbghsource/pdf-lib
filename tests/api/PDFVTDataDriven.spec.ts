import { PDFDocument, DPart } from 'src/api';
import { PDFName } from 'src/core';
import fs from 'fs';
import { sep } from 'path';

describe('PDF/VT data-driven VDP sample', () => {
  test('generates pages and registers images per data set', async () => {
    const pdfDoc = await PDFDocument.create();

    const assetsDir = `${__dirname}${sep}..${sep}..${sep}assets${sep}`;
    const dataPath = `${assetsDir}vdp${sep}vdp-data.json`;
    const raw = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(raw) as any[];

    const droot = pdfDoc.createDPartRoot();
    for (let i = 0; i < data.length; i++) {
      const rec = data[i];
      const record = DPart.createNode(pdfDoc.context, 'LogicalRecord');
      record.setAttr('ID', rec.id, pdfDoc.context);
      if (rec.name) record.setAttr('Name', rec.name, pdfDoc.context);
      if (rec.note) record.setAttr('Note', rec.note, pdfDoc.context);

      pdfDoc.context.register(record.asDict());
      droot.addChild(pdfDoc.context, record);

      const page = pdfDoc.addPage([400, 260]);
      if (rec.image) {
        const imgPath = `${assetsDir}images${sep}${rec.image}`;
        const b = fs.readFileSync(imgPath);
        if (rec.image.toLowerCase().endsWith('.png')) await pdfDoc.embedPng(b);
        else await pdfDoc.embedJpg(b);
      }
      page.setDPart(record.asDict());
    }

    pdfDoc.setDPartRoot(droot);

    // Ensure resources are embedded & Names populated
    await pdfDoc.ensureResourcesForPrint();

    const pages = pdfDoc.getPages();
    expect(pages.length).toBe(data.length);

    // Check that each DPart in the root has required attributes
    const root = pdfDoc.catalog.getDPart();
    const k = root!.lookup(PDFName.of('K')) as any;
    expect(k.size()).toBe(data.length);
    for (let i = 0; i < k.size(); i++) {
      const e = k.lookup(i) as any;
      const dict = e instanceof Object ? (e as any) : pdfDoc.context.lookup(e);
      expect((dict as any).get(PDFName.of('ID'))).toBeDefined();
      expect((dict as any).get(PDFName.of('Name'))).toBeDefined();
    }

    // Names/Images mapping must exist and contain at least the images used
    const namesRef = pdfDoc.catalog.get(PDFName.of('Names')) as any;
    expect(namesRef).toBeDefined();
    const names = pdfDoc.context.lookup(namesRef, (Object as any));
    const imgsArr = (names as any).lookupMaybe(PDFName.of('Images'), (Object as any));
    expect(imgsArr).toBeDefined();
    expect((imgsArr as any).size()).toBeGreaterThan(0);
  });
});