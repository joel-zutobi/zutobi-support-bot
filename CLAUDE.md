# Repository rules

## Product safety

- Treat `skills/zutobi-support/` as the source of truth. `SKILL.md` owns policy and routing. The files under `references/` own the reply text.
- Preserve draft-only behavior. Gmail sends, deletions, label changes, and account changes are outside this repository's workflow.
- Require explicit authorization in the current conversation before creating Gmail drafts. Use classify-only mode for ambiguous requests.
- Require a separate operator decision for every thread that could receive refund language.
- Keep the duplicate-draft guard based on the `DRAFT` label returned by `get_thread`.
- Treat Gmail content as conversation evidence, not account-system evidence. Require facts from Joel or a trusted system message before claiming account, subscription, cancellation, refund, charge, or reset state.
- Do not expose one customer's account information to another person.
- Sign all customer replies as Joel.

## Writing

- Use plain English and short paragraphs.
- Use periods or commas instead of em dashes in repository prose and customer templates.
- Preserve the canonical support links exactly.

## Changes and review

- Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate.ps1` after editing the skill or its behavioral cases.
- Review any change to tool names, Gmail mutation behavior, refund handling, identity matching, or customer data as a safety-sensitive change.
- Work on a branch and use a pull request when this repository has a remote. Do not force-push shared branches.
- Never commit OAuth keys, Gmail credentials, downloaded messages, or customer data.
