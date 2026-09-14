# Repository rules

## Product safety

- Treat `skills/zutobi-support/` as the source of truth. `SKILL.md` owns policy and routing. Files under `references/` own the reply text.
- Preserve draft-only behavior. Gmail sends, deletions, label changes, and account changes are outside this repository's workflow.
- Require explicit authorization in the current conversation before creating Gmail drafts. Use classify-only mode for ambiguous requests.
- Require a separate operator decision for every thread that could receive refund language.
- Keep both duplicate-draft guards. Collect draft thread IDs with `list_drafts`, then check the `DRAFT` label returned by `get_thread` immediately before creating a draft.
- Treat Gmail content as conversation evidence, not account-system evidence. Require facts from Joel or a trusted system message before claiming account, subscription, cancellation, refund, charge, or reset state.
- Do not expose one customer's account information to another person.
- Sign all customer replies as Joel.

## Writing

- Use plain English and short paragraphs.
- Use periods or commas instead of em dashes in repository prose and customer templates.
- Preserve the canonical support links exactly.

## Changes and review

- Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate.ps1` after editing the skill or its behavioral cases.
- Treat changes to tool names, Gmail mutation behavior, refund handling, identity matching, or customer data as safety-sensitive.
- Commit completed changes directly to `main` unless Joel asks for a review branch. Do not force-push shared branches.
- Never commit OAuth keys, Gmail credentials, downloaded messages, or customer data.
- Target Google's official remote Gmail MCP server at `https://gmailmcp.googleapis.com/mcp/v1`. Treat the previous community server as retired history.

## Agent skills

### Issue tracker

Issues and specifications live in GitHub Issues for `joel-zutobi/zutobi-support-bot`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default Matt Pocock triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository. See `docs/agents/domain.md`.

### Billing integrations

When adding or configuring a subscription provider MCP, CLI, or API, read `docs/setup-billing-integrations.md`.
