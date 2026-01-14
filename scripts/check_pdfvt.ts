import fs from 'fs';
import { PDFDocument } from 'src/api';
import { PDFName, PDFStream, PDFDict, PDFArray, PDFRef } from 'src/core';

async function check(pdfPath: string) {
  const errors: string[] = [];
  const bytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(bytes, { updateMetadata: false });

  const catalog = pdfDoc.catalog;

  // --- DPartRoot checks ---
  const dpartRoot = catalog.getDPart();
  if (!dpartRoot) {
    errors.push('Catalog missing /DPart (DPartRoot)');
  } else {
    const type = dpartRoot.get(PDFName.of('Type'));
    if (!type || !type.toString().includes('DPartRoot')) {
      errors.push('DPart root has wrong or missing Type (expected DPartRoot)');
    }

    const kArray = dpartRoot.lookupMaybe(PDFName.of('K'), PDFArray as any);
    if (!kArray) {
      errors.push('DPartRoot missing K array');
    } else if (kArray.size() === 0) {
      errors.push('DPartRoot K array is empty (expect at least one logical record)');
    } else {
        // Defer page-count validation until pages are defined (checked later)
      for (let i = 0; i < kArray.size(); i++) {
        const entry = kArray.lookup(i) as any;
        // Expect indirect ref or dict
        let childDict: PDFDict | undefined;
        if (entry instanceof PDFRef) {
          const looked = pdfDoc.context.lookup(entry);
          if (looked instanceof PDFDict) childDict = looked;
        } else if (entry instanceof PDFDict) {
          childDict = entry as PDFDict;
        }

        if (!childDict) {
          errors.push(`DPartRoot K[${i}] is not a dictionary or reference`);
          continue;
        }

        const cType = childDict.get(PDFName.of('Type'));
        if (!cType || !cType.toString().includes('DPart')) {
          errors.push(`DPart child K[${i}] missing Type 'DPart'`);
        }

        // Check for ID and Name attributes used in VDP
        const idAttr = childDict.get(PDFName.of('ID'));
        if (!idAttr) {
          errors.push(`DPart child K[${i}] missing required attribute 'ID'`);
        }
        const nameAttr = childDict.get(PDFName.of('Name'));
        if (!nameAttr) {
          errors.push(`DPart child K[${i}] missing required attribute 'Name'`);
        }
      }
    }
  }

  // --- OutputIntent checks ---
  const oiArray = catalog.OutputIntents();
  if (!oiArray) {
    errors.push('Catalog missing /OutputIntents');
  } else if (oiArray.size() === 0) {
    errors.push('/OutputIntents array is empty');
  } else {
    // Check first OutputIntent dict
    const firstOiRef = oiArray.lookup(0) as any;
    const oiDict = firstOiRef instanceof PDFRef ? pdfDoc.context.lookup(firstOiRef, PDFDict as any) : firstOiRef;
    if (!oiDict || !(oiDict instanceof PDFDict)) {
      errors.push('First OutputIntent entry is not a dict');
    } else {
      const s = oiDict.get(PDFName.of('S'));
      if (!s || !s.toString().includes('GTS_PDFX')) {
        errors.push('OutputIntent S is not GTS_PDFX');
      }

      const dest = oiDict.get(PDFName.of('DestOutputProfile'));
      if (!dest) {
        errors.push('OutputIntent missing DestOutputProfile');
      } else {
        const destStream = dest instanceof PDFRef ? pdfDoc.context.lookup(dest, PDFStream as any) : dest;
        if (!destStream || !(destStream instanceof PDFStream)) {
          errors.push('DestOutputProfile does not resolve to a PDF stream');
        } else {
          const raw = destStream.getContentsString();
          if (!raw || raw.length === 0) errors.push('ICC DestOutputProfile stream is empty');
        }
      }
    }
  }

  // --- Metadata XMP checks ---
  const metaRef = catalog.get(PDFName.of('Metadata')) as PDFRef | undefined;
  if (!metaRef) {
    errors.push('Catalog missing /Metadata');
  } else {
    const metaStream = pdfDoc.context.lookup(metaRef, PDFStream as any);
    if (!metaStream || !(metaStream instanceof PDFStream)) {
      errors.push('Metadata entry does not point to a stream');
    } else {
      const contents = metaStream.getContentsString();
      if (!contents.includes('<pdfvt:Conformance>PDF/VT-1</pdfvt:Conformance>')) {
        errors.push('XMP metadata missing pdfvt:Conformance PDF/VT-1');
      }
      if (!contents.includes('<pdfvt:Version>1.0</pdfvt:Version>')) {
        errors.push('XMP metadata missing pdfvt:Version 1.0');
      }
    }
  }

  // --- Page-level DPart linking ---
  const pages = pdfDoc.getPages();
  if (!pages || pages.length === 0) {
    errors.push('Document contains no pages');
  } else {
    // Build a set of known DPart refs from the DPartRoot K array
    const knownRefs = new Set<string>();
    if (dpartRoot) {
      const kArray = dpartRoot.lookupMaybe(PDFName.of('K'), PDFArray as any);
      if (kArray) {
        for (let i = 0; i < kArray.size(); i++) {
          const entry = kArray.lookup(i) as any;
          if (entry instanceof PDFRef) knownRefs.add(entry.toString());
          else if (entry instanceof PDFDict) {
            const ref = pdfDoc.context.getObjectRef(entry);
            if (ref) knownRefs.add(ref.toString());
          }
        }
      }
    }

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      // Safely read the /DPart entry regardless of whether it's a ref or dict
      const raw = page.node.get(PDFName.of('DPart')) as any;
      if (!raw) {
        errors.push(`Page ${i} missing /DPart reference`);
        continue;
      }

      if (raw instanceof PDFRef) {
        const pd = pdfDoc.context.lookup(raw, PDFDict as any);
        if (!pd) {
          errors.push(`Page ${i} DPart ref does not resolve to a dict`);
          continue;
        }
        if (knownRefs.size > 0 && !knownRefs.has(raw.toString())) {
          errors.push(`Page ${i} DPart does not appear in DPartRoot K array`);
        }
      } else if (raw instanceof PDFDict) {
        // Inline DPart dictionary (not indirect). This is less ideal; warn but don't fail.
        console.warn(`Page ${i} has an inline /DPart dictionary (not an indirect reference).`);
      } else {
        errors.push(`Page ${i} has an unexpected /DPart entry type`);
      }
    }
  }

  // --- Names / Fonts / Images checks ---
  const namesRef = catalog.get(PDFName.of('Names')) as PDFRef | undefined;
  if (!namesRef) {
    console.warn('Catalog has no /Names mapping (Fonts/Images registration was not run)');
  } else {
    const names = pdfDoc.context.lookup(namesRef);
    if (!names || !(names instanceof PDFDict)) {
      errors.push('Names entry does not resolve to a dict');
    } else {
      const namesDict = names as PDFDict;

      // Fonts (only validate if present)
      const fontsArr = namesDict.lookupMaybe(PDFName.of('Fonts'), PDFArray as any);
      if (fontsArr) {
        if (fontsArr.size() % 2 !== 0) {
          errors.push('Names/Fonts array must be name/ref pairs');
        } else {
          // verify each font ref resolves and has a FontDescriptor with embedded file
          for (let i = 0; i < fontsArr.size(); i += 2) {
            const fontRef = fontsArr.lookup(i + 1) as any;
            const fontDictCandidate = fontRef instanceof PDFRef ? pdfDoc.context.lookup(fontRef) : fontRef;
            if (!fontDictCandidate || !(fontDictCandidate instanceof PDFDict)) {
              errors.push(`Names/Fonts entry ${i / 2} does not resolve to a Font dict`);
              continue;
            }
            const fontDict = fontDictCandidate as PDFDict;
            // Handle Type0 (CID) fonts which contain DescendantFonts with a CIDFont that carries the FontDescriptor
            const subtype = fontDict.get(PDFName.of('Subtype'));
            if (subtype && subtype.toString().includes('Type0')) {
              const descArr = fontDict.lookupMaybe(PDFName.of('DescendantFonts'), PDFArray as any);
              if (!descArr || descArr.size() === 0) {
                errors.push(`Type0 font at Names/Fonts[${i / 2}] missing DescendantFonts`);
                continue;
              }
              const df = descArr.lookup(0) as any;
              const cidFont = df instanceof PDFRef ? pdfDoc.context.lookup(df, PDFDict as any) : df;
              if (!cidFont || !(cidFont instanceof PDFDict)) {
                errors.push(`Type0 font at Names/Fonts[${i / 2}] descendant font does not resolve`);
                continue;
              }
              const fdCandidate = cidFont.lookupMaybe(PDFName.of('FontDescriptor'), PDFDict as any);
              if (!fdCandidate || !(fdCandidate instanceof PDFDict)) {
                console.error(`Type0 font at Names/Fonts[${i / 2}] descendant missing FontDescriptor. Descendant dict: ${cidFont.toString()}`);
                errors.push(`Type0 font at Names/Fonts[${i / 2}] descendant missing FontDescriptor`);
                continue;
              }
              const fd = fdCandidate as PDFDict;
              const hasFontFile = (fd as any).get(PDFName.of('FontFile')) || (fd as any).get(PDFName.of('FontFile2')) || (fd as any).get(PDFName.of('FontFile3'));
              if (!hasFontFile) {
                errors.push(`Type0 font at Names/Fonts[${i / 2}] descendant does not contain an embedded font file`);
              }
            } else {
              const fdCandidate = fontDict.lookupMaybe(PDFName.of('FontDescriptor'), PDFDict as any);
              if (!fdCandidate || !(fdCandidate instanceof PDFDict)) {
                console.error(`Font at Names/Fonts[${i / 2}] missing FontDescriptor. Font dict: ${fontDict.toString()}`);
                errors.push(`Font at Names/Fonts[${i / 2}] missing FontDescriptor`);
                continue;
              }
              const fd = fdCandidate as PDFDict;
              const hasFontFile = (fd as any).get(PDFName.of('FontFile')) || (fd as any).get(PDFName.of('FontFile2')) || (fd as any).get(PDFName.of('FontFile3'));
              if (!hasFontFile) {
                errors.push(`Font at Names/Fonts[${i / 2}] does not contain an embedded font file (FontFile/2/3)`);
              }
            }
          }
        }
      }

      // Images (only validate if present)
      const imgsArr = namesDict.lookupMaybe(PDFName.of('Images'), PDFArray as any);
      if (!imgsArr || imgsArr.size() === 0) {
        errors.push('Names must contain an /Images array with at least one registered image for VDP samples');
      } else if (imgsArr.size() % 2 !== 0) {
        errors.push('Names/Images array must be name/ref pairs');
      } else {
        for (let i = 0; i < imgsArr.size(); i += 2) {
          const imgRef = imgsArr.lookup(i + 1) as any;
          const imgObj = imgRef instanceof PDFRef ? pdfDoc.context.lookup(imgRef) : imgRef;
          if (!imgObj) {
            errors.push(`Names/Images entry ${i / 2} does not resolve`);
            continue;
          }
          // Expect a stream (XObject Image)
          if (!(imgObj instanceof PDFStream)) {
            errors.push(`Names/Images entry ${i / 2} is not a stream/XObject Image`);
          }
        }
      }
    }
  }

  // Summarize results
  if (errors.length > 0) {
    console.error('\nPDF/VT validation FAILED with the following errors:');
    for (const e of errors) console.error(' -', e);
    return 2;
  }

  console.log('PDF/VT validation checks passed ✅');
  return 0;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/check_pdfvt.ts <path-to-pdf>');
    process.exit(2);
  }
  const pdfPath = args[0];
  check(pdfPath)
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error('Error checking PDF:', err);
      process.exit(2);
    });
}

export default check;
