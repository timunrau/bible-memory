# Bible Memory PWA

## Wishlist
### Verse Review
- [x] Fuzzy typing: typing a letter near the correct letter should count as correct (for mobile use)
- [ ] Show a heatmap that shows a faint red background behind words that I have commonly missed. 
- [ ] Vibrate if I get a word wrong
- [x] If I get a word wrong, still reveal the next word but make the text red
- [x] Minimum 90% accuracy in order to count as being reviewed. If I get less than 80% accuracy, change what the modal says, and make retry the primary call to action. 
- [ ] Show my accuracy and all that on the modal that popups up after reviewing the verse, instead of on the screen where I'm typing

### Other
- [ ] backup and import
- [ ] Two way sync with a webdav folder. Sync on every change of anything. When I connect a blank copy of the app to a webdav folder that already has bible memory data in it, import everything.
- [ ] Set bible version on the verse
- [ ] Installable PWA


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
