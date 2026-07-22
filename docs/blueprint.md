# Photify AI — Bot specification

**Archetype:** custom

**Voice:** creative and friendly — write every user-facing message, button label, error, and empty state in this voice.

Transforms user selfies into photorealistic fashion portraits with curated AI styles. Offers freemium access, subscription tiers, and video output. Focuses on fashion editorial/runway styles with optional custom prompts and variations.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- general consumers
- social media users
- influencers

## Success criteria

- Users generate and share 1M+ fashion portraits monthly
- 30% conversion from free to Pro/Lifetime plans
- 95% user satisfaction with generated image quality

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu with welcome message and selfie upload button
- **Upload Selfie** (button, actor: user, callback: upload:start) — Initiates selfie upload flow
  - inputs: image file
  - outputs: image validation confirmation
- **See My Assets** (button, actor: user, callback: assets:list) — Displays recent generated assets (images/videos)

## Flows

### Selfie to Fashion Portrait
_Trigger:_ /start or Upload button

1. Welcome message with upload button
2. Image validation and confirmation
3. Style category selection (Fashion primary)
4. Credit cost display and confirmation
5. Generation progress updates
6. Asset delivery with download/share options

_Data touched:_ User, Upload, Job, Asset

### Variation Requests
_Trigger:_ Variations button on asset

1. Display credit cost
2. Confirm request
3. Generate variations
4. Deliver new assets

_Data touched:_ Job, Asset

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram account metadata and preferences
  - fields: telegram_id, credit_balance, plan_type, recent_jobs
- **Upload** _(retention: persistent)_ — User-submitted selfie with validation metadata
  - fields: image_hash, timestamp, validation_status
- **Job** _(retention: persistent)_ — Generation request with style parameters
  - fields: style_category, custom_prompt, options
- **Asset** _(retention: session)_ — Generated image/video output
  - fields: file_id, format, watermark_status
- **Plan** _(retention: persistent)_ — User subscription tier and access rights
  - fields: plan_type, expiry_date, priority_queue

## Integrations

- **Telegram** (required) — Bot API messaging and media delivery
- **Payment Provider** (required) — Subscription and credit purchases
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Admin notifications for errors/abuse/purchases
- Content moderation tools for policy violations

## Notifications

- Admin alerts for system errors
- User notifications for job completion
- Abuse reports for policy violations

## Permissions & privacy

- Enforce no-impersonation policy for generated content
- Auto-delete assets after 30 days
- Restrict public figure impersonation without consent

## Edge cases

- Invalid image formats during upload
- Insufficient credits for generation
- Style category presets exceeding content policy

## Required tests

- End-to-end generation flow with Pro plan access
- Watermark application on free-tier outputs
- Asset deletion after 30-day retention period

## Assumptions

- Fashion category is primary focus for initial launch
- Single selfie input ensures face consistency
- 4-image default output balances quality and cost
