# Set up billing integrations

The support agent needs subscription facts from several systems. Give it the narrowest read access each provider supports. The long-term interface remains the Zutobi-owned `support_lookup` MCP. Direct vendor connections are for supervised setup and diagnostics.

## Downloaded vendor sources

This repository pins official source repositories as Git submodules:

| Path | Official project | Why it is here |
| --- | --- | --- |
| `vendor/stripe-ai` | Stripe AI toolkit and MCP | Inspect the current Stripe MCP package and security guidance |
| `vendor/paypal-mcp-server` | PayPal MCP server | Inspect accepted tool filters and token setup |
| `vendor/paddle-mcp-server` | Paddle MCP server | Inspect its enforced `read-only` mode |
| `vendor/revenuecat-cli` | RevenueCat CLI | Inspect customer lookup commands and authentication |

The submodules pin reviewed commits. They are references, not copied runtime dependencies. Fetch them after an ordinary clone with:

```powershell
git submodule update --init --recursive
```

To update a vendor, review its release notes and source first. Then move only that submodule pointer and rerun the relevant tests.

The runtime examples below pin the packages reviewed on 2026-09-14:

- `@stripe/mcp@0.3.3`
- `@paypal/mcp@1.8.1`
- `@paddle/paddle-mcp@0.1.6`
- `@revenuecat/cli@0.1.2`

## What we can connect

| System | Runtime choice | Authentication | Support-safe starting point |
| --- | --- | --- | --- |
| Zutobi | Local MCP in `mcp/zutobi-user-lookup` | `ZUTOBI_ADMIN_AUTH_TOKEN` | One fixed read-only lookup tool |
| Gmail | Hosted MCP at `https://gmailmcp.googleapis.com/mcp/v1` | Google OAuth | Search, read, list drafts, and create drafts only |
| Stripe | Hosted MCP at `https://mcp.stripe.com`, or `@stripe/mcp` locally | OAuth or restricted API key | Customer and subscription read permissions only |
| PayPal | `@paypal/mcp` locally | Short-lived PayPal access token | Load only the three listed read tools |
| Paddle | Hosted MCP at `https://mcp.paddle.com/mcp`, or `@paddle/paddle-mcp` locally | OAuth or restricted API key | Use `read-only`, never the default tool mode |
| RevenueCat | Hosted MCP at `https://mcp.revenuecat.ai/mcp`, plus the `rc` CLI | OAuth or API v2 key | Customer-information read permission only |
| Solidgate | Direct API later | Scoped API key | Query with IDs stored on the Zutobi user |
| Google Play | Android Publisher API later | Google service account | Query with stored purchase tokens |
| Apple | App Store Server API later | App Store server key | Query with stored transaction IDs |

Apple, Google Play, and Solidgate do not have an official customer-subscription MCP to download. Their direct APIs belong behind the future `support_lookup` service.

## Stripe

Prefer Stripe's hosted MCP with OAuth when the MCP host supports it. For a local stdio connection, use the published package:

```json
{
  "command": "npx",
  "args": ["-y", "@stripe/mcp@0.3.3"],
  "env": {
    "STRIPE_SECRET_KEY": "<restricted-key>"
  }
}
```

Create a restricted key with read access to Customers and Subscriptions. Add another read permission only when a documented support case needs it. Stripe uses key permissions to decide which tools are available.

Use a restricted `rk_` key for the support agent. Keep the key outside this repository and outside screenshots or issue comments.

Source instructions: `vendor/stripe-ai/tools/modelcontextprotocol/README.md`.

## PayPal

PayPal's server requires an explicit tool list. Start with subscription detail, transaction search, and refund detail reads:

```json
{
  "command": "npx",
  "args": [
    "-y",
    "@paypal/mcp@1.8.1",
    "--tools=subscriptions.show,transactions.list,payments.getRefunds"
  ],
  "env": {
    "PAYPAL_ACCESS_TOKEN": "<short-lived-access-token>",
    "PAYPAL_ENVIRONMENT": "SANDBOX"
  }
}
```

Use `SANDBOX` first. Change to `PRODUCTION` only after the tool list has been inspected in the MCP host. The explicit list excludes refunds, captures, cancellations, and other mutations.

PayPal lookup still needs a stored subscription ID or a bounded transaction search. It cannot find a subscription directly from an email address.

Source instructions: `vendor/paypal-mcp-server/README.md` and `vendor/paypal-mcp-server/src/index.ts`.

## Paddle

Paddle's local server has an enforced read-only mode:

```json
{
  "command": "npx",
  "args": ["-y", "@paddle/paddle-mcp@0.1.6"],
  "env": {
    "PADDLE_API_KEY": "<read-only-api-key>",
    "PADDLE_ENVIRONMENT": "sandbox",
    "PADDLE_MCP_TOOLS": "read-only"
  }
}
```

Use a sandbox key first. For production, keep both controls in place: a read-only key and `PADDLE_MCP_TOOLS=read-only`. Paddle can find an exact customer email and list that customer's subscriptions.

Source instructions: `vendor/paddle-mcp-server/README.md`.

## RevenueCat

Use the hosted RevenueCat MCP when the host supports remote OAuth. Limit an API v2 key to `customer_information:customers:read` when OAuth is not suitable.

The CLI is useful for a supervised check before connecting the MCP:

```powershell
npx @revenuecat/cli@0.1.2 auth login
npx @revenuecat/cli@0.1.2 customers list --json
npx @revenuecat/cli@0.1.2 customers show <customer-id> --json
```

Email search works only when Zutobi has supplied the RevenueCat `$email` customer attribute. Keep the stable Zutobi user ID as the RevenueCat App User ID or maintain an explicit mapping to it.

Source instructions: `vendor/revenuecat-cli/README.md`.

## Rollout order

1. Register the local Zutobi lookup MCP and verify a staff-owned account.
2. Connect provider sandboxes or test modes with read-only credentials.
3. Inspect the tools reported by the MCP host. Stop if any mutation tool appears.
4. Run customer lookup tests with synthetic or staff-owned records.
5. Connect production credentials one provider at a time.
6. Keep the support skill in classify-only mode until the normalized facts match the provider dashboards.

Keep the final drafting agent on the Zutobi-owned `support_lookup` MCP instead of exposing every vendor server. Move proven reads behind that server, return one normalized schema, and keep provider credentials there.
