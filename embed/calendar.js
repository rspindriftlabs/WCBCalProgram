// Simple calendar loader for events.json
(function(){
  const EVENTS_URL = 'https://raw.githubusercontent.com/rspindriftlabs/WCBCalProgram/main/events.json';

  async function fetchEvents(){
    // Cache-bust to reduce stale CDN responses
    const res = await fetch(EVENTS_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if(!res.ok) throw new Error('Failed to load events.json: ' + res.status);
    return res.json();
  }

  function toFullCalendarEvents(list){
    return list.map(e => {
      // Determine whether this should be treated as an all-day event by
      // checking the local (viewer) wall-clock time. Previously we treated
      // any UTC midnight as all-day which mis-classified events that were
      // stored in GMT but actually represent an evening time in CT.
      let isAllDay = false;
      let start = e.start;
      let end = e.end;

      if (e.start) {
        try {
          const startDate = new Date(e.start);
          const h = startDate.getHours();
          const m = startDate.getMinutes();
          const s = startDate.getSeconds();
          // If in the viewer's local timezone the time is exactly midnight,
          // consider it an all-day event and pass only the date part to FullCalendar.
          if (h === 0 && m === 0 && s === 0 && /T00:00:00/.test(e.start)) {
            isAllDay = true;
            start = e.start.split('T')[0];
            end = e.end ? e.end.split('T')[0] : null;
          }
        } catch (err) {
          // malformed date string, fall back to original behavior
          isAllDay = e.start && e.start.endsWith('T00:00:00.000Z');
          if (isAllDay) {
            start = e.start.split('T')[0];
            end = e.end ? e.end.split('T')[0] : null;
          }
        }
      }

      return {
        id: e.id,
        title: e.title,
        start: start,
        end: end,
        allDay: isAllDay,
        extendedProps: { location: e.location }
      };
    });
  }

  function renderEventList(list){
    const container = document.getElementById('event-list');
    container.innerHTML = '<h2>Upcoming</h2>';
    // show only future events and sort so the soonest event is first
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const upcoming = list
      .filter(e => {
        try {
          // Use the viewer-local date for comparison to avoid timezone issues
          const eventStartDate = new Date(e.start);
          const eventDateOnly = new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate());
          return eventDateOnly >= today;
        }
        catch { return false; }
      })
      .sort((a,b) => {
        const dateA = new Date(a.start);
        const dateB = new Date(b.start);
        return dateA - dateB;
      });

    if(!upcoming.length){ container.innerHTML += '<p>No upcoming events</p>'; return }

    const maxEvents = 5;
    const limitedList = upcoming.slice(0, maxEvents);

    limitedList.forEach(e => {
      const div = document.createElement('div');
      div.className = 'event-item';
      const title = document.createElement('div');
      title.className = 'event-title';
      title.textContent = e.title;
      const meta = document.createElement('div');
      meta.className = 'event-meta';

      // Build display dates using the viewer-local Date so times show up correctly
      let startDateObj, endDateObj;
      if (e.start && !e.start.includes('T')) {
        // date-only string (YYYY-MM-DD) -> construct local date to avoid timezone shifts
        const [y,m,d] = e.start.split('-').map(Number);
        startDateObj = new Date(y, m-1, d);
      } else {
        startDateObj = new Date(e.start);
      }

      if (e.end) {
        if (!e.end.includes('T')) {
          const [y,m,d] = e.end.split('-').map(Number);
          endDateObj = new Date(y, m-1, d);
        } else {
          endDateObj = new Date(e.end);
        }
      } else {
        endDateObj = null;
      }

      const dateDisplay = startDateObj.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'})
        + (endDateObj && (endDateObj.getFullYear() !== startDateObj.getFullYear() || endDateObj.getMonth() !== startDateObj.getMonth() || endDateObj.getDate() !== startDateObj.getDate()) ? ' — ' + endDateObj.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'}) : '');

      meta.textContent = dateDisplay + (e.location ? ' · ' + e.location : '');
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
        events: events,
        eventDidMount: info => {
          if (info.event.extendedProps.location) {
            info.el.title = info.event.extendedProps.location;
          }
        },
        // improve accessibility: announce when events are focused
        eventClick: info => {
          // show simple alert with details (replace with modal if desired)
          const loc = info.event.extendedProps.location || 'No location';
          const start = info.event.start ? info.event.start.toDateString() : '';
          const end = info.event.end ? info.event.end.toDateString() : '';
          const when = start + (end && end !== start ? ' — ' + end : '');
          alert(`${info.event.title}\n${when}\n${loc}`);
        }
      });
      calendar.render();

      // render list
      renderEventList(raw);

    }catch(err){
      console.error(err);
      const el = document.getElementById('calendar');
      el.innerHTML = '<p style="color:#900;padding:16px">Failed to load calendar data.</p>';
      const list = document.getElementById('event-list');
      list.innerHTML = '<p style="color:#900">Failed to load events.</p>';
    }
  }

  // init on DOM ready
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
