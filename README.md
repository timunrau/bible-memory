# Bible Memory PWA

## Wishlist
### Verse Review
- [x] Fuzzy typing: typing a letter near the correct letter should count as correct (for mobile use)
- [ ] Show a heatmap that shows a faint red background behind words that I have commonly missed. 
- [x] Vibrate if I get a word wrong
- [x] If I get a word wrong, still reveal the next word but make the text red
- [x] Minimum 90% accuracy in order to count as being reviewed. If I get less than 80% accuracy, change what the modal says, and make retry the primary call to action. 
- [ ] Show my accuracy and all that on the modal that popups up after reviewing the verse, instead of on the screen where I'm typing

### Other
- [x] backup and import
- [x] Two way sync with a webdav folder. Sync on every change of anything. When I connect a blank copy of the app to a webdav folder that already has bible memory data in it, import everything.
- [x] Set bible version on the verse
- [x] Installable PWA


A Progressive Web App for memorizing Bible verses, built with Vue.js and Tailwind CSS.

## Features

- View your list of saved verses
- Add new verses with reference and content
- Data persists in local storage
- PWA support for offline use

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Technologies

- Vue.js 3
- Tailwind CSS
- Vite
- PWA Plugin

## WebDAV Sync Setup

This app supports two-way sync with WebDAV servers (like Nextcloud).

### For Nextcloud (Development)

Due to CORS restrictions, you'll need to use a proxy server for development:

1. **Start the proxy server** with your Nextcloud URL:
   ```bash
   NEXTCLOUD_URL=https://your-nextcloud.com/remote.php/webdav npm run dev:proxy
   ```

2. **Or run both the app and proxy together**:
   ```bash
   NEXTCLOUD_URL=https://your-nextcloud.com/remote.php/webdav npm run dev:all
   ```

3. **In the app settings**:
   - Enter your Nextcloud URL (e.g., `https://your-nextcloud.com/remote.php/webdav`)
   - Enter your username and password
   - Check "Use CORS Proxy"
   - The proxy URL should be `http://localhost:3001` (default)

### For Production

For production, you'll need to either:
- Configure your WebDAV server to allow CORS requests
- Use a server-side proxy
- Deploy the app from the same origin as your WebDAV server
