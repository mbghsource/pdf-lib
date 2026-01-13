# Node App Tests

This app provides an interactive runner that executes a series of example scripts which create and write PDF files to your system temporary directory.

## Running the examples

1. Install dependencies and build the repo (from the root):

```bash
yarn
yarn build
```

2. Run the node app from the `apps/node` folder:

```bash
cd apps/node
node build/index.js
```

3. The runner will prompt you to press <enter> to run each test and will write an output PDF to your OS temporary directory.

### PDF/VT sample (Test #19)

The new PDF/VT sample demonstrates creating a DPart root and logical record, linking the record to a page, injecting PDF/VT-style XMP metadata, attaching an OutputIntent (ICC profile), embedding fonts, and ensuring resources are registered for print validations.

- To run the PDF/VT example, at the prompt press <enter> until you reach test 19 (it appears at the end of the list), or run the runner with the test index:

```bash
# run only the PDF/VT test
node build/index.js 19
```

The test will write a PDF file to your temporary directory and (on macOS/Windows) attempt to open it automatically.