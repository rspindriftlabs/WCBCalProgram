WCB Calendar UI

This folder contains a small embeddable calendar UI that reads events from events.json in the repository.

Files:
- index.html — the embeddable page (uses FullCalendar)
- style.css — basic styles
- calendar.js — fetches events.json and initializes the calendar + a simple upcoming list

Usage
1. Open embed/index.html in a browser (it loads events.json from GitHub's raw URL). For production, consider serving these files from GitHub Pages or your own web host.

2. To embed into another site, use an iframe. Example:

<iframe src="https://rspindriftlabs.github.io/WCBCalProgram/embed/index.html" style="width:100%;height:700px;border:0" title="WCB Events"></iframe>

Notes
- The UI fetches: https://raw.githubusercontent.com/rspindriftlabs/WCBCalProgram/main/events.json
- The repository workflow you already have updates events.json on schedule. The UI adds a cache-busting query string to reduce stale CDN caching.
- If you prefer direct JSON hosting with a custom domain, enable GitHub Pages for the repo and update the iframe src to the Pages URL.
