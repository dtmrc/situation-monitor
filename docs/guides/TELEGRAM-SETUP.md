# Telegram OSINT Feed Setup Guide

This guide covers setting up the Telegram OSINT feed system for monitoring Telegram channels.

## Prerequisites

- Node.js 18+
- A Telegram account (consider using a dedicated account for OSINT)
- Telegram API credentials from https://my.telegram.org/apps

---

## Step 1: Install Dependencies

```bash
cd apps/api
pnpm add telegram
```

---

## Step 2: Get Telegram API Credentials

1. Go to https://my.telegram.org/apps
2. Log in with your phone number
3. Create a new application (any name/description)
4. Note your **API ID** and **API Hash**

> **Security Note:** These credentials grant full access to your Telegram account. Never commit them to version control.

---

## Step 3: Generate Session String

Run the interactive setup script to generate a session string:

```bash
cd apps/api
npx tsx scripts/telegram-session-setup.ts
```

The script will:
1. Prompt for your API ID and Hash (or read from environment)
2. Ask for your phone number (with country code, e.g., `+1234567890`)
3. Send a verification code to your Telegram
4. Handle 2FA password if enabled
5. Output a session string for persistent authentication

Example output:
```
Your session string (store this in TELEGRAM_SESSION_STRING env var):

────────────────────────────────────────────────────────────
1BQANOTEuMTA4LjU2LjE1MwG7iy...
────────────────────────────────────────────────────────────
```

---

## Step 4: Configure Environment Variables

Add to your `.env` file:

```bash
# Telegram MTProto Credentials
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=your_api_hash_here
TELEGRAM_SESSION_STRING=your_session_string_here

# Translation (optional but recommended)
TRANSLATION_PROVIDER=google
GOOGLE_TRANSLATE_API_KEY=your_google_translate_key

# Alternative translation providers
# DEEPL_API_KEY=your_deepl_key
# LIBRETRANSLATE_URL=https://libretranslate.com
# LIBRETRANSLATE_API_KEY=optional_key
```

---

## Step 5: Run Database Migration

Generate and run the Drizzle migration for Telegram tables:

```bash
cd apps/api
pnpm db:generate
pnpm db:migrate
```

This creates:
- `feeds.telegram_channels` - Channel configurations
- `feeds.telegram_messages` - Message storage with translations and analysis

---

## Step 6: Add Channels to Monitor

### Via API

```typescript
// Add a channel
POST /api/projects/:projectId/feeds/telegram/channels
{
  "identifier": "@ukrainewar",
  "title": "Ukraine War Updates",
  "category": "military",
  "description": "Real-time conflict updates"
}
```

### Programmatically

```typescript
import { telegramChannelManager } from '@/feeds/services';

await telegramChannelManager.addChannel(projectId, {
  identifier: '@intel_slava',
  category: 'military',
  title: 'Intel Slava Z',
});
```

### Channel Categories

| Category | Description |
|----------|-------------|
| `military` | Armed forces, conflict zones, defense |
| `political` | Government, elections, policy |
| `economic` | Markets, sanctions, trade |
| `social` | Civil society, protests, demographics |
| `media` | News outlets, journalists |
| `regional` | Geographic-focused channels |
| `infrastructure` | Utilities, transport, critical systems |
| `other` | Miscellaneous |

---

## Step 7: Start the Worker

The Telegram worker processes messages with rate limiting:

```typescript
import { startTelegramWorker, scheduleTelegramIngest } from '@/jobs/workers/telegram.worker';

// Start the worker
startTelegramWorker();

// Schedule a fetch job
await scheduleTelegramIngest(projectId, feedConfigId, {
  limit: 50,
  translate: true,
  extractEntities: true,
  analyzeSentiment: true,
});

// Or schedule recurring fetches (every 5 minutes)
await scheduleRecurringTelegramIngest(projectId, feedConfigId, 300000);
```

---

## Translation Configuration

The system automatically detects and translates messages from non-English languages.

### Supported Languages (Auto-Translate)

- Russian (ru)
- Ukrainian (uk)
- Arabic (ar)
- Hebrew (he)
- Chinese (zh)
- Persian/Farsi (fa)
- Korean (ko)

### Translation Providers

| Provider | Pros | Cons |
|----------|------|------|
| **Google Translate** | Best quality, most languages | Requires API key, costs |
| **DeepL** | Excellent for European languages | Limited language support |
| **LibreTranslate** | Free, self-hostable | Lower quality, may be slow |

---

## Frontend Usage

The `TelegramFeedPanel` component displays messages with:
- Channel grouping (collapsible)
- Category and language filters
- Translation toggle (show original/translated)
- Sentiment indicators
- Entity badges (locations, organizations)
- View and forward counts
- Auto-refresh (30 seconds)

```tsx
import { TelegramFeedPanel } from '@/features/feeds';

function Dashboard() {
  return (
    <TelegramFeedPanel
      projectId="your-project-id"
      onMessageClick={(message) => console.log(message)}
      onLocationClick={(lat, lng, name) => flyToLocation(lat, lng)}
      maxHeight="600px"
    />
  );
}
```

---

## Recommended OSINT Channels

> **Disclaimer:** Channel recommendations are for research purposes. Always verify information from multiple sources.

### Conflict Monitoring
- Military blogger channels (region-specific)
- OSINT aggregator channels
- Aviation/military spotter channels

### Government/Official
- Ministry of Defense channels
- Emergency services
- Local government channels

### News
- Regional news aggregators
- Breaking news bots
- Journalist channels

---

## Security Considerations

1. **Dedicated Account**: Use a Telegram account solely for OSINT, not your personal account

2. **Session Security**: The session string grants full account access
   - Never commit to git (add to `.gitignore`)
   - Store in secure environment variables
   - Rotate periodically

3. **Rate Limiting**: The worker enforces 1 job per 5 seconds to avoid Telegram bans

4. **IP Considerations**: Telegram may flag unusual access patterns
   - Use consistent IP addresses
   - Avoid VPNs that frequently change IPs

5. **Content Filtering**: Some channels may contain graphic content
   - Implement content warnings in UI
   - Consider filtering sensitive media

---

## Troubleshooting

### Session Expired
```
Error: Session expired or invalid
```
**Solution:** Regenerate the session string using the setup script.

### Rate Limited
```
Error: FloodWaitError: A wait of X seconds is required
```
**Solution:** The worker handles this automatically with backoff. If persistent, reduce fetch frequency.

### Channel Not Found
```
Error: Channel not found: @example
```
**Solution:** Verify the channel exists and is public. Private channels require invitation.

### MTProto Connection Failed
```
Error: Failed to initialize MTProto client
```
**Solutions:**
- Verify API ID and Hash are correct
- Check network connectivity to Telegram servers
- Try regenerating session string

### Translation Errors
```
Error: Google Translate API error
```
**Solutions:**
- Verify API key is valid
- Check API quota/billing
- System will automatically fall back to other providers

---

## API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/:id/feeds/telegram/messages` | List messages with filters |
| GET | `/projects/:id/feeds/telegram/channels` | List monitored channels |
| POST | `/projects/:id/feeds/telegram/channels` | Add a channel |
| PATCH | `/projects/:id/feeds/telegram/channels/:channelId` | Update channel |
| DELETE | `/projects/:id/feeds/telegram/channels/:channelId` | Remove channel |
| GET | `/projects/:id/feeds/telegram/stats` | Project statistics |
| POST | `/projects/:id/feeds/telegram/fetch` | Trigger manual fetch |

### Query Parameters (Messages)

| Parameter | Type | Description |
|-----------|------|-------------|
| `channelIds` | string | Comma-separated channel IDs |
| `categories` | string | Comma-separated categories |
| `languages` | string | Comma-separated language codes |
| `dateFrom` | ISO date | Start date filter |
| `dateTo` | ISO date | End date filter |
| `search` | string | Text search |
| `sentiment` | string | `negative`, `neutral`, `positive` |
| `hasTranslation` | boolean | Filter by translation presence |
| `hasMedia` | boolean | Filter by media presence |
| `minViews` | number | Minimum view count |
| `limit` | number | Results per page (default: 50) |
| `offset` | number | Pagination offset |
| `sortBy` | string | `date`, `views`, `sentiment` |
| `sortOrder` | string | `asc`, `desc` |
