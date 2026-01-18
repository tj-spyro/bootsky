# Bootsky

A client-side Next.js application for managing your Bluesky follows. Filter the accounts you follow by avatar presence, original posts count, and media posts count.

## Features

- 🔐 Secure login with Bluesky app password
- 📊 View all accounts you follow
- 🎨 Filter by:
  - Accounts without avatars
  - Minimum original posts count (non-reposts, non-replies)
  - Minimum media posts count (images/videos)
- 🌐 Fully client-side - no backend required
- 📱 Responsive design

## Getting Started

### Development

First, install dependencies:

```bash
npm install
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

```bash
npm run build
```

This will create a static export in the `out` directory suitable for GitHub Pages deployment.

## Usage

1. **Login**: Enter your Bluesky handle and app password
   - Generate an app password at: Settings → Privacy and security → App passwords
2. **View Follows**: The app will load all accounts you follow
3. **Apply Filters**: Use the filter controls to narrow down the list:
   - Check "No Avatar" to show only accounts without profile pictures
   - Set "Min Original Posts" to filter by original content count
   - Set "Min Media Posts" to filter by media content count

## Technology Stack

- **Next.js 16** - React framework with static export
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Utility-first styling
- **@atproto/api** - Bluesky/AT Protocol client library

## Deployment

This app is configured for GitHub Pages deployment. The GitHub Actions workflow automatically builds and deploys the app when you push to the main branch.

## Privacy & Security

- All authentication happens client-side
- Your credentials are never stored or sent to any third-party servers
- The app only communicates with Bluesky's official API (bsky.social)

## License

MIT
