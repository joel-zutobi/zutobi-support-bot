# Set up billing integrations

The support agent needs subscription facts from several systems. Give it the narrowest read access each provider supports. The long-term interface remains the Zutobi-owned `support_lookup` MCP. Direct vendor connections are for supervised setup and diagnostics.

## Pinned packages and sources

The runtime examples pin the packages reviewed on 2026-09-14:

| Package | Version | Official source |
| --- | --- | --- |
| `@stripe/mcp` | `0.3.3` | [Stripe AI](https://github.com/stripe/ai/tree/main/tools/modelcontextprotocol) |
| `@paypal/mcp` | `1.8.1` | [PayPal MCP server](https://github.com/paypal/paypal-mcp-server) |
| `@paddle/paddle-mcp` | `0.1.6` | [Paddle MCP server](https://github.com/PaddleHQ/paddle-mcp-server) |
| `@revenuecat/cli` | `0.1.2` | [RevenueCat CLI](https://github.com/RevenueCat/cli) |

Review the vendor release notes and source before changing a pinned version. The published npm packages and hosted MCP endpoints are the runtime dependencies. This repository does not copy vendor source.

## What we can connect

| System | Runtime choice | Authentication | Support-safe starting point |
| --- | --- | --- | --- |
| Zutobi | Local MCP in `mcp/zutobi-user-lookup` | `ZUTOBI_ADMIN_AUTH_TOKEN` | One fixed read-only lookup tool |
| Gmail | Hosted MCP at `https://gmailmcp.googleapis.com/mcp/v1` | Google OAuth | Search, read, list drafts, and create drafts only |
| Stripe | `@stripe/mcp` locally; hosted MCP only after checking its OAuth grant | Restricted API key, or verified read-only OAuth | Customer and subscription read permissions only |
| PayPal | `@paypal/mcp` locally | Short-lived PayPal access token | Load Transaction Search only |
| Paddle | Hosted MCP at `https://mcp.paddle.com/mcp`, or `@paddle/paddle-mcp` locally | OAuth or restricted API key | Use `read-only`, never the default tool mode |
| RevenueCat | Hosted MCP at `https://mcp.revenuecat.ai/mcp`, plus the `rc` CLI | OAuth or API v2 key | Customer-information read permissions only |
| Solidgate | Direct API v2 later | Channel-limited, scoped API key | Customer, subscription, and invoice reads only |
| Google Play | Android Publisher API later | Google service account | Query with stored purchase tokens |
| Apple | App Store Server API later | App Store server key | Query with stored transaction IDs |

Apple, Google Play, and Solidgate do not have an official customer-subscription MCP to download. Their direct APIs belong behind the future `support_lookup` service.

## Access model

Use two separate identities:

1. The agent uses a machine credential that can read only the records needed for support.
2. A named human uses a dashboard account that may refund. Never store this account's session or credentials in the agent.

Do not create a dashboard login for the agent when a restricted machine credential is available. The agent should return the provider, record ID, relevant status, and a documented dashboard link. The human opens the record and decides whether to refund.

| Provider | Agent access | Human dashboard access for refunds |
| --- | --- | --- |
| Stripe | Restricted API key with selected resources set to `Read`; optional dashboard account is `View Only` | `Refund Analyst` is the narrowest standard refund role |
| Paddle Billing | API key with only the listed `*.read` permissions; optional dashboard account is `Finance` | `Support` can view customers, subscriptions, transactions, and adjustments and can act on them |
| PayPal Business | Transaction Search read scope only, or a custom secondary user with view privileges | Separate secondary user with the specific refund privilege |
| RevenueCat | API v2 key with only customer, subscription, purchase, and invoice read scopes; optional dashboard account is `View Only` | `Support` can refund supported purchases, but can also grant entitlements and delete customers |
| Solidgate | Channel-limited API v2 key with only customer, subscription, and optional invoice reads | Custom human-only role with view-order and refund operations |
| Google Play | Service credential only inside a GET-only `support_lookup` adapter | Named user with `Manage orders and subscriptions`, limited to the Zutobi app |
| Apple | In-App Purchase key only inside a GET-only `support_lookup` adapter | No developer refund role; direct the customer to Apple's refund flow |

Stripe's [`View Only`](https://docs.stripe.com/get-started/account/teams/roles) role and Paddle's [`Finance`](https://www.paddle.com/help/start/set-up-paddle/can-i-invite-members-of-my-team) role are the safe choices if a person needs to inspect the dashboards without refund authority. RevenueCat's [`View Only`](https://www.revenuecat.com/docs/projects/collaborators) role is safe for inspection. RevenueCat `Support` is not read-only.

## Stripe

For strict read-only operation, use the local server with a restricted API key. Use Stripe's hosted MCP only after confirming that its OAuth grant is read-only and its reported tool set contains no mutations. Configure the published package as follows:

```json
{
  "command": "npx",
  "args": ["-y", "@stripe/mcp@0.3.3"],
  "env": {
    "STRIPE_SECRET_KEY": "<restricted-key>"
  }
}
```

Create a restricted key with `Read` access to Customers and Subscriptions. Add Invoices, Charges or Payment Intents, and Refunds as `Read` only when the support response needs those facts. Add Products and Prices as `Read` only when human-readable plan names are required. Keep every other resource at `None` and every write permission off. Stripe uses key permissions to decide which tools are available.

Use a restricted `rk_` key for the support agent. Keep the key outside this repository and outside screenshots or issue comments.

If a human needs dashboard access only, assign `View Only`. If a human needs to issue refunds, assign `Refund Analyst`, not the broader Analyst or Support roles. The agent can hand over an exact payment URL in the documented form `https://dashboard.stripe.com/payments/:id`. See [Stripe roles](https://docs.stripe.com/get-started/account/teams/roles), [restricted keys](https://docs.stripe.com/keys/restricted-api-keys), [dashboard URL patterns](https://docs.stripe.com/stripe-apps/reference/viewports), and the [refund workflow](https://docs.stripe.com/refunds).

Source instructions: [Stripe MCP README](https://github.com/stripe/ai/blob/main/tools/modelcontextprotocol/README.md).

## PayPal

PayPal's server requires an explicit tool list. PayPal does not offer a strictly read-only OAuth scope for subscription detail. Start with Transaction Search only:

```json
{
  "command": "npx",
  "args": [
    "-y",
    "@paypal/mcp@1.8.1",
    "--tools=transactions.list"
  ],
  "env": {
    "PAYPAL_ACCESS_TOKEN": "<short-lived-access-token>",
    "PAYPAL_ENVIRONMENT": "SANDBOX"
  }
}
```

Use `SANDBOX` first. Change to `PRODUCTION` only after the tool list has been inspected in the MCP host. Use an access token whose granted scope includes only `https://uri.paypal.com/services/reporting/search/read` where the app configuration permits it.

Transaction Search can return payer email, transaction status, and refunded or reversed status. PayPal lookup still needs a bounded search or a stored subscription ID. The subscription-detail endpoint requires the broad `https://uri.paypal.com/services/subscriptions` scope, named "Manage plan & subscription." Detailed refund retrieval similarly uses a refund-capable scope. Do not give either credential directly to the agent. If subscription detail is needed, keep the broader credential inside `support_lookup` and expose a fixed GET-only operation.

For dashboard-only inspection, create a PayPal Business secondary user with a custom permission set. Grant only the current UI's activity, transaction, recurring-payment, and subscription view privileges. Exclude refunds, sending money, automatic-payment changes, disputes, and account changes. PayPal does not publish the complete current permission checklist, so sign in as the secondary user and verify it before connecting anything. A separate human secondary user may receive the refund privilege. The agent should provide the transaction ID and [Activity](https://www.paypal.com/myaccount/transactions/) link rather than inventing a record URL. See [PayPal secondary users](https://www.paypal.com/fr/cshelp/article/how-do-i-manage-users-on-my-business-account-help274?locale.x=en_RE), [Transaction Search](https://developer.paypal.com/api/transaction-search/v1/search-get), [subscription detail](https://developer.paypal.com/api/subscriptions/v1/subscriptions-get/), and the [human refund workflow](https://www.paypal.com/us/cshelp/article/how-do-i-issue-a-refund-help101).

Source instructions: [PayPal MCP README](https://github.com/paypal/paypal-mcp-server/blob/main/README.md) and [accepted tool filters](https://github.com/paypal/paypal-mcp-server/blob/main/src/index.ts).

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

Grant the key only `customer.read`, `subscription.read`, `subscription_history.read`, `transaction.read`, and `adjustment.read`. Keep every `*.write` permission off. Do not grant `customer_portal_session.write`, because it returns authenticated management links and is write-capable. If a person needs dashboard lookup access, assign `Finance`, whose access to these records is marked view-only. A human who needs to refund can use `Support`, but that role is not suitable for the agent. Paddle does not document a stable transaction-detail URL, so provide the transaction ID and the [refund workflow](https://www.paddle.com/help/manage/your-customers/how-do-i-issue-refunds). See [Paddle API permissions](https://developer.paddle.com/api-reference/about/permissions/) and [team roles](https://www.paddle.com/help/start/set-up-paddle/can-i-invite-members-of-my-team).

Source instructions: [Paddle MCP README](https://github.com/PaddleHQ/paddle-mcp-server/blob/main/README.md).

## RevenueCat

Use the hosted RevenueCat MCP when the host supports remote OAuth. When OAuth is not suitable, create an API v2 key with `customer_information:customers:read` and `customer_information:subscriptions:read`. Add `customer_information:purchases:read` for non-subscription purchases and `customer_information:invoices:read` for RevenueCat Billing invoices. Grant no `read_write` scope.

The CLI is useful for a supervised check before connecting the MCP:

```powershell
npx @revenuecat/cli@0.1.2 auth login
npx @revenuecat/cli@0.1.2 customers list --json
npx @revenuecat/cli@0.1.2 customers show <customer-id> --json
```

Email search works only when Zutobi has supplied the RevenueCat `$email` customer attribute. Keep the stable Zutobi user ID as the RevenueCat App User ID or maintain an explicit mapping to it.

If a person needs dashboard lookup access, assign `View Only`. Do not assign RevenueCat `Support` to the agent: it can refund, grant entitlements, and delete customers. A named human may use `Support` when those powers are acceptable. RevenueCat can directly refund only Google Play and RevenueCat Billing purchases; Apple and Stripe refunds happen with those providers. Give the human the exact searchable ID and the [RevenueCat dashboard](https://app.revenuecat.com). See [RevenueCat scopes](https://www.revenuecat.com/docs/projects/oauth-setup#available-scopes), [collaborator roles](https://www.revenuecat.com/docs/projects/collaborators), and [refund limitations](https://www.revenuecat.com/docs/subscription-guidance/refunds).

Source instructions: [RevenueCat CLI README](https://github.com/RevenueCat/cli/blob/main/README.md).

## Solidgate

Keep bot lookup access separate from human refund access.

For the bot, use a Solidgate API v2 Bearer key behind `support_lookup`. Limit it to the relevant channels and select only the live Hub permissions needed for these read endpoints:

- [`/customers/list`](https://api-docs.solidgate.com/api/v2/customers/list-customers) and [`/customers/get`](https://api-docs.solidgate.com/api/v2/customers/get-customer)
- [`/subscriptions/list`](https://api-docs.solidgate.com/api/v2/subscriptions/list-subscriptions) and [`/subscriptions/get`](https://api-docs.solidgate.com/api/v2/subscriptions/get-subscription)
- [`/invoices/list`](https://api-docs.solidgate.com/api/v2/invoices/list-invoices) and [`/invoices/get`](https://api-docs.solidgate.com/api/v2/invoices/get-invoice), only when payment status is required

Do not grant create, update, cancel, refund, void, settle, delete, export, or configuration permissions. Do not give the bot a Hub login. Solidgate documents channel-scoped API v2 keys with fine-grained permissions, but its public documentation does not list every customer and subscription permission name. Check the permission names shown in `Developers > API v2 > Keys > Create API key` instead of guessing them. The API v1 channel secret is not suitable for direct bot access because Solidgate does not document comparable fine-grained permissions for it. If legacy API v1 order status is required, keep that secret inside `support_lookup` and expose only the fixed status read. See [Solidgate API access](https://docs.solidgate.com/payments/integrate/access-to-api/).

Solidgate's predefined Hub roles are Merchant admin, Team lead, Manager, Analyst, Support tier 1, Support tier 2, Support tier 3, Dispute support, Developer, Alert manager, Finance manager, and Authorized signatory. Analyst is read focused, but the public documentation does not publish the complete operation matrix. Use `Account settings > Roles` to inspect each role. Prefer custom roles because Solidgate separates operations such as viewing orders and refunding a payment. Assigned roles are additive, so do not combine a bot or lookup role with a refund role. See [Solidgate permission management](https://docs.solidgate.com/payments/hub/permission-management/).

For a human who may issue refunds, create a separate custom `Refund operator` role with only the live operations for viewing orders and refunding a payment. Assign it only to named human accounts. The documented refund path is `Payments > Orders > select the order > Refund`. The agent should give the human the [Solidgate Hub](https://hub.solidgate.com/) link and the exact order ID. Solidgate does not document a stable per-order Hub deep-link format, so do not construct one. See [Solidgate's refund workflow](https://docs.solidgate.com/payments/card-payments/manage-card-payments/).

## Google Play

Google Play subscription lookup requires the package name and purchase token. The read endpoint is `purchases.subscriptionsv2.get`. It cannot search all subscriptions by customer email, so save the purchase token or an explicit mapping on the Zutobi user record. See [Get subscription metadata](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2/get).

Google's documented Play Billing API setup tells you to grant a service account both `View financial data, orders, and cancellation survey responses` and `Manage orders and subscriptions`. The second permission includes refund and cancellation authority. Therefore, do not expose this service-account credential to the drafting agent or to a general Android Publisher MCP. Store it only in `support_lookup`, allow only the fixed `GET` subscription-status call, and reject every mutation method. Limit the service account to the Zutobi app where the Console allows it. See [Google Play Developer API setup](https://developers.google.com/android-publisher/getting_started) and [Play Console permission definitions](https://support.google.com/googleplay/android-developer/answer/10019561?hl=en).

For a human refund operator, grant a named account `Manage orders and subscriptions` plus read-only app access for the Zutobi app. This lets the user work in `Order management` without broader release or account administration access. The agent should provide the GPA order ID and the [Play Console](https://play.google.com/console/) link. The human can search by order ID or full customer email. See [Google's order and refund workflow](https://support.google.com/googleplay/android-developer/answer/2741495?hl=en).

## Apple

Apple subscription lookup requires an original transaction ID or another transaction ID for the customer. Save that identifier on the Zutobi user record. Use `Get All Subscription Statuses` to read current status. See [Apple's subscription-status endpoint](https://developer.apple.com/documentation/AppStoreServerAPI/Get-All-Subscription-Statuses) and [transaction identifier guidance](https://developer.apple.com/documentation/appstoreserverapi/originaltransactionid).

Create a dedicated In-App Purchase key in App Store Connect under `Users and Access > Integrations > In-App Purchase`. Apple does not document per-method read permissions for this key, and the same App Store Server API includes mutation endpoints. Keep the key only inside `support_lookup`, expose fixed read operations, and block renewal extensions, consumption submissions, test notifications, and every other write. Never commit the `.p8` private key. See [Apple's key setup](https://developer.apple.com/documentation/appstoreserverapi/creating-api-keys-to-authorize-api-requests) and [App Store Server API](https://developer.apple.com/documentation/appstoreserverapi).

There is no App Store Connect role for a Zutobi operator to issue an ordinary customer refund. The customer requests it from Apple at [reportaproblem.apple.com](https://reportaproblem.apple.com/), and Apple decides. The support agent may give that link after operator approval under the skill's refund rules. See [Apple's customer refund instructions](https://support.apple.com/en-us/118223).

## Rollout order

1. Register the local Zutobi lookup MCP and verify a staff-owned account.
2. Connect provider sandboxes or test modes with read-only credentials.
3. Inspect the tools reported by the MCP host. Stop if any mutation tool appears.
4. Run customer lookup tests with synthetic or staff-owned records.
5. Connect production credentials one provider at a time.
6. Keep the support skill in classify-only mode until the normalized facts match the provider dashboards.

Keep the final drafting agent on the Zutobi-owned `support_lookup` MCP instead of exposing every vendor server. Move proven reads behind that server, return one normalized schema, and keep provider credentials there.
