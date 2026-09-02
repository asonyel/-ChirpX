# Chirpx Media Pipeline

## Current production architecture

1. Browser uploads source video resumably to the private `chirpx-media` Supabase Storage bucket using TUS.
2. Chirpx creates the `clips` row with `uploaded` processing state.
3. The authenticated `media-dispatch` Supabase Edge Function verifies ownership, creates a short-lived signed source URL, and submits the source to Mux Video for adaptive transcoding plus auto-generated captions.
4. Mux sends signed webhook events to `mux-webhook`.
5. `video.asset.ready` updates the Clip with the Mux asset/playback IDs, marks adaptive streaming ready, records the thumbnail URL, and runs sampled-frame moderation when OpenAI credentials are configured.
6. `video.asset.track.ready` records the generated caption track, reruns moderation using transcript text plus sampled frames, and creates configured subtitle translations.
7. The Clips UI uses Mux Player for adaptive HLS playback when a Mux playback ID is available and falls back to the private source-video URL only before transcoding is complete.

The web player is pinned to `@mux/mux-player-react@3.13.2`, and the synchronized npm lockfile records the complete HLS/player dependency graph with integrity hashes.

## Required production secrets

Set these only in Supabase Edge Function Secrets. Never expose them in `NEXT_PUBLIC_*`, source code, GitHub, or client-side JavaScript.

- `MUX_TOKEN_ID`
- `MUX_TOKEN_SECRET`
- `MUX_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `CHIRPX_TRANSLATION_LANGUAGES` (optional; default `es,fr,pt`)

Supabase automatically provides the project URL and server-side API credentials to Edge Functions.

## Mux webhook

Configure the Mux production environment to send webhooks to:

`https://vfqeosnclfdvmzilcgrv.supabase.co/functions/v1/mux-webhook`

The webhook must remain unauthenticated at the Supabase gateway because Mux does not send a Supabase JWT. The function instead verifies the raw request using the `mux-signature` HMAC-SHA256 header and `MUX_WEBHOOK_SECRET`, including a five-minute timestamp tolerance. Duplicate provider events are recorded and ignored idempotently.

## Moderation design

The current moderation gate samples multiple Mux thumbnails across the video and combines those images with the creator caption. When generated captions become ready, the transcript is added and moderation runs again. OpenAI `omni-moderation-latest` is used for text + image moderation. This is a production first-stage gate, not frame-by-frame forensic review; higher-risk or flagged content should later enter a human-review queue and/or a dedicated full-video safety provider.

## Translation design

Mux auto-generates the source subtitle track. Chirpx retrieves the WebVTT track, translates it with `gpt-5.6-luna` while preserving cue timestamps, stores each translated VTT privately in Supabase Storage, and registers it back on the Mux asset as a subtitle track.

## Operational invariants

- Source videos remain private in Supabase Storage.
- Mux and OpenAI secrets are server-only.
- Client users cannot write worker/provider results.
- Mux webhooks are signature verified and deduplicated.
- A provider failure must move the relevant job to `failed`; it must not silently mark a Clip ready.
- The current live WordPress site is not part of this pipeline and remains untouched.
