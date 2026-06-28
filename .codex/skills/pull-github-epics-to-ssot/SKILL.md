---
name: pull-github-epics-to-ssot
description: Pull GitHub issues whose titles start with "epic:" into the repo SSOT Logseq graph. Use when the user asks to refresh, generate, update, or maintain the Epics section in /Users/mo/DEV/travellers-apps from GitHub issues, especially for SSOT epic indexing.
---

# Pull GitHub Epics To SSOT

Use this skill in `/Users/mo/DEV/travellers-apps` to refresh the Logseq epic section in `ssot/pages/SSOT.md` and one detail page per epic from GitHub issues in `muhammedgaygisiz/travellers-apps` whose titles start with `epic:`.

## Workflow

1. Inspect `git status --short --branch`.
2. Prefer the GitHub connector issue search:
   - repository: `muhammedgaygisiz/travellers-apps`
   - query: `is:issue epic: in:title`
   - sort: `created`
   - order: `asc`
   - topn: at least `100`
3. Render the `Epics` section in `ssot/pages/SSOT.md` and `ssot/pages/contents.md`:
   - `Epics` is a plain bullet, not `[[Epics]]`
   - one nested bullet per epic
   - each nested bullet links to `[[epic-<issue-number>]]`
   - do not create `ssot/pages/Epics.md`
4. Render each epic page as `ssot/pages/epic-<issue-number>.md`:
   - first bullet links to the GitHub epic issue
   - `Description` contains the GitHub issue body as nested bullets
   - `Related issues` contains local links to sub-issue pages
   - if there is no description, write `No description provided.`
   - if no related issues are found, write `No linked issues found.`
5. Render each sub-issue page as `ssot/pages/issue-<issue-number>.md`:
   - first bullet links to the GitHub issue
   - `Description` contains the GitHub issue body as nested bullets
   - do not include a sub-issues/related-issues section on sub-issue pages
   - if there is no description, write `No description provided.`
6. Determine related issues from explicit metadata/references only:
   - first use GitHub GraphQL `Issue.subIssues` for each epic issue
   - if `subIssues` is unavailable or empty, fall back to explicit references:
   - issue title/body contains `#<epic-number>`
   - issue title/body contains `epic-<epic-number>`
   - issue label is `epic:<epic-number>` or `epic-<epic-number>`
   - issue milestone contains the epic number or exactly matches the epic title without the `epic:` prefix
   - do not infer membership from similar wording alone
7. Keep Logseq graph clean:
   - do not use Logseq properties such as `date::`, `github-issue::`, or `status::`
   - escape `#` in displayed text as `\#`
   - avoid namespaces like `epics/...` or `releases/...` unless the user explicitly asks
8. Ensure `ssot/pages/contents.md` contains exactly one plain `- Epics` section and no `[[Epics]]` page link.
9. Remove `ssot/logseq/bak` if Logseq recreated backup pages during the refresh.
10. Run `git diff --check`.

## Script

Use `scripts/render_epics_page.mjs` when possible. It can either:

- call GitHub through `gh issue list` plus GraphQL `Issue.subIssues`, which may require network approval:

```bash
node .codex/skills/pull-github-epics-to-ssot/scripts/render_epics_page.mjs
```

- render connector/search JSON from a file or stdin:

```bash
node .codex/skills/pull-github-epics-to-ssot/scripts/render_epics_page.mjs --input /tmp/issues.json
```

The input JSON may be either an array of issue objects or an object with an `issues` array. Recognized issue fields are `title`, `body`, `url`, `display_url`, `html_url`, `number`, `issue_number`, `labels`, and `milestone`.

## Output Contract

The Epics section in `ssot/pages/SSOT.md` should look like:

```markdown
- Epics
  - [[epic-123]]
```

`ssot/pages/epic-123.md` should look like:

```markdown
- [epic: Example title](https://github.com/muhammedgaygisiz/travellers-apps/issues/123) (Issue \#123)
- Description
  - GitHub description text
- Related issues
  - [feat: Child issue]([[issue-124]]) (Issue \#124)
```

`ssot/pages/issue-124.md` should look like:

```markdown
- [feat: Child issue](https://github.com/muhammedgaygisiz/travellers-apps/issues/124) (Issue \#124)
- Description
  - GitHub issue description text
```

Keep pages flat. Avoid tags, namespaces, properties, and unescaped `#` characters because they pollute Logseq graph view.
