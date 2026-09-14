# Issue tracker

Issues and specifications live in GitHub Issues for `joel-zutobi/zutobi-support-bot`. Use the `gh` CLI from this repository.

## Operations

- Create an issue with `gh issue create`. Use `--body-file` for a multiline description.
- Read an issue and its discussion with `gh issue view <number> --comments`.
- List issues with `gh issue list`.
- Comment with `gh issue comment <number>`.
- Change labels with `gh issue edit <number> --add-label <label>` or `--remove-label <label>`.
- Close an issue with `gh issue close <number>`.

Infer the repository from `git remote -v`.

## Pull requests as a triage source

Pull requests are not a request or ticket source. Track planned work in GitHub Issues.

## Skill terminology

When a skill says "publish to the issue tracker," create a GitHub issue.

When a skill says "fetch the relevant ticket," read the corresponding GitHub issue and its comments.
