# FaceSmash Developer Portal - Email Implementation Plan

## Overview
Integrate Resend as primary email service for team invites, account notifications, and activity updates.

---

## 1. EMAIL TYPES TO IMPLEMENT

### Account & Authentication
- **Welcome Email** - New account signup confirmation
- **Password Reset** - Password recovery link
- **Password Changed** - Account security notification
- **FaceCard Registered** - Biometric auth setup confirmation

### Team Management
- **Team Invite** - Invite pending user to join team
- **Invite Accepted** - Notify when user accepts invite
- **Team Member Removed** - Notify when removed from team
- **Role Changed** - Notify when user role is updated

### Billing & Subscriptions
- **Plan Upgraded** - Notify on plan change
- **Subscription Renewed** - Renewal confirmation
- **Payment Failed** - Failed payment notification
- **Invoice Generated** - Monthly invoice email

### Activity & Security
- **New Login Location** - Unusual login alert
- **API Key Created** - New API key notification
- **API Key Revoked** - Key revocation confirmation
- **Usage Alert** - API quota approaching threshold

### Weekly/Monthly Digest
- **Weekly Activity Summary** - Summarize team activity
- **Monthly Usage Report** - API usage & statistics

---

## 2. RESEND CONFIGURATION

### Domain Setup
- **Primary Domain**: `noreply@developers.facesmash.app`
- **Subdomain Configuration**: 
  - Use DKIM/SPF for authentication
  - Point DNS to Resend servers
  - Verify domain ownership

### Sender Configuration
```
From Name: FaceSmash Team
From Email: noreply@developers.facesmash.app
Reply-To: support@facesmash.app
```

### Rate Limiting
- Current: 2 requests/second per team
- Can request increase as we scale
- Monitor via Resend dashboard

---

## 3. EMAIL TEMPLATE DESIGN SYSTEM

### Brand Standards
- **Logo**: FaceSmash logo (40px height)
- **Primary Color**: Emerald (#10B981)
- **Background**: White (#FFFFFF)
- **Text Primary**: Gray-900 (#111827)
- **Text Secondary**: Gray-600 (#4B5563)
- **Font Stack**: Manrope, -apple-system, BlinkMacSystemFont, Segoe UI

### Template Structure
```
[Header with logo and brand name]
[Action section - main content]
[CTA button - emerald green]
[Footer - links + copyright]
```

### Email Responsiveness
- Mobile-first design
- Min-width: 320px
- Max-width: 600px
- Single column on mobile, optimal on desktop

---

## 4. TEMPLATE SPECIFICATIONS

### Template 1: Welcome Email
- **Trigger**: New account signup
- **CTA**: "Go to Dashboard"
- **Content**: 
  - Welcome message
  - What they can do
  - Next steps (create app, generate API key)

### Template 2: Team Invite
- **Trigger**: User invited to team
- **CTA**: "Accept Invitation" (link with token)
- **Content**:
  - Who invited them
  - Team name
  - Role they're being invited as
  - Invitation expiry (7 days)

### Template 3: Activity Summary
- **Trigger**: Weekly (Mondays 9am UTC)
- **CTA**: "View Full Activity"
- **Content**:
  - Team member activity
  - API usage stats
  - Recent changes

### Template 4: Usage Alert
- **Trigger**: When API usage > 80% of limit
- **CTA**: "View Usage Details"
- **Content**:
  - Current usage percentage
  - Limit & reset date
  - Upgrade prompt

### Template 5: Security Alert
- **Trigger**: Unusual login or API key creation
- **CTA**: "Review Activity" (link to settings)
- **Content**:
  - What happened
  - When/where
  - Verification (confirm it was you)

---

## 5. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1)
- [ ] Set up Resend account
- [ ] Configure domain (noreply@developers.facesmash.app)
- [ ] Create email service utility in codebase
- [ ] Implement API wrapper around Resend

### Phase 2: Core Templates (Week 2)
- [ ] Welcome email template
- [ ] Team invite email template
- [ ] Password reset template
- [ ] Password changed notification

### Phase 3: Integration (Week 3)
- [ ] Integrate with signup flow
- [ ] Integrate with team management
- [ ] Integrate with password reset
- [ ] Set up webhooks for bounce/complaint tracking

### Phase 4: Activity & Notifications (Week 4)
- [ ] Login alert emails
- [ ] API key notifications
- [ ] Usage alert template
- [ ] Weekly activity digest

### Phase 5: Testing & Monitoring (Week 5)
- [ ] Test all templates
- [ ] Set up monitoring/alerts
- [ ] Create email test suite
- [ ] Document for team

---

## 6. DATABASE SCHEMA

### email_queue table
```sql
id: UUID
user_id: UUID
email_type: VARCHAR (welcome, invite, alert, etc)
recipient_email: VARCHAR
status: ENUM (pending, sent, bounced, failed)
attempt_count: INT (max 3)
error_message: TEXT
created_at: TIMESTAMP
sent_at: TIMESTAMP
opened_at: TIMESTAMP
clicked_at: TIMESTAMP
```

### email_preferences table
```sql
user_id: UUID
weekly_digest: BOOLEAN (default: true)
usage_alerts: BOOLEAN (default: true)
login_alerts: BOOLEAN (default: true)
marketing_emails: BOOLEAN (default: false)
updated_at: TIMESTAMP
```

---

## 7. ERROR HANDLING

- **Retry Logic**: 3 attempts with exponential backoff
- **Bounce Tracking**: Webhook integration to mark emails as bounced
- **Complaint Handling**: Remove from mailing list on complaint
- **Rate Limiting**: Queue emails if hitting rate limits

---

## 8. MONITORING & ANALYTICS

- **Dashboard Metrics**:
  - Total emails sent
  - Delivery rate %
  - Open rate %
  - Bounce/complaint rate
  - API usage

- **Alerts**:
  - High bounce rate (>5%)
  - High complaint rate (>0.5%)
  - API errors
  - Queue backup (>1000 pending)

---

## 9. COMPLIANCE & SECURITY

- **Unsubscribe Link**: Required in all marketing emails
- **Preferences Center**: Users can manage email preferences
- **PII Protection**: No sensitive data in email subjects
- **Auth Tokens**: Short-lived, single-use tokens for email actions
- **SPF/DKIM/DMARC**: Configured via Resend

---

## 10. TESTING STRATEGY

### Unit Tests
- Email template rendering
- Variable substitution
- HTML validity

### Integration Tests
- End-to-end email sending
- Webhook handling
- Error scenarios

### Manual Testing
- Send real emails to test address
- Verify appearance in Gmail, Outlook, Apple Mail
- Test mobile rendering
- Verify links and CTAs

---
