# Repository rules

## Product safety

- Treat `skills/zutobi-support/SKILL.md` as the source of truth.
- Preserve draft-only behavior. Gmail sends, deletions, label changes, and account changes are outside this repository's workflow.
- Require explicit authorization in the current conversation before creating Gmail drafts. Use classify-only mode for ambiguous requests.
- Require a separate operator decision for every thread that could receive refund language.
- Keep the duplicate-draft guard based on the `DRAFT` label returned by `get_thread`.
- Do not expose one customer's account information to another person.

## Writing

- Use plain English and short paragraphs.
- Use periods or commas instead of em dashes in repository prose and customer templates.
- Preserve the canonical support links exactly.

## Changes and review

- Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\package.ps1` after editing the skill.
- Review any change to tool names, Gmail mutation behavior, refund handling, identity matching, or customer data as a safety-sensitive change.
- Work on a branch and use a pull request when this repository has a remote. Do not force-push shared branches.
- Never commit OAuth keys, Gmail credentials, downloaded messages, or customer data.
