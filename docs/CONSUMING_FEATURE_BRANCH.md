# Consuming this feature branch (feat/pdfvt-dpart-outputintent)

This guide describes safe ways to consume the built output or source of this feature branch from downstream projects (for example, your pdfme project), including pros/cons and exact commands.

> Note: The branch name is `feat/pdfvt-dpart-outputintent` and it is pushed to your fork (origin). If you'd like me to add a `prepare` script to auto-build on `npm/yarn install` from Git, say so and I can add it to the branch.

---

## 1) Build & pack locally (recommended for full-stack testing)

Why: Produces the exact built artifacts that would be published to npm. Great for testing production-like outputs.

Commands (in this repo):

```bash
# install dev deps
yarn

# build the distribution files
yarn build

# create a tarball (e.g. pdf-lib-1.17.1.tgz)
yarn pack
```

Then in your downstream project (pdfme):

```bash
# install the tarball (path is the absolute or relative path to the generated tgz)
cd /path/to/pdfme
yarn add /path/to/pdf-lib-1.17.1.tgz
# or with npm
# npm i /path/to/pdf-lib-1.17.1.tgz
```

Pros:
- Downstream sees the actual built files.
- No changes to this repo required.

Cons:
- Manual step to generate the tarball for each iteration.

---

## 2) Install direct from your fork branch (convenient)

Why: Quick and convenient. Useful for one-off installs or CI that installs directly from a branch.

Commands:

```bash
# install from GitHub using yarn
cd /path/to/pdfme
yarn add mbghsource/pdf-lib#feat/pdfvt-dpart-outputintent

# or with npm
npm i github:mbghsource/pdf-lib#feat/pdfvt-dpart-outputintent
```

Important caveat: Git installs do not automatically build the distribution unless the package has a `prepare` (or `prepack`) script that runs the build. If you want to use this workflow, we can add a `prepare` script such as:

```json
// package.json (suggestion)
"scripts": {
  "prepare": "yarn build"
}
```

If you want, I can add the `prepare` script (and optionally a prerelease version bump) to the branch so `yarn add <repo>#<branch>` creates the built files on install.

Pros:
- Simple one-line install from GitHub.

Cons:
- Without `prepare` the installed package will be the repository source (not built), which may require additional build steps in the consumer.

---

## 3) Local linking (best for fast iteration)

Why: Develop and test both projects at once with live edits.

Commands:

```bash
# In pdf-lib repo
yarn && yarn build
yarn link

# In pdfme repo
yarn link "pdf-lib"
```

To undo the link:

```bash
# In pdfme repo
yarn unlink "pdf-lib"

# In pdf-lib repo
yarn unlink
```

Pros:
- Fast iteration, immediate feedback.

Cons:
- Works locally only; CI or other collaborators won't see the linked package.

---

## 4) Publish to a private npm registry (optional)

Why: Useful if you want a reproducible package available to multiple machines/CI without using git tarballs.

Steps:
- Bump to a prerelease version (e.g., `1.17.1-pdfvt.0`) in `package.json`.
- `yarn pack` or `npm publish --tag next --registry <private-registry>`.

Pros:
- Clean install semantics (via normal package manager).

Cons:
- Requires access to a registry and extra publication step.

---

## Recommendations

- For the **most accurate** testing (mirrors published package), use **Build & pack locally** (option 1).
- For **fast iteration** while developing, use **link** (option 3).
- If you want to `yarn add` the branch from GitHub, I can add a `prepare` script to this feature branch now so installs from Git will automatically build (option 2 with the `prepare` script). Would you like me to add the `prepare` script and push it to the feature branch?

---

If you'd like, I can also:
- Add a small example to `apps/node` that demonstrates generating a PDF/VT sample with `setDPart` + `attachOutputIntent`.
- Add `prepare` and bump the package `version` to a prerelease.

Tell me which follow-up you prefer and I'll implement it on the feature branch.