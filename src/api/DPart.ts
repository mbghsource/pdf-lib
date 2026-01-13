import PDFDict from 'src/core/objects/PDFDict';
import PDFName from 'src/core/objects/PDFName';
import PDFArray from 'src/core/objects/PDFArray';
import PDFContext from 'src/core/PDFContext';

/**
 * Lightweight builder for DPart structures (ISO 16612-2 / PDF/VT).
 * This provides a minimal, programmatic way to build a DPartRoot and
 * simple child nodes that can be attached to the Document Catalog.
 */
export default class DPart {
  readonly dict: PDFDict;

  static createRoot = (context: PDFContext): DPart => {
    const dict = context.obj({ Type: 'DPartRoot', K: [] });
    return new DPart(dict);
  };

  static createNode = (context: PDFContext, role?: string): DPart => {
    const dict = context.obj({ Type: 'DPart', Role: role ?? undefined, K: [] });
    return new DPart(dict);
  };

  constructor(dict: PDFDict) {
    this.dict = dict;
  }

  /** Append a child DPart node to this node's K array */
  addChild(context: PDFContext, child: DPart) {
    const K =
      (this.dict.lookup(PDFName.of('K')) as PDFArray) || context.obj([]);
    K.push(child.dict);
    this.dict.set(PDFName.of('K'), K);
  }

  /** Set an attribute (e.g. ID, Role, etc.) */
  setAttr(name: string, value: any, context?: PDFContext) {
    const val = context ? context.obj(value) : value;
    this.dict.set(PDFName.of(name), val);
  }

  /** Return the low-level PDFDict for registration */
  asDict(): PDFDict {
    return this.dict;
  }
}
