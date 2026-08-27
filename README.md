# WCB Calendar Embed

Calendar HTML embed for WCB project that fetches events from Google Calendar API.

## Features

- Fetch events from Google Calendar API
- Display calendar in HTML format
- Embeddable widget for websites
- Support for multiple calendar sources
- Responsive design

## Setup

### Prerequisites

- Node.js 16+
- Google Calendar API credentials

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (see `.env.example`)

4. Start the development server:
   ```bash
   npm start
   ```

## Project Structure

```
├── src/
│   ├── server.js           # Express server
│   ├── googleCalendar.js   # Google Calendar API integration
│   ├── calendar.js         # Calendar logic
│   └── public/
│       ├── embed.html      # Embeddable calendar widget
│       ├── embed.js        # Calendar widget JavaScript
│       └── embed.css       # Calendar widget styles
├── .env.example            # Environment variables template
└── package.json            # Project dependencies
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your Google Calendar API credentials:

```
GOOGLE_CALENDAR_API_KEY=your_api_key
GOOGLE_CALENDAR_ID=your_calendar_id@gmail.com
PORT=3000
```

## Usage

### Embed in Website

Add this to your website's HTML:

```html
<div id="wcb-calendar"></div>
<script src="https://your-domain.com/embed.js"></script>
<script>
  WCBCalendar.init({
    elementId: 'wcb-calendar',
    calendarId: 'your-calendar@gmail.com'
  });
</script>
```

## API Endpoints

- `GET /api/events` - Get calendar events
- `GET /embed.js` - Get embeddable script
- `GET /api/events/:calendarId` - Get events for specific calendar

## License

MIT
