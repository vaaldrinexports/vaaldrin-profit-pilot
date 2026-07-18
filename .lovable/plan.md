
# SaaS Conversion Plan — Vaaldrin ProfitPilot

Turn the single-user app into a multi-tenant SaaS with workspaces, subscriptions, a public marketing funnel, and an internal admin console. Shipped in 5 phases so you can preview after each.

## Recommended billing model (based on your "both SME + mid-market" answer)

Freemium + 2 paid tiers + Enterprise. Best fit for a two-audience GTM: SME self-serves on Free/Pro, mid-market lands on Business/Enterprise via sales.

| Plan | Price | Who | Limits |
|---|---|---|---|
| **Free** | ₹0 | Trial / solo exporter | 5 quotes/mo, 1 user, watermarked PDFs, no live Market Intel, no buyer intel |
| **Pro** | $49 / ₹3,999 mo | SME exporter | 100 quotes/mo, 3 users, branded PDFs, Market Intel (daily refresh), buyer intel |
| **Business** | $199 / ₹15,999 mo | Export house | Unlimited quotes, 15 users, roles, Market Intel (15-min refresh), API access, audit log export |
| **Enterprise** | Custom (sales) | 50+ user teams | SSO/SAML, custom limits, dedicated support, SLA, on-prem option |

14-day Pro trial on signup (no card). Billing via **Stripe** (seamless Lovable payments — best fit: digital SaaS, global, handles tax).

---

## Phase 1 — Multi-tenant foundation

Add `organizations`, `org_members` (with roles: owner/admin/member/viewer), and `invitations` tables. Migrate every existing tenant-scoped table (`quotes`, `app_settings`, `audit_log`, `mi_*` caches) to add `org_id` with RLS scoped via a `has_org_access(org_id, role[])` security-definer function (avoids RLS recursion).

- Existing single-user data auto-migrates: each current user becomes owner of a personal org seeded from their `app_settings`.
- Org switcher in sidebar (like Linear/Vercel).
- Invite flow: owner enters email → invitation row → invitee accepts on signup or from an inbox banner.
- Roles gate UI actions (viewer can't edit, member can't invite, etc.).

## Phase 2 — Public marketing site + onboarding

- Move current `/` (calculator) → `/app` under `_authenticated`.
- New public routes: `/` (landing), `/pricing`, `/features`, `/about`, `/contact`, `/legal/terms`, `/legal/privacy`. Each with proper SEO head + og:image.
- Signup wizard (3 steps): account → company profile (name, logo upload, GSTIN, address) → invite teammates (skippable).
- Email verification via Supabase Auth.
- 14-day Pro trial auto-activated on signup, no card.

## Phase 3 — Stripe billing + feature gates

- Enable Lovable's built-in Stripe payments.
- Products: Pro monthly/annual, Business monthly/annual (20% annual discount). Enterprise = "Contact sales" CTA → form.
- Checkout: Stripe-hosted, redirects to `/app/billing/success`.
- Webhook (`/api/public/hooks/stripe`) updates `organizations.plan`, `subscription_status`, `current_period_end`.
- Customer portal link for self-serve upgrade/downgrade/cancel/invoices.
- Feature-gate helper `can(org, "feature")` used everywhere:
  - Free: quote count check before save, PDF watermark, Market Intel tab locked with upgrade CTA.
  - Pro: 100 quotes/mo counter, unlocks branded PDFs + daily MI.
  - Business: unlimited, unlocks 15-min MI refresh + audit export.
- In-app upgrade modals when a gate is hit.

## Phase 4 — Superadmin console

New route `/superadmin` gated by a `is_platform_admin` flag on a separate `platform_admins` table (never a boolean on users — privilege escalation risk).

- **Tenants**: list all orgs (name, plan, MRR contribution, users, quotes/mo, last active), search, drill into any org.
- **Revenue**: MRR, ARR, new/churned this month, plan distribution, trial→paid conversion.
- **Usage**: quotes generated, MI refreshes consumed, top consumers (for capacity planning).
- **Actions**: manually adjust plan/limits, extend trial, suspend org, impersonate user (audit-logged), refund via Stripe portal deep-link.

## Phase 5 — Polish + go-live

- Transactional emails via Lovable Email: welcome, invite, trial-ending (day 12), payment failed, cancellation.
- Rate-limit Market Intel refresh per org per plan.
- Backfill existing data into personal orgs (idempotent migration).
- Update `SECURITY_AUDIT.md` for multi-tenant threat model (cross-tenant read/write tests).
- Landing page copy + screenshots + testimonial placeholders.

---

## Technical notes

**Schema (Phase 1 core):**
```
organizations(id, name, slug, logo_url, plan, subscription_status,
              stripe_customer_id, stripe_subscription_id, trial_ends_at,
              current_period_end, created_by, created_at)
org_members(org_id, user_id, role[owner|admin|member|viewer], created_at)
invitations(id, org_id, email, role, token, expires_at, accepted_at)
platform_admins(user_id)  -- separate table, never a flag on users
usage_counters(org_id, period_start, quotes_created, mi_refreshes)
```

Every existing table adds `org_id uuid not null references organizations(id) on delete cascade`. RLS via:
```sql
create function has_org_access(_org uuid, _roles text[]) returns boolean
  language sql stable security definer set search_path=public as $$
  select exists(select 1 from org_members
    where org_id=_org and user_id=auth.uid()
    and (_roles is null or role = any(_roles)))
$$;
```

**Current-org selection:** stored in `app_settings.current_org_id` per user; server functions read it from context and pass to RLS-scoped queries.

**Billing webhook** at `/api/public/hooks/stripe` verifies `stripe-signature` HMAC before writes, uses `supabaseAdmin` inside the handler only.

**Estimated build:** Phase 1 (~1 day), Phase 2 (~1 day), Phase 3 (~1 day), Phase 4 (~half day), Phase 5 (~half day). Total ~4 working days of iteration.

Ready to start with **Phase 1** on approval.
