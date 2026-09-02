// Simple calendar loader for events.json
(function(){
  const EVENTS_URL = 'https://raw.githubusercontent.com/rspindriftlabs/WCBCalProgram/main/events.json';
  const CENTRAL_TZ = 'America/Chicago';

  async function fetchEvents(){
    // Cache-bust to reduce stale CDN responses
    const res = await fetch(EVENTS_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if(!res.ok) throw new Error('Failed to load events.json: ' + res.status);
    return res.json();
  }

  // Helper: detect all-day (Google-style midnight UTC) and return date-only string
  function isAllDayISO(s){
    return typeof s === 'string' && /T00:00:00(?:\.\d{1,3})?Z$/.test(s);
  }

  function toFullCalendarEvents(list){
    return list.map(e => {
      const allDay = isAllDayISO(e.start) || (typeof e.start === 'string' && e.start.length === 10);

      // For all-day events, use date-only strings (YYYY-MM-DD).
      // For timed events, keep the full ISO string with timezone so FullCalendar can properly convert to Central time.
      let start;
      if(allDay){
        if(typeof e.start === 'string' && e.start.length > 10) start = e.start.slice(0,10); else start = e.start;
      } else {
        start = e.start; // Keep original ISO string with timezone info
      }

      let end;
      if(e.end){
        const endAllDay = isAllDayISO(e.end) || (typeof e.end === 'string' && e.end.length === 10);
        if(endAllDay){
          end = (typeof e.end === 'string' && e.end.length > 10) ? e.end.slice(0,10) : e.end;
        } else {
          end = e.end;
        }
      }

      return {
        id: e.id,
        title: e.title,
        start: start,
        end: end,
        allDay: !!allDay,
        extendedProps: { location: e.location }
      };
    });
  }

  // Parse an event date string for display and comparisons.
  function parseEventDateForDisplay(s){
    if(!s) return null;
    if(s instanceof Date) return s;
    if(isAllDayISO(s)){
      const dateOnly = s.slice(0,10);
      return new Date(dateOnly + 'T00:00:00');
    }
    if(typeof s === 'string' && s.length === 10){
      return new Date(s + 'T00:00:00');
    }
    // Parse ISO string properly - JavaScript's Date constructor handles timezones correctly (UTC instant)
    return new Date(s);
  }

  // Format a Date (an absolute instant) into Central Time date/time strings, DST-aware & accurate.
  function formatCentralDate(d){
    return d.toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric', timeZone: CENTRAL_TZ});
  }
  function formatCentralTime(d){
    return d.toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit', timeZone: CENTRAL_TZ});
  }

  function dateAddDays(d, days){
    const nd = new Date(d.getTime());
    nd.setDate(nd.getDate() + days);
    return nd;
  }

  function renderEventList(list){
    const container = document.getElementById('event-list');
    if(!container) return;
    container.innerHTML = '<h2>Upcoming</h2>';

    const now = new Date();

    // Only include events that haven't started yet (or are still ongoing
    // if they have an end date in the future), then sort ascending so the
    // soonest upcoming event appears at the very top.
    const upcoming = list.filter(e => {
      const end = e.end ? parseEventDateForDisplay(e.end) : parseEventDateForDisplay(e.start);
      return end && end >= now;
    });

    const sortedList = [...upcoming].sort((a, b) => parseEventDateForDisplay(a.start) - parseEventDateForDisplay(b.start));

    if(!sortedList.length){ container.innerHTML += '<p>No upcoming events</p>'; return }

    // Limit the rendering to the first N events
    const maxEvents = 8;
    const limitedList = sortedList.slice(0, maxEvents);

    limitedList.forEach(e => {
      const div = document.createElement('div');
      div.className = 'event-item';
      const title = document.createElement('div');
      title.className = 'event-title';
      title.textContent = e.title;
      const meta = document.createElement('div');
      meta.className = 'event-meta';

      const start = parseEventDateForDisplay(e.start);
      let end = e.end ? parseEventDateForDisplay(e.end) : null;

      let dateStr = '';
      if(e.allDay){
        // FullCalendar/Google often uses an exclusive end for all-day events (end = day after).
        // For display purposes, show the inclusive end date (subtract one day if end was provided).
        // All-day events are date-only (no timezone conversion needed).
        if(end){
          const displayEnd = dateAddDays(end, -1);
          const startStr = start.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'});
          const endStr = displayEnd.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'});
          dateStr = startStr === endStr ? startStr : (startStr + ' — ' + endStr);
        } else {
          dateStr = start.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'});
        }
      } else {
        // Timed events: always render in Central Time (CT), regardless of the viewer's local timezone,
        // so displayed times are accurate and never shift into an adjacent day incorrectly.
        const startStr = formatCentralDate(start) + ' ' + formatCentralTime(start) + ' CT';
        if(end){
          const endStr = formatCentralDate(end) + ' ' + formatCentralTime(end) + ' CT';
          dateStr = startStr + ' — ' + endStr;
        } else {
          dateStr = startStr;
        }
      }

      meta.textContent = dateStr + (e.extendedProps && e.extendedProps.location ? ' · ' + e.extendedProps.location : '');
      div.appendChild(title);
      div.appendChild(meta);
      container.appendChild(div);
    });
  }

  async function init(){
    try{
      const raw = await fetchEvents();
      const events = toFullCalendarEvents(raw);

      // render fullcalendar
      const calendarEl = document.getElementById('calendar');
      const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' },
        height: 'auto',
        // Use named, DST-aware Central timezone so event times displayed on the calendar
        // grid are always accurate Central Time.
        timeZone: CENTRAL_TZ,
        plugins: [ FullCalendar.MomentTimezonePlugin ? FullCalendar.MomentTimezonePlugin : undefined ].filter(Boolean),
        events: events,
        eventDidMount: info => {
          if (info.event.extendedProps.location) {
            info.el.title = info.event.extendedProps.location;
          }
        },
        // improve accessibility: announce when events are focused
        eventClick: info => {
          // show simple alert with details (replace with modal if desired), always in Central Time
          const loc = info.event.extendedProps.location || 'No location';
          let when = '';
          if (info.event.allDay) {
            const s = info.event.start ? info.event.start.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'}) : '';
            const en = info.event.end ? info.event.end.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'}) : '';
            when = s + (en ? ' — ' + en : '');
          } else {
            const s = info.event.start ? (formatCentralDate(info.event.start) + ' ' + formatCentralTime(info.event.start) + ' CT') : '';
            const en = info.event.end ? (formatCentralDate(info.event.end) + ' ' + formatCentralTime(info.event.end) + ' CT') : '';
            when = s + (en ? ' — ' + en : '');
          }
          alert(`${info.event.title}\n${when}\n${loc}`);
        }
      });
      calendar.render();

      // render list using the same event objects so allDay and timezone-stripping are consistent
      renderEventList(events);

    }catch(err){
      console.error(err);
      const el = document.getElementById('calendar');
      if(el) el.innerHTML = '<p style="color:#900;padding:16px">Failed to load calendar data.</p>';
      const list = document.getElementById('event-list');
      if(list) list.innerHTML = '<p style="color:#900">Failed to load events.</p>';
    }
  }

  // init on DOM ready
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
