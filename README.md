# WCB Calendar Embed

Static calendar HTML embed for WCB project that fetches events from an iCal URL. No server hosting required!

## Features

- Fetch events from iCal/ICS calendar feeds
- Display calendar in HTML format
- Fully embeddable widget for websites
- Zero backend required - runs entirely in the browser
- Responsive design (mobile & desktop)
- Light/dark theme support
- Event filtering and sorting

## Setup

### Prerequisites

- An iCal calendar URL (from Google Calendar, Outlook, Nextcloud, etc.)
- A web server to host the HTML files (GitHub Pages, Netlify, Vercel, etc.)

### Getting Your iCal URL

**Google Calendar:**
1. Open Google Calendar
2. Right-click the calendar → Settings
3. Scroll to "Integrate calendar" section
4. Copy the **Public URL** (ends with `.ics`)
5. Or generate a private link: Settings → Calendar ID, use format:
   ```
   https://calendar.google.com/calendar/ical/{CALENDAR_ID}/public/basic.ics
   ```

**Other Calendars (Outlook, Apple, Nextcloud, etc.):**
- Most provide an "Export" or "Subscribe" option with an `.ics` or iCal URL

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/rspindriftlabs/WCBCalendar.git
   cd WCBCalendar
   ```

2. No dependencies or build step needed!

## Project Structure

```
├── index.html              # Main calendar page
├── embed.html              # Embeddable calendar widget
├── js/
│   └── calendar.js         # Calendar widget JavaScript
├── css/
│   └── styles.css          # Calendar styles
└── README.md               # This file
```

## Usage

### Option 1: Standalone Calendar Page

1. Edit `index.html` and replace the iCal URL:
   ```html
   <script>
     WCBCalendar.init({
       icalUrl: 'YOUR_ICAL_URL_HERE',
       elementId: 'wcb-calendar',
       theme: 'light'
     });
   </script>
   ```

2. Open `index.html` in a browser or deploy to GitHub Pages

### Option 2: Embed on Your Website

Add this to any website's HTML:

```html
<!-- Add container -->
<div id="wcb-calendar"></div>

<!-- Load the calendar widget -->
<link rel="stylesheet" href="https://your-domain.com/css/styles.css">
<script src="https://your-domain.com/js/calendar.js"></script>

<!-- Initialize -->
<script>
  WCBCalendar.init({
    icalUrl: 'YOUR_ICAL_URL_HERE',
    elementId: 'wcb-calendar',
    theme: 'light',
    maxEvents: 10
  });
</script>
```

### Configuration Options

```javascript
WCBCalendar.init({
  icalUrl: 'https://calendar.google.com/calendar/ical/...', // Required: iCal URL
  elementId: 'wcb-calendar',      // Element ID to render into
  theme: 'light',                 // 'light' or 'dark'
  maxEvents: 10,                  // Max events to display
  daysAhead: 30,                  // Show events within N days
  showPastEvents: false,          // Include past events
  timeZone: 'UTC'                 // Timezone for display
});
```

## Deployment Options (Free)

### GitHub Pages (Easiest)

1. Push your code to GitHub
2. Go to **Settings** → **Pages**
3. Select **Deploy from a branch** → **main**
4. Your site will be live at `https://username.github.io/WCBCalendar/`

### Netlify (Recommended)

1. Drag & drop the folder to [netlify.com](https://netlify.com)
2. Custom domain support
3. Auto-deploys on push to GitHub

### Vercel

1. Connect your GitHub repo
2. Auto-deploys on every push
3. Free HTTPS and custom domains

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Limitations

- **CORS**: The iCal URL must allow cross-origin requests. If you get CORS errors, use a CORS proxy:
  ```javascript
  icalUrl: 'https://cors-anywhere.herokuapp.com/YOUR_ICAL_URL'
  ```

- **Calendar Size**: Best for calendars with <500 events
- **Real-time Updates**: Caches events for 1 hour (configurable)

## Troubleshooting

### "Failed to fetch calendar"
- Verify the iCal URL is correct and publicly accessible
- Check browser console for CORS errors
- Try using a CORS proxy if needed

### Events not showing
- Ensure the iCal URL returns valid `.ics` format
- Check that events are within the date range (default: 30 days ahead)
- Verify time zone settings

### Styling issues
- Clear browser cache
- Check that CSS file is loading (inspect Network tab)

## License

MIT

## Support

For issues or feature requests, open an issue on GitHub.
