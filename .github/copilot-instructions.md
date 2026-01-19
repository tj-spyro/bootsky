# Bootsky - Copilot Instructions

## Project Overview
Bootsky is a **fully client-side** Next.js application for managing Bluesky follows. It's configured for GitHub Pages deployment with static export (`output: 'export'` in [next.config.ts](../next.config.ts)).

## Architecture & Key Patterns

### Service Layer Structure (`src/lib/`)
The codebase follows a clear separation of concerns with three core libraries:

- **[api.ts](../src/lib/api.ts)**: Singleton `AtpAgent` instance configured for `bsky.social`
- **[bluesky.ts](../src/lib/bluesky.ts)**: All AT Protocol interactions (fetching follows, profiles, feed analysis)
- **[cache.ts](../src/lib/cache.ts)**: Session storage cache with 30-min TTL and quota management

### Data Flow
1. **Authentication**: Client-side login via `AtpAgent.login()` with app password
2. **Fetch Follows**: Paginated `getFollows()` calls → cached by actor DID
3. **Enrich Profiles**: Batch `getProfiles()` (25 DIDs/chunk) → cached individually
4. **Analyze Activity**: For each profile, fetch full `getAuthorFeed()` to compute:
   - `originalPostsCount`: Non-repost, non-reply posts
   - `mediaPostsCount`: Posts with images, videos, or record-with-media embeds
   - `hasAvatar`: Boolean presence check

### Caching Strategy
All API responses are cached in session storage with typed keys:
```typescript
`boot-sky-cache:${type}:${handle.toLowerCase()}`
// Types: "following" | "profile" | "profile-stats"
```
- Quota exceeded errors trigger automatic expired entry cleanup
- Cache checks happen before every API call in [bluesky.ts](../src/lib/bluesky.ts)

## Critical Implementation Details

### Batch Processing
API calls use 25-item chunks for `getProfiles()` to respect rate limits while maintaining performance ([bluesky.ts](../src/lib/bluesky.ts#L24-L30)).

### Media Detection
Media posts are identified by checking embed types:
```typescript
AppBskyEmbedImages.isView(embed) ||
AppBskyEmbedVideo.isView(embed) ||
AppBskyEmbedRecordWithMedia.isView(embed)
```

### Image Handling
Next.js Image component uses `unoptimized: true` because static export doesn't support image optimization. External Bluesky avatars load without domain restrictions.

## Component Structure
Single-page app with all logic in [BootSky.tsx](../src/components/BootSky.tsx):
- Login form (unauthenticated state)
- Filter controls + profile grid (authenticated state)
- Client-side filtering via React state (no backend queries)

## Development Commands
```bash
npm run dev      # Local dev server on :3000
npm run build    # Static export to out/ with basePath /bootsky
npm run lint     # ESLint (flat config in eslint.config.mjs)
```

## GitHub Pages Configuration
- `basePath: '/bootsky'` in [next.config.ts](../next.config.ts) for repo-level deployment
- GitHub Actions workflow handles build/deploy on push to main

## Dependencies
- `@atproto/api`: Bluesky/AT Protocol SDK - use typed exports from `AppBskyActorDefs`, `AppBskyFeedDefs`, etc.
- Next.js 16 + React 19 with TypeScript strict mode
- Tailwind CSS v4 with PostCSS

## Privacy Design
All authentication and API calls happen client-side. No backend server exists or should be added without explicit user consent.
