const fs = require('fs');
const ical = require('node-ical');

const ICAL_URL = process.env.ICAL_URL;

async function sync() {
  try {
    const events = await ical.async.fromURL(ICAL_URL);
    const cleanEvents = [];
    const now = new Date();
    const windowEnd = new Date();
    windowEnd.setDate(now.getDate() + 60); // Generates next 60 days of events

    for (const id in events) {
      const event = events[id];
      if (event.type !== 'VEVENT') continue;

      if (event.rrule) {
        const duration = new Date(event.end) - new Date(event.start);
        const dates = event.rrule.between(now, windowEnd);

        dates.forEach(date => {
          cleanEvents.push({
            id: `${event.uid}_${date.toISOString()}`,
            title: event.summary || 'Busy',
            start: date,
            end: new Date(date.getTime() + duration),
            location: event.location || ''
          });
        });
      } else {
        cleanEvents.push({
          id: event.uid,
          title: event.summary || 'Busy',
          start: event.start,
          end: event.end,
          location: event.location || ''
        });
      }
    }

    fs.writeFileSync('events.json', JSON.stringify(cleanEvents, null, 2));
  } catch (err) {
    console.error('Failed to sync iCal feed:', err);
    process.exit(1);
  }
}

sync();
