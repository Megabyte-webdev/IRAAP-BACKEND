# IRAAP organization managers + billing

This change adds database-backed organization managers, trial quotas, and Paystack recurring billing.

## API mounting

The supplied backend archive does not contain the Express application/server entrypoint, so mount these routers where the existing routers are registered:

```ts
app.use("/api/manager", managerRoutes);
app.use("/api/billing", billingRoutes);
```

The webhook must receive the unmodified JSON request bytes for signature verification. With Express JSON parsing:

```ts
app.use(express.json({
  verify: captureRawBody,
}));
```

Import `captureRawBody` from `src/middleware/rawBody.ts`.

The Paystack webhook URL is then:

`POST /api/billing/paystack/webhook`

Do not put the Paystack secret in the frontend.

## Environment

```env
FREE_TRIAL_DAYS=14
FREE_TRIAL_MAX_MEMBERS=25
FREE_TRIAL_MAX_PROJECTS=10
FREE_TRIAL_MAX_MANAGERS=1

BILLING_CURRENCY=NGN
BILLING_INTERVAL=monthly
BILLING_TERM_DAYS=30
BILLING_INSTITUTION_AMOUNT=0
BILLING_ENTERPRISE_AMOUNT=0

PAYSTACK_SECRET_KEY=
PAYSTACK_PLAN_INSTITUTION=
PAYSTACK_PLAN_ENTERPRISE=
PAYSTACK_CALLBACK_URL=https://your-app.example/manager/billing/callback
```

Amounts are Paystack subunits (for NGN, kobo). The plan codes must be created in Paystack and configured on the server.

## Payment flow

1. The manager chooses a paid plan.
2. The backend initializes a Paystack transaction with the plan code and creates an internal pending transaction.
3. Paystack redirects to the configured callback.
4. The callback asks the backend to verify the reference.
5. Paystack also sends `charge.success`; the signed webhook is the authoritative fulfillment path.
6. The backend marks the internal transaction `PAID` and activates the organization subscription.
7. `invoice.payment_failed` moves the subscription to `PAST_DUE`; `subscription.disable` moves it to `CANCELLED`.
8. An expired trial or non-active subscription is rejected with HTTP 402 for organization-managed project submission and manager mutations.

The webhook is idempotent for successful payment fulfillment by transaction reference.

## Role model

`users.role` remains the platform-wide role (`ADMIN`, `STUDENT`, `SUPERVISOR`). Organization privileges are stored in `organization_memberships.role`, which includes `MANAGER`.

Managers are authorized by a fresh database membership lookup. Never rely on `organizationRole` from the JWT for authorization.

Admins can create organizations and can see the organization overview. Organization member management and subscription mutations are handled through the manager API.

When an organization is created with an initial manager name/email, a new manager account gets a cryptographically generated temporary password and the existing onboarding email event sends it. Existing users cannot be pulled into a second organization by a manager.

## Trial

The default trial is 14 days. During the trial, the backend allows the organization workflow but limits it to:

- 25 members
- 10 projects
- 1 manager

Change the limits with environment variables. These are server-enforced, not UI-only.

## Redis production requirement

The rate limiter creates one RedisStore per limiter with unique prefixes. Do not refactor these stores into one shared Store instance.

For a Redis instance holding security-sensitive state, prefer `maxmemory-policy noeviction` with adequate memory headroom. If Redis is shared with cache workloads, use a dedicated Redis instance/database for security-sensitive keys.
