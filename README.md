# Bible Memory PWA

A Progressive Web App for memorizing Bible verses, built with Vue.js and Tailwind CSS.

## Features

- View your list of saved verses
- Add new verses with reference and content
- Data persists in local storage
- PWA support for offline use
- CSV import
- WebDAV sync
- Hosted at https://bible-memory.unrau.xyz

## To Do
- [x] Add a better app icon
- [ ] Make the verse review screen automatically scroll as you're typing out long verses

## Wishlist
### Verse Review
- [x] Fuzzy typing: typing a letter near the correct letter should count as correct (for mobile use)
- [x] Vibrate if I get a word wrong
- [x] If I get a word wrong, still reveal the next word but make the text red
- [x] Minimum 90% accuracy in order to count as being reviewed. If I get less than 80% accuracy, change what the modal says, and make retry the primary call to action. 
- [x] Show my accuracy and all that on the modal that popups up after reviewing the verse, instead of on the screen where I'm typing

### Other
- [x] backup and import
- [x] Two way sync with a webdav folder. Sync on every change of anything. When I connect a blank copy of the app to a webdav folder that already has bible memory data in it, import everything.
- [x] Set bible version on the verse
- [x] Installable PWA
- [ ] Search for a verse by reference





## How to import form biblememory.com
1. Use brave browser and open the collection you want to import via the web page.
2. Open leo AI and use this prompt to conver the collection to CSV.
```
For the list of verses on this page, export to CSV. Map it to columns as follows

- Verse reference -> "Reference"
- Verse content -> "Content" (put quotations around the verse content)
- Bible version -> "Version" (OTHER is BSB)
- Due in x days -> "DaysUntilNextReview" (only add the number e.g., 54)
- Review every x months -> "Interval" (only add the number, and convert to number of days)

Then combine all the verses into one verse and rename the reference to reflect that it's now a range of verses. For example Philippians 1:3-5

```

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

## Hosting with Docker Compose

This app can be hosted using Docker Compose, which includes both the application and a WebDAV proxy server.

### Prerequisites

- Docker and Docker Compose installed on your server
- A Nextcloud (or other WebDAV) server URL

### Initial Setup

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd bible-memory
   ```

2. **Configure the WebDAV proxy**:
   Edit `docker-compose.yml` and update the `NEXTCLOUD_URL` environment variable in the `webdav-proxy` service:
   ```yaml
   environment:
     - PROXY_PORT=3001
     - NEXTCLOUD_URL="https://your-nextcloud.com/remote.php/dav/files/username"
   ```

3. **Build and start the services**:
   ```bash
   docker-compose up -d --build
   ```

4. **Verify the services are running**:
   ```bash
   docker-compose ps
   ```

The application will be available at `http://localhost:1234` (or your server's IP address).

### Updating After Pulling New Code

When you pull new code from git, you need to rebuild and restart the containers:

1. **Pull the latest code**:
   ```bash
   git pull
   ```

2. **Rebuild and restart the containers**:
   ```bash
   docker-compose up -d --build
   ```

   This command will:
   - Rebuild the Docker images with the new code
   - Restart the containers with the updated images
   - Run in detached mode (`-d`) so it continues running in the background

3. **Verify the update**:
   ```bash
   docker-compose ps
   docker-compose logs bible-memory
   ```

### Useful Docker Compose Commands

- **View logs**:
  ```bash
  docker-compose logs -f bible-memory
  docker-compose logs -f webdav-proxy
  ```

- **Stop the services**:
  ```bash
  docker-compose down
  ```

- **Restart without rebuilding**:
  ```bash
  docker-compose restart
  ```

- **View running containers**:
  ```bash
  docker-compose ps
  ```

### Troubleshooting

- If the app doesn't load, check the logs: `docker-compose logs bible-memory`
- If the WebDAV sync isn't working, check the proxy logs: `docker-compose logs webdav-proxy`
- To completely reset (removes containers and volumes):
  ```bash
  docker-compose down -v
  docker-compose up -d --build
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
