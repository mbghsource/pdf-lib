# PDF/VT (ISO 16612-2) & Output Intent / PDF/X helpers

This document describes the utilities added to support ISO 16612-2 (PDF/VT-1) logical records (DPart), XMP metadata for PDF/VT, and embedding OutputIntents (ICC Profiles) typically required for PDF/X workflows.

## DPart (Logical Records)

The `DPart` API provides a small programmatic builder for Document Parts (DPartRoot and nodes).

Example:

```js
import { PDFDocument, DPart } from 'pdf-lib'

const pdfDoc = await PDFDocument.create()

// Create DPartRoot and a child logical record
const droot = pdfDoc.createDPartRoot()
const rec = DPart.createNode(pdfDoc.context, 'LogicalRecord')
rec.setAttr('ID', 'rec-1', pdfDoc.context)
droot.addChild(pdfDoc.context, rec)

// Attach to the Catalog
pdfDoc.setDPartRoot(droot)

// Link a page to the logical record
const page = pdfDoc.addPage()
page.setDPart(rec.asDict())
```

Use `page.getDPart()` to read back the DPart dictionary referenced by a page.

## XMP: PDF/VT metadata injection

A helper `pdfDoc.setPDFVTXMP(version?, conformance?)` will inject a minimal XMP packet that includes the `GTS_PDFVT` namespace and versioning information:

```js
pdfDoc.setPDFVTXMP('1.0', 'PDF/VT-1')
```

This adds a Metadata stream in the Catalog containing the RDF description for consumers that expect a PDF/VT XMP packet.

## OutputIntent / ICC Profiles

To embed an ICC profile and register it as an OutputIntent (used for PDF/X and professional print workflows):

```js
const iccBytes = /* Uint8Array bytes of an ICC profile */
pdfDoc.attachOutputIntent(iccBytes, { OutputConditionIdentifier: 'ISOcoated', Info: 'ISO Coated v2', RegistryName: 'http://www.color.org', S: 'GTS_PDFX' })
```

This registers the OutputIntent in `Catalog.OutputIntents`.

## Resource Management for Print

Call `await pdfDoc.ensureResourcesForPrint()` to embed any fonts/images added via `embedFont` / `embedPng` / `embedJpg` and create a simple `Names` dictionary with `Fonts` and `Images` arrays to aid downstream validators.

---

If you need richer semantic mapping for DParts, or validators for full PDF/X or PDF/VT conformance checks, we can add stricter helpers and validators in a follow-up PR.