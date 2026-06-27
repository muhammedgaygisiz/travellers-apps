---
name: pull-github-epics-to-ssot
description: Pull GitHub issues whose titles start with "epic:" into the repo SSOT Logseq graph. Use when the user asks to refresh, generate, update, or maintain the Epics page in /Users/mo/DEV/travellers-apps from GitHub issues, especially for ssot/pages/Epics.md or GitHub epic issue indexing.
---

# Pull GitHub Epics To SSOT

Use this skill in `/Users/mo/DEV/travellers-apps` to refresh the Logseq page at `ssot/pages/Epics.md` from GitHub issues in `muhammedgaygisiz/travellers-apps` whose titles start with `epic:`.

## Workflow

1. Inspect `git status --short --branch`.
2. Prefer the GitHub connector issue search:
   - repository: `muhammedgaygisiz/travellers-apps`
   - query: `is:issue epic: in:title`
   - sort: `created`
   - order: `asc`
   - topn: at least `100`
3. Render the result into `ssot/pages/Epics.md` as a flat Logseq list:
   - one root bullet per epic
   - Markdown link text is the GitHub issue title
   - link target is the issue URL
   - suffix is `(Issue \#123)` with `#` escaped so Logseq does not create issue-number pages
   - do not use Logseq properties such as `date::`, `github-issue::`, or `status::`
4. Ensure `ssot/pages/contents.md` contains exactly one `- [[Epics]]` entry and no dangling empty bullet.
5. Remove `ssot/logseq/bak` if Logseq recreated backup pages during the refresh.
6. Run `git diff --check`.

## Script

Use `scripts/render_epics_page.mjs` when possible. It can either:

- call GitHub through `gh issue list`, which may require network approval:

```bash
node .codex/skills/pull-github-epics-to-ssot/scripts/render_epics_page.mjs
```

- render connector/search JSON from a file or stdin:

```bash
node .codex/skills/pull-github-epics-to-ssot/scripts/render_epics_page.mjs --input /tmp/issues.json
```

The input JSON may be either an array of issue objects or an object with an `issues` array. Recognized issue fields are `title`, `url`, `display_url`, `html_url`, `number`, and `issue_number`.

## Output Contract

`ssot/pages/Epics.md` should look like:

```markdown
- [epic: Example title](https://github.com/muhammedgaygisiz/travellers-apps/issues/123) (Issue \#123)
```

Keep it flat. Avoid tags, namespaces, properties, and unescaped `#` characters because they pollute Logseq graph view.
