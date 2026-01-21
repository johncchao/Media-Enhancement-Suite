# Media-Enhancement-Suite


A professional Tampermonkey userscript for auditing web media assets and CDN distribution.

## Features

- **Asset Detection**: Automatically scans `<video>` and `<audio>` elements with detailed metadata
- **Debug Panel**: Draggable, collapsible UI dashboard on the right side
- **Announcement Service**: Fetches team updates from your remote server via `GM_xmlhttpRequest`
- **Developer Console**: Comprehensive logging for debugging CDN and HLS streams

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/)
2. Create new script and paste `media-enhancement-suite.user.js`
3. Configure `@match` for your target domain
4. Set `MESSAGE_SERVICE_URL` to your announcement server
5. Save and reload your page

## Configuration

```javascript
const CONFIG = {
    MESSAGE_SERVICE_URL: 'https://your-server.com/api/announcements.json',
    REFRESH_INTERVAL: 300000, // 5 minutes
};
```

### Announcement JSON Format

```json
{
  "announcements": [
    {
      "title": "Update Title",
      "message": "Your message here",
      "timestamp": "2026-01-21 10:00:00"
    }
  ]
}
```

## Usage

- **Refresh Assets**: Click the refresh button in the panel
- **Toggle Panel**: Click "−" to minimize/maximize
- **Move Panel**: Drag the header to reposition
- **Console Logs**: Open DevTools (F12) to see detailed asset information

## Asset Information

Each media element displays:
- Source URL and alternative sources
- Ready State (HAVE_METADATA, HAVE_ENOUGH_DATA, etc.)
- Network State (LOADING, IDLE, etc.)
- Duration and dimensions (video only)

## Privacy & Security

- All processing happens locally in your browser
- No data collection or external tracking
- Runs only on specified domains
- You control the announcement server

## Development

Modular architecture with clean separation:
- `StateManager`: Local storage and state persistence
- `MediaAssetScanner`: DOM scanning and asset extraction
- `MessageService`: Remote announcement fetching
- `UIController`: Panel rendering and interactions

## Troubleshooting

**Panel not showing**: Check Tampermonkey is enabled and `@match` rule is correct

**No announcements**: Verify `MESSAGE_SERVICE_URL` and server CORS settings

**Assets not detected**: Ensure media elements are loaded, click refresh button

## License

MIT License - Free to use and modify

