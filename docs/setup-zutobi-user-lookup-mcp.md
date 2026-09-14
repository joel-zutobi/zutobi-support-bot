# Set up the Zutobi user lookup MCP

This local MCP server gives a support agent read-only access to basic Zutobi account and subscription facts. It calls one fixed endpoint:

```text
GET https://webapi.zutobi.com/api/v3/admin/user
```

The server can look up an exact email address or numeric user ID. It cannot modify an account or subscription.

## Requirements

- Node.js 20 or later
- A Zutobi `partial_admin` authentication token that can call the admin user endpoint

Never commit the token or paste it into an issue, chat, test fixture, or MCP configuration file.

## Install and build

Run these commands from the repository root:

```powershell
Set-Location '.\mcp\zutobi-user-lookup'
npm ci
npm test
```

## Start it locally

Set the token only for the current PowerShell process:

```powershell
$env:ZUTOBI_ADMIN_AUTH_TOKEN = '<token>'
npm start
```

The process waits for an MCP client on standard input. It writes protocol messages to standard output and status messages to standard error.

For an interactive test, use the official MCP Inspector:

```powershell
$env:ZUTOBI_ADMIN_AUTH_TOKEN = '<token>'
npx @modelcontextprotocol/inspector node '.\dist\src\index.js'
```

Call `lookup_zutobi_user` with exactly one input:

```json
{ "email": "customer@example.com" }
```

or:

```json
{ "user_id": 1234567 }
```

Start with a synthetic or staff-owned test account. Do not paste customer data into screenshots, issues, or logs.

## Configure an MCP host

Build the package first. Register `node` as the command and use the absolute path to `dist/src/index.js` as its only argument.

The host process must inherit `ZUTOBI_ADMIN_AUTH_TOKEN`. Prefer the operating system's secret storage or an approved secrets manager. Do not put the token directly into a checked-in configuration file.

Optional environment variables:

- `ZUTOBI_LOOKUP_TIMEOUT_MS`, default `60000`
- `ZUTOBI_LOOKUP_MAX_RESPONSE_BYTES`, default `1048576`

## Rotate or revoke the token

Treat this token as a credential for an internal admin API. If it is shared in an issue, commit, ordinary chat, or log, revoke it and issue a replacement. Restart the MCP host after changing the environment variable.
