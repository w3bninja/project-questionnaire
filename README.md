# Project Questionnaire

A stepped discovery questionnaire for starting digital projects. Pick the project
types that apply (Website, Mobile, Software, Branding, Print, SEO — mix and match),
optionally narrow by stage (pre-/post-sales) and audience (internal/public), and
the app assembles the matching questions into one step per category.

- **Questions** — answer in place; answers autosave to the browser.
- **Review** — copy as Markdown (blank or with answers), download JSON, or print to PDF.
- **Builder** — add, edit, tag, reorder, or delete questions. Edits persist locally and
  can be exported/imported as JSON; "Reset to seed" restores `questions.js`.

Static site, no build step. Open `index.html` or serve the folder.

The seed question bank in `questions.js` was exported from the planning spreadsheet;
each question carries `category` (the step), `groups` (project types), `types`
(audience), and `stages`. Companion to the [UX Field Guide](https://github.com/w3bninja/ux-matter).
