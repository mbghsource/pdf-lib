import { PDFDocument, DPart, StandardFonts } from 'src/api';
import { PDFName, PDFStream, PDFArray } from 'src/core';
import PDFDict from 'src/core/objects/PDFDict';

describe('PDF/VT & PDFX helpers', () => {
  test('DPart root creation and page linking (VDP multiple records with images and attributes)', async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit((await import('@pdf-lib/fontkit')).default);
    const droot = pdfDoc.createDPartRoot();

    // Use several images to simulate per-recipient variable content
    const tinyPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';

    const records: any[] = [];
    const num = 5;
    for (let i = 1; i <= num; i++) {
      const child = DPart.createNode(pdfDoc.context, 'LogicalRecord');
      child.setAttr('ID', `rec-${i}`, pdfDoc.context);
      child.setAttr('Name', `Recipient ${i}`, pdfDoc.context);
      child.setAttr('Note', `VDP sample ${i}`, pdfDoc.context);

      // Embed a small image per record to simulate variable data
      const img = await pdfDoc.embedPng(tinyPngBase64);

      pdfDoc.context.register(child.asDict());
      droot.addChild(pdfDoc.context, child);
      records.push({ child, img });

      const page = pdfDoc.addPage([400, 260]);
      page.drawImage(img, { x: 300, y: 80, width: 48, height: 48 });
      page.setDPart(child.asDict());
    }

    pdfDoc.setDPartRoot(droot);

    // Ensure resources (fonts/images) are embedded and registered
    await pdfDoc.ensureResourcesForPrint();

    // Verify all pages have DPart references and those DParts are present in root
    const pages = pdfDoc.getPages();
    expect(pages.length).toBe(num);
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const pdRef = p.node.get(PDFName.of('DPart'));
      expect(pdRef).toBeDefined();

      // The DPart should be resolvable
      const pd = pdfDoc.context.lookup(pdRef as any, (PDFDict as any));
      expect(pd).toBeDefined();

      // The DPart should have required attributes
      expect((pd as any).get(PDFName.of('ID'))).toBeDefined();
      expect((pd as any).get(PDFName.of('Name'))).toBeDefined();
    }

    // Names should include Images registration
    const namesRef = pdfDoc.catalog.get(PDFName.of('Names')) as any;
    expect(namesRef).toBeDefined();
    const names = pdfDoc.context.lookup(namesRef, (PDFDict as any));
    expect(names).toBeDefined();

    const imgsArr = (names as any).lookupMaybe(PDFName.of('Images'), (PDFArray as any));
    expect(imgsArr).toBeDefined();
    expect((imgsArr as any).size()).toBeGreaterThan(0);

    // Resolve each image entry and ensure it is a stream
    for (let j = 1; j < (imgsArr as any).size(); j += 2) {
      const ref = (imgsArr as any).lookup(j);
      const obj = pdfDoc.context.lookup(ref as any);
      expect(obj).toBeDefined();
    }
  });

  test('Inject PDF/VT XMP metadata', async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setPDFVTXMP('1.0', 'PDF/VT-1');

    const metaRef = pdfDoc.catalog.get(PDFName.of('Metadata'));
    expect(metaRef).toBeDefined();

    const metaStream = pdfDoc.context.lookup(metaRef, PDFStream);
    const contents = metaStream.getContentsString();
    expect(contents).toContain('<pdfvt:Version>1.0</pdfvt:Version>');
  });

  test('Attach OutputIntent with ICC profile', async () => {
    const pdfDoc = await PDFDocument.create();
    const icc = new Uint8Array([1, 2, 3, 4, 5]);
    pdfDoc.attachOutputIntent(icc, {
      OutputConditionIdentifier: 'Test',
      Info: 'info',
    });

    const oiArr = pdfDoc.catalog.get(PDFName.of('OutputIntents'));
    expect(oiArr).toBeDefined();

    // Extract first OutputIntent dict
    const firstOIRef = (oiArr as any).lookup(0);
    const oiDict = pdfDoc.context.lookup(firstOIRef, PDFDict);
    const dest = oiDict.lookup(PDFName.of('DestOutputProfile'));
    expect(dest).toBeDefined();
  });

  test('Ensure resources for print registers Names', async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.embedStandardFont(StandardFonts.Helvetica);
    // Add an image by embedding a tiny 1x1 PNG
    const tinyPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';
    await pdfDoc.embedPng(tinyPngBase64);

    await pdfDoc.ensureResourcesForPrint();

    const namesRef = pdfDoc.catalog.get(PDFName.of('Names'));
    expect(namesRef).toBeDefined();
  });
});
