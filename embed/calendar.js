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
    return list.map(e => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      allDay: (e.start && e.start.endsWith('T00:00:00.000Z')),
      extendedProps: { location: e.location }
    }));
  }

 function renderEventList(list){
    const container = document.getElementById('event-list');
    container.innerHTML = '<h2>Upcoming</h2>';
    // show only future events and sort so the soonest event is first
    const now = new Date();
    const upcoming = list
      .filter(e => {
        try { return new Date(e.start) >= now; }
        catch { return false; }
      })
      .sort((a,b) => new Date(a.start) - new Date(b.start));

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
      const start = new Date(e.start);
      const end = e.end ? new Date(e.end) : null;
      const dateStr = start.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'}) + (end ? ' — ' + end.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'}) : '');
      meta.textContent = dateStr + (e.location ? ' · ' + e.location : '');
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
          const start = info.event.start ? info.event.start.toLocaleString() : '';
          const end = info.event.end ? info.event.end.toLocaleString() : '';
          const when = start + (end ? ' — ' + end : '');
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
