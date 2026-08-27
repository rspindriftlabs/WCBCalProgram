const googleCalendar = require('./googleCalendar');

/**
 * Get calendar data for a specific month
 * @param {Object} calendar - Google Calendar instance
 * @param {String} calendarId - Calendar ID
 * @param {Number} year - Year
 * @param {Number} month - Month (1-12)
 * @returns {Promise<Object>} Month calendar data with events
 */
async function getMonthCalendar(calendar, calendarId, year, month) {
  try {
    // Validate month
    if (month < 1 || month > 12) {
      throw new Error('Month must be between 1 and 12');
    }

    // Get first and last day of month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    const timeMin = firstDay.toISOString();
    const timeMax = new Date(lastDay.getTime() + 24 * 60 * 60 * 1000).toISOString();

    // Fetch events for the month
    const events = await googleCalendar.getEvents(calendar, {
      calendarId,
      timeMin,
      timeMax,
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime'
    });

    // Build calendar grid
    const calendarGrid = buildCalendarGrid(year, month, events);

    return {
      year,
      month,
      monthName: getMonthName(month),
      firstDay: firstDay.toISOString().split('T')[0],
      lastDay: lastDay.toISOString().split('T')[0],
      daysInMonth: lastDay.getDate(),
      startingDayOfWeek: firstDay.getDay(),
      events,
      calendarGrid
    };
  } catch (error) {
    console.error('Error getting month calendar:', error);
    throw error;
  }
}

/**
 * Build calendar grid with event data
 * @param {Number} year - Year
 * @param {Number} month - Month (1-12)
 * @param {Array} events - Array of events
 * @returns {Array} Calendar grid
 */
function buildCalendarGrid(year, month, events) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Create map of date to events
  const eventsByDate = {};
  events.forEach(event => {
    const eventDate = new Date(event.start.dateTime || event.start.date);
    const dateKey = eventDate.toISOString().split('T')[0];
    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = [];
    }
    eventsByDate[dateKey].push(event);
  });

  // Build grid
  const grid = [];
  let week = new Array(7).fill(null);
  let weekIndex = 0;

  // Fill in starting days
  for (let i = startingDayOfWeek; i < 7; i++) {
    const day = i - startingDayOfWeek + 1;
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    week[i] = {
      day,
      date: dateKey,
      events: eventsByDate[dateKey] || [],
      isCurrentMonth: true
    };
  }

  if (week.some(d => d !== null)) {
    grid.push(week);
    week = new Array(7).fill(null);
    weekIndex = 0;
  }

  // Fill in days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    week[weekIndex] = {
      day,
      date: dateKey,
      events: eventsByDate[dateKey] || [],
      isCurrentMonth: true
    };

    weekIndex++;
    if (weekIndex === 7) {
      grid.push(week);
      week = new Array(7).fill(null);
      weekIndex = 0;
    }
  }

  // Fill remaining cells with next month's days
  let nextDay = 1;
  while (weekIndex > 0 && weekIndex < 7) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const dateKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
    week[weekIndex] = {
      day: nextDay,
      date: dateKey,
      events: [],
      isCurrentMonth: false
    };
    weekIndex++;
    nextDay++;
  }

  if (week.some(d => d !== null)) {
    grid.push(week);
  }

  return grid;
}

/**
 * Get month name
 * @param {Number} month - Month number (1-12)
 * @returns {String} Month name
 */
function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1];
}

/**
 * Format event time
 * @param {String} startTime - ISO format start time
 * @param {String} endTime - ISO format end time
 * @returns {String} Formatted time
 */
function formatEventTime(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  const startStr = start.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  
  const endStr = end.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  return `${startStr} - ${endStr}`;
}

module.exports = {
  getMonthCalendar,
  buildCalendarGrid,
  getMonthName,
  formatEventTime
};
