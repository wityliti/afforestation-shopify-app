# 🚀 Shopify App Store Submission Checklist

Use this checklist to ensure your Afforestation app is ready for Shopify App Store submission.

## ✅ Technical Requirements

### Authentication & Security
- [x] OAuth 2.0 implementation with `@shopify/shopify-app-remix`
- [x] Session storage configured (Prisma + PostgreSQL)
- [x] App distribution set to `AppStore` in `shopify.server.ts`
- [x] Embedded app configuration (`embedded = true`)
- [ ] API tokens stored securely (not hardcoded)
- [ ] HTTPS enabled on all endpoints (Railway handles this)

### Webhooks
- [x] `app/uninstalled` webhook configured
- [x] `orders/paid` webhook configured
- [ ] **GDPR Mandatory Webhooks** (uncomment in `shopify.app.toml`):
  - [ ] `customers/data_request` 
  - [ ] `customers/redact`
  - [ ] `shop/redact`

### Scopes
- [x] `read_orders` - Current scope
- [ ] Review if additional scopes needed for full functionality

### App Proxy (if used)
- [x] Configured at `/proxy` with subpath `afforestation`

---

## 📝 App Listing Requirements

### Basic Information
- [ ] App name (max 30 characters)
- [ ] Tagline (max 100 characters)
- [ ] Detailed description (300-2,800 characters)
- [ ] Key benefits (3-5 bullet points)
- [ ] App category selection

### Media Assets
- [ ] App icon (1200x1200px, PNG/JPG)
- [ ] Screenshots (minimum 3, 1600x900px recommended)
- [ ] Demo video (optional but recommended)
- [ ] Merchant-facing demo store

### URLs & Links
- [ ] Privacy Policy URL → `/privacy`
- [ ] Terms of Service URL → `/terms`
- [ ] Support email/URL
- [ ] FAQ/Documentation URL (optional)

### Pricing
- [ ] Pricing model defined (free, subscription, usage-based)
- [ ] Billing API integration (if paid app)

---

## 🔒 GDPR & Privacy Compliance

### Protected Customer Data Access
- [ ] Apply in Partner Dashboard → Apps → [Your App] → Distribution
- [ ] Justify data access needs in application
- [ ] Wait for approval before enabling GDPR webhooks

### Data Handling
- [ ] Document what customer data you access
- [ ] Implement data export on `customers/data_request`
- [ ] Implement data deletion on `customers/redact`
- [ ] Implement shop data cleanup on `shop/redact`
- [ ] Privacy policy accurately describes data practices

### Webhook Handlers (files exist, need implementation review)
- [x] `app/routes/webhooks.customers.data_request.tsx`
- [x] `app/routes/webhooks.customers.redact.tsx`
- [x] `app/routes/webhooks.shop.redact.tsx`

---

## 🏆 Built for Shopify Pathway

### Eligibility Requirements (post-launch)
| Requirement | Target | Status |
|-------------|--------|--------|
| Net installs on paid shops | 50+ | ⏳ Post-launch |
| App reviews | 5+ | ⏳ Post-launch |
| Average rating | 4.0+ | ⏳ Post-launch |
| Partner standing | Good | ✅ |

### Performance Benchmarks
- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] INP (Interaction to Next Paint) < 200ms
- [ ] API response p95 < 500ms

### Design Standards
- [x] Using Polaris components
- [x] Embedded admin experience
- [ ] Responsive on mobile devices
- [ ] Accessible (keyboard navigation, screen readers)

### Security (for BfS certification)
- [ ] Annual third-party penetration test
- [ ] Encrypted token storage (AES-128+)
- [ ] TLS 1.2+ for data in transit
- [ ] Architecture diagram
- [ ] Separate test/production environments

---

## 🧪 Pre-submission Testing

### Functional Testing
- [ ] Fresh install flow works
- [ ] OAuth consent and callback work
- [ ] Uninstall webhook fires and cleans up data
- [ ] All settings save and persist
- [ ] Widgets render correctly on storefront

### Automated Tests
- [ ] Loader/action tests pass
- [ ] Webhook handler tests pass
- [ ] Run `npm run test` before submission

### Manual QA
- [ ] Test on development store
- [ ] Test on staging (demo) store
- [ ] Review app in Shopify admin

---

## 📤 Submission Steps

1. [ ] Complete all items above
2. [ ] Run `shopify app deploy` to sync configuration
3. [ ] Go to Partners Dashboard → Apps → [Your App]
4. [ ] Click "Manage listing"
5. [ ] Fill in all listing information
6. [ ] Upload screenshots and assets
7. [ ] Submit for review

### Review Timeline
- **Initial review**: 5-7 business days
- **Revisions** (if needed): 2-3 days per round
- **Total estimate**: 1-3 weeks

---

## 📚 Resources

- [Shopify App Review Guidelines](https://shopify.dev/docs/apps/store/review)
- [Built for Shopify Requirements](https://shopify.dev/docs/apps/store/built-for-shopify)
- [GDPR Compliance](https://shopify.dev/docs/apps/store/data-protection/protected-customer-data)
- [Polaris Design System](https://polaris.shopify.com/)
