---
name: addValidationAndCIChecks
description: Add comprehensive validation and CI checks for a feature and its sample artifacts.
argument-hint: <feature-branch>, <sample-generation-script>, <validation-script>, <ci-workflow-file>
---

Goal

Add or extend a validation script and CI workflow to run stricter structural checks for a newly added feature that produces an artifact (e.g., a sample file), ensuring the CI fails when the artifact or structure is invalid.

Instructions

- Identify the artifact generation step and the script that creates it (placeholder: `{{sampleGenerationScript}}`).
- Implement or enhance a validation script (placeholder: `{{validationScript}}`) to perform thorough checks, including:
  - Catalog-level presence and semantics for the new feature (e.g., top-level dictionary and expected keys).
  - Presence and correctness of auxiliary resources (e.g., OutputIntents, metadata, XMP properties).
  - Page-level or per-object cross-references linking back to the feature's root structure.
  - Resource registration checks (e.g., Names dictionary entries for Fonts/Images) and embedded resource verification (font files, image XObjects).
  - Optional: structural checks using system tools (e.g., `qpdf --check`) or domain-specific validators.
- Make the validator:
  - Produce clear, actionable error messages for each failure case.
  - Return a non-zero exit code on failure.
  - Be tolerant where acceptable (e.g., warn about inline objects vs. fail) but strict for required conformance points.
- Update the CI workflow (placeholder: `{{ciWorkflowFile}}`) to:
  - Install any required tooling (e.g., `ts-node`, `tsconfig-paths`, `qpdf`).
  - Run the sample generation step and capture the produced artifact path (e.g., `SAMPLE=/tmp/...`).
  - Run structural checks (e.g., `qpdf --check`) if available and then run the enhanced validator.
  - Upload the artifact as a job artifact for later inspection.
- Run the generator and validator locally before pushing changes, iterate until the validator passes for the authoritative sample.
- Commit and push the changes to the feature branch and observe CI to ensure workflow runs as expected.

Notes & Placeholders

- Replace `{{sampleGenerationScript}}` with the actual sample generation script path.
- Replace `{{validationScript}}` with the validation script path.
- Replace `{{ciWorkflowFile}}` with the CI workflow file to be updated.
- For domain-specific checks, add parsers or libraries appropriate to the artifact format.
- Prefer clear console logging and non-zero exit codes to fail CI reliably.

Example Usage

- After implementation, run:
  - `node {{validationScript}} /path/to/generated/artifact` (or `npx ts-node -r tsconfig-paths/register {{validationScript}} /path/to/artifact`) to verify locally.
  - Commit and push; confirm CI executes `{{ciWorkflowFile}}` and reports success or failure.
