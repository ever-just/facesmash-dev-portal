# FaceSmash Email Implementation Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install resend
```

### 2. API Key Configuration
API Key is already configured in `lib/email/service.ts`:
```
re_78sX6QZx_2PpYuF6ULzkuaueHxdQzf56P
```

### 3. Sender Email
All emails are sent from: `noreply@developers.facesmash.app`
Reply-to: `support@facesmash.app`

---

## Available Email Functions

### Welcome Email
```typescript
import { sendWelcomeEmail } from '@/lib/email/service';

await sendWelcomeEmail('user@example.com', 'John Doe');
```

### Team Invite
```typescript
await sendTeamInviteEmail(
  'newuser@example.com',
  'John Doe',                    // Inviter name
  'Acme Corp',                   // Team name
  'https://developers.facesmash.app/invite/abc123xyz',  // Invite link
  'member'                       // Role
);
```

### Password Reset
```typescript
await sendPasswordResetEmail(
  'user@example.com',
  'https://developers.facesmash.app/reset-password?token=abc123xyz'
);
```

### Password Changed
```typescript
await sendPasswordChangedEmail('user@example.com');
```

### API Key Created
```typescript
await sendApiKeyCreatedEmail(
  'user@example.com',
  'My API Key',
  '2026-04-14'  // Optional expiry date
);
```

### Usage Alert
```typescript
await sendUsageAlertEmail(
  'user@example.com',
  85,                           // Usage percentage (85%)
  100000,                       // Monthly limit
  '2026-04-01'                 // Reset date
);
```

### Security Alert
```typescript
await sendSecurityAlertEmail(
  'user@example.com',
  'New login from unknown location',
  'New York, United States',
  '2026-03-14 14:30 UTC',
  'https://developers.facesmash.app/settings?tab=account#verify'
);
```

---

## Integration Points

### 1. Signup Flow
Add to `app/(login)/actions.ts` in the `signUp` function:
```typescript
import { sendWelcomeEmail } from '@/lib/email/service';

// After user is created
await sendWelcomeEmail(user.email, user.name);
```

### 2. Team Invites
Add to the team invite function:
```typescript
import { sendTeamInviteEmail } from '@/lib/email/service';

// After creating invite record
await sendTeamInviteEmail(
  invitedEmail,
  currentUser.name,
  team.name,
  `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteToken}`,
  role
);
```

### 3. Password Reset
Add to password reset request:
```typescript
import { sendPasswordResetEmail } from '@/lib/email/service';

await sendPasswordResetEmail(
  email,
  `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`
);
```

### 4. API Key Creation
Add to API key creation endpoint:
```typescript
import { sendApiKeyCreatedEmail } from '@/lib/email/service';

await sendApiKeyCreatedEmail(
  user.email,
  keyName,
  expiryDate?.toISOString()
);
```

---

## Email Templates

### Design System
- **Colors**: 
  - Primary: Emerald (#10B981)
  - Background: White (#FFFFFF)
  - Text: Gray-900 (#111827)
  - Secondary: Gray-600 (#4B5563)
- **Typography**: System fonts, responsive
- **Width**: 600px max, mobile-optimized

### Template Structure
All templates include:
1. FaceSmash logo & branding
2. Main content
3. Clear CTA button
4. Footer with preferences link

### Email Types Included
1. ✅ Welcome Email
2. ✅ Team Invite
3. ✅ Password Reset
4. ✅ Password Changed
5. ✅ API Key Created
6. ✅ Usage Alert
7. ✅ Security Alert

---

## Testing Emails

### Development
Use Resend sandbox mode or send to yourself:
```typescript
await sendWelcomeEmail('your-email@example.com', 'Test User');
```

### Check Delivery
1. Go to https://resend.com/emails
2. View sent emails
3. Check delivery status, opens, clicks

### Email Testing Tools
- **Litmus**: Test rendering across clients
- **Email on Acid**: Detailed testing
- **Preview**: Built into Resend dashboard

---

## Monitoring & Troubleshooting

### Check Email Status
```
https://resend.com/emails
```

### Common Issues

#### Email Not Delivered
- ✅ Check recipient email is correct
- ✅ Verify domain is verified (noreply@developers.facesmash.app)
- ✅ Check Resend dashboard for errors

#### High Bounce Rate
- Verify email addresses in database
- Check bounce notifications in Resend

#### Rate Limiting
- Current: 2 requests/second
- Queue emails if hitting limit
- Resend will auto-retry

---

## Database Schema (To Implement)

### Create email_queue table
```sql
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  email_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  status ENUM('pending', 'sent', 'bounced', 'failed', 'complained') DEFAULT 'pending',
  attempt_count INT DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now(),
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP
);

CREATE INDEX idx_email_queue_user_id ON email_queue(user_id);
CREATE INDEX idx_email_queue_status ON email_queue(status);
```

### Create email_preferences table
```sql
CREATE TABLE email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  weekly_digest BOOLEAN DEFAULT true,
  usage_alerts BOOLEAN DEFAULT true,
  login_alerts BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT now()
);
```

---

## Error Handling

### Retry Logic
```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function sendEmailWithRetry(options: EmailOptions) {
  let lastError;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await sendEmail(options);
    } catch (error) {
      lastError = error;
      if (i < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}
```

---

## Next Steps

- [ ] Add email_queue & email_preferences tables to database
- [ ] Integrate sendWelcomeEmail into signup flow
- [ ] Integrate sendTeamInviteEmail into team management
- [ ] Set up email preferences page in Settings
- [ ] Add webhook handling for bounces/complaints
- [ ] Create weekly digest cron job
- [ ] Set up monitoring dashboard
- [ ] Test all email templates across clients
- [ ] Document in team wiki

---

## Support

**Resend API**: https://resend.com/docs
**Dashboard**: https://resend.com/emails
**Status**: https://status.resend.com

For questions contact: dev@facesmash.app

