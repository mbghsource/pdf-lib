import { PDFDocument, DPart, StandardFonts } from 'src/api';
import { PDFName, PDFStream } from 'src/core';
import PDFDict from 'src/core/objects/PDFDict';

describe('PDF/VT & PDFX helpers', () => {
  test('DPart root creation and page linking', async () => {
    const pdfDoc = await PDFDocument.create();
    const droot = pdfDoc.createDPartRoot();
    const child = DPart.createNode(pdfDoc.context, 'LogicalRecord');
    child.setAttr('ID', 'rec-1', pdfDoc.context);
    droot.addChild(pdfDoc.context, child);
    pdfDoc.setDPartRoot(droot);

    const page = pdfDoc.addPage();
    page.setDPart(child.asDict());

    const pageDPart = page.node.get(PDFName.of('DPart'));
    expect(pageDPart).toBeDefined();
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
