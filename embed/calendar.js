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
      // For all-day events stored as UTC midnight, convert to local date only
      const isAllDay = e.start && e.start.endsWith('T00:00:00.000Z');
      let start = e.start;
      let end = e.end;
      
      if (isAllDay) {
        // Extract just the date part and FullCalendar will treat it as all-day
        start = e.start.split('T')[0];
        end = e.end ? e.end.split('T')[0] : null;
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
    const upcoming = list
      .filter(e => {
        try { 
          // Use the date part for comparison to avoid timezone issues
          const eventStart = e.start.split('T')[0];
          const eventDate = new Date(eventStart);
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          return eventDate >= today; 
        }
        catch { return false; }
      })
      .sort((a,b) => {
        const dateA = a.start.split('T')[0];
        const dateB = b.start.split('T')[0];
        return new Date(dateA) - new Date(dateB);
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
      const dateStr = e.start.split('T')[0];
      const endDateStr = e.end ? e.end.split('T')[0] : null;
      const startDate = new Date(dateStr);
      const endDate = endDateStr ? new Date(endDateStr) : null;
      const dateDisplay = startDate.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'}) + (endDate && endDateStr !== dateStr ? ' — ' + endDate.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'}) : '');
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
