(function() {
  'use strict';

  const WCBCalendar = {
    config: {
      icalUrl: null,
      elementId: 'wcb-calendar',
      theme: 'light',
      maxEvents: 10,
      daysAhead: 90,
      showPastEvents: false,
      timeZone: 'UTC',
      cacheExpiry: 86400000, // 24 hours in milliseconds for daily refresh
      refreshInterval: 3600000 // 1 hour refresh check
    },

    events: [],
    currentDate: new Date(),
    refreshTimer: null,
    lastRefreshTime: null,

    /**
     * Initialize the calendar widget
     */
    init: function(options) {
      if (!options.icalUrl) {
        console.error('WCBCalendar: icalUrl is required');
        return;
      }

      Object.assign(this.config, options);
      
      const container = document.getElementById(this.config.elementId);
      if (!container) {
        console.error(`WCBCalendar: Element with id "${this.config.elementId}" not found`);
        return;
      }

      // Add theme class
      container.classList.add(`wcb-calendar-${this.config.theme}`);

      // Load and render calendar
      this.loadCalendar();

      // Set up automatic daily refresh
      this.setupAutoRefresh();
    },

    /**
     * Set up automatic refresh every hour (will only fetch if cache expired)
     */
    setupAutoRefresh: function() {
      console.log('WCBCalendar: Auto-refresh enabled (checks every hour, refreshes daily)');
      
      // Refresh check every hour
      this.refreshTimer = setInterval(() => {
        const now = Date.now();
        const lastRefresh = this.lastRefreshTime || 0;
        
        // Only refresh if 24 hours have passed
        if (now - lastRefresh > this.config.cacheExpiry) {
          console.log('WCBCalendar: Daily cache expired, refreshing...');
          this.loadCalendar();
          this.lastRefreshTime = now;
        }
      }, this.config.refreshInterval);
    },

    /**
     * Clean up refresh timer (call on unmount if needed)
     */
    destroy: function() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    },

    /**
     * Load calendar from iCal URL
     */
    loadCalendar: function() {
      const container = document.getElementById(this.config.elementId);
      if (!container) return;
      
      container.innerHTML = '<div class="wcb-loading">Loading calendar...</div>';

      this.fetchiCal(this.config.icalUrl)
        .then(data => {
          // Use iCalParser if available, otherwise fall back to basic parsing
          if (typeof window.iCalParser !== 'undefined') {
            this.events = window.iCalParser.parse(data, this.config.daysAhead);
            console.log(`WCBCalendar: Parsed ${this.events.length} events (including recurring)`);
          } else {
            console.warn('WCBCalendar: iCalParser not loaded, using basic parsing (recurring events may not expand)');
            this.events = this.parseICalData(data);
          }
          
          // Filter events by date range
          this.events = this.filterEvents(this.events);
          this.renderCalendar();
          this.lastRefreshTime = Date.now();
        })
        .catch(error => {
          console.error('WCBCalendar: Error loading calendar', error);
          container.innerHTML = `<div class="wcb-calendar-error">⚠️ Failed to load calendar. Check console for details.</div>`;
        });
    },

    /**
     * Fetch iCal data with CORS handling
     */
    fetchiCal: function(url) {
      // Check cache first
      const cached = this.getFromCache('wcb-calendar-' + url);
      if (cached) {
        console.log('WCBCalendar: Using cached calendar data');\n        return Promise.resolve(cached);
      }

      console.log('WCBCalendar: Fetching fresh calendar data from', url);

      // Try direct fetch first
      return fetch(url)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.text();
        })
        .then(data => {
          this.saveToCache('wcb-calendar-' + url, data);
          return data;
        })
        .catch(error => {
          // If direct fails due to CORS, try with proxy
          console.warn('WCBCalendar: Direct fetch failed, trying CORS proxy...', error);
          const proxyUrl = 'https://cors-anywhere.herokuapp.com/' + url;
          return fetch(proxyUrl)\n            .then(response => {
              if (!response.ok) throw new Error(`Proxy HTTP ${response.status}`);\n              return response.text();\n            })\n            .then(data => {\n              this.saveToCache('wcb-calendar-' + url, data);\n              return data;\n            });
        });
    },

    /**
     * Parse iCal data (fallback for when iCalParser is not available)
     */
    parseICalData: function(icalText) {
      const events = [];
      const lines = icalText.split('\n');
      let currentEvent = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line === 'BEGIN:VEVENT') {
          currentEvent = {};
        } else if (line === 'END:VEVENT') {
          if (currentEvent) {
            events.push(this.normalizeEvent(currentEvent));
            currentEvent = null;
          }
        } else if (currentEvent && line.includes(':')) {
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':');
          const keyName = key.split(';')[0];

          switch (keyName) {
            case 'DTSTART':
              currentEvent.start = this.parseDateTime(value, key);
              break;
            case 'DTEND':
              currentEvent.end = this.parseDateTime(value, key);
              break;
            case 'SUMMARY':
              currentEvent.summary = this.unescapeText(value);
              break;
            case 'DESCRIPTION':
              currentEvent.description = this.unescapeText(value);
              break;
            case 'LOCATION':
              currentEvent.location = this.unescapeText(value);
              break;
            case 'UID':
              currentEvent.uid = value;
              break;
          }
        }
      }

      return events;
    },

    /**
     * Parse datetime from iCal format
     */
    parseDateTime: function(dateString, fullLine) {
      // Check if it's an all-day event
      if (dateString.length === 8) {
        // YYYYMMDD format - all day event
        const year = parseInt(dateString.substring(0, 4));
        const month = parseInt(dateString.substring(4, 6));
        const day = parseInt(dateString.substring(6, 8));
        return new Date(year, month - 1, day);
      } else if (dateString.length === 15) {
        // YYYYMMDDTHHmmss format
        const year = parseInt(dateString.substring(0, 4));
        const month = parseInt(dateString.substring(4, 6));
        const day = parseInt(dateString.substring(6, 8));
        const hours = parseInt(dateString.substring(9, 11));
        const minutes = parseInt(dateString.substring(11, 13));
        const seconds = parseInt(dateString.substring(13, 15));
        return new Date(year, month - 1, day, hours, minutes, seconds);
      } else {
        return new Date(dateString);
      }
    },

    /**
     * Unescape iCal text
     */
    unescapeText: function(text) {
      return text
        .replace(/\\n/g, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\\\/g, '\\')
        .replace(/\\;/g, ';');
    },

    /**
     * Normalize event data
     */
    normalizeEvent: function(event) {
      return {
        summary: event.summary || 'Untitled',
        description: event.description || '',
        location: event.location || '',
        start: event.start || new Date(),
        end: event.end || new Date(),
        uid: event.uid || Math.random().toString(36)
      };
    },

    /**
     * Filter events based on configuration
     */
    filterEvents: function(events) {
      const now = new Date();
      const futureDate = new Date(now.getTime() + this.config.daysAhead * 24 * 60 * 60 * 1000);

      return events.filter(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        // Filter by date range
        if (this.config.showPastEvents) {
          return eventEnd <= futureDate;
        } else {
          return eventStart >= now && eventStart <= futureDate;
        }
      }).sort((a, b) => new Date(a.start) - new Date(b.start));
    },

    /**
     * Render the calendar
     */
    renderCalendar: function() {
      const container = document.getElementById(this.config.elementId);
      if (!container) return;
      
      let html = '<div class="wcb-calendar">';

      // Header with navigation
      html += this.buildHeader();

      // Calendar grid
      html += this.buildCalendarGrid();

      // Events list
      html += this.buildEventsList();

      html += '</div>';
      container.innerHTML = html;
      this.attachEventListeners();
    },

    /**
     * Build calendar header
     */
    buildHeader: function() {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      const monthName = monthNames[this.currentDate.getMonth()];
      const year = this.currentDate.getFullYear();
      const prevDate = new Date(this.currentDate);
      prevDate.setMonth(prevDate.getMonth() - 1);
      const nextDate = new Date(this.currentDate);
      nextDate.setMonth(nextDate.getMonth() + 1);

      return `
        <div class="wcb-calendar-header">
          <button class="wcb-calendar-btn wcb-calendar-prev" data-date="${prevDate.toISOString()}">← Prev</button>
          <h2 class="wcb-calendar-title">${monthName} ${year}</h2>
          <button class="wcb-calendar-btn wcb-calendar-next" data-date="${nextDate.toISOString()}">Next →</button>
        </div>
      `;
    },

    /**
     * Build calendar grid
     */
    buildCalendarGrid: function() {
      const year = this.currentDate.getFullYear();
      const month = this.currentDate.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      let html = '<div class="wcb-calendar-container">';
      
      // Weekday headers
      html += '<div class="wcb-weekday-row">';
      weekdays.forEach(day => {
        html += `<div class="wcb-weekday-header">${day}</div>`;
      });
      html += '</div>';

      // Calendar days
      html += '<div class="wcb-days-grid">';
      
      // Empty cells for days before month starts
      for (let i = 0; i < firstDay; i++) {
        html += '<div class="wcb-day wcb-empty"></div>';
      }

      // Days of month
      const today = new Date();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = date.toDateString() === today.toDateString();
        const dayEvents = this.getEventsForDate(date);
        const hasEvents = dayEvents.length > 0;

        const classList = ['wcb-day'];
        if (isToday) classList.push('wcb-today');
        if (hasEvents) classList.push('wcb-has-events');

        html += `
          <div class="${classList.join(' ')}" data-date="${date.toISOString().split('T')[0]}">
            <div class="wcb-day-number">${day}</div>
            ${hasEvents ? `<div class="wcb-event-indicator">${dayEvents.length}</div>` : ''}
          </div>
        `;
      }

      html += '</div></div>';
      return html;
    },

    /**
     * Get events for a specific date
     */
    getEventsForDate: function(date) {
      const dateStr = date.toISOString().split('T')[0];
      return this.events.filter(event => {
        const eventStart = new Date(event.start).toISOString().split('T')[0];
        return eventStart === dateStr;
      });
    },

    /**
     * Build events list
     */
    buildEventsList: function() {
      let html = '<div class="wcb-events-section">';
      html += '<h3>Upcoming Events</h3>';

      if (this.events.length === 0) {
        html += '<p class="wcb-no-events">No upcoming events</p>';
      } else {
        html += '<ul class="wcb-events-list">';
        this.events.slice(0, this.config.maxEvents).forEach(event => {
          const startDate = this.formatEventDate(event.start);
          const startTime = this.formatEventTime(event.start);
          const endTime = this.formatEventTime(event.end);

          html += `
            <li class="wcb-event">
              <div class="wcb-event-header">
                <div class="wcb-event-title">${this.escapeHtml(event.summary)}</div>
                <div class="wcb-event-date">${startDate}</div>
              </div>
              <div class="wcb-event-time">${startTime}${this.isSameDay(event.start, event.end) ? ' - ' + endTime : ''}</div>
              ${event.location ? `<div class="wcb-event-location">📍 ${this.escapeHtml(event.location)}</div>` : ''}
              ${event.description ? `<div class="wcb-event-description">${this.escapeHtml(event.description)}</div>` : ''}
            </li>
          `;
        });
        html += '</ul>';
      }

      if (this.events.length > this.config.maxEvents) {
        html += `<p class="wcb-more-events">... and ${this.events.length - this.config.maxEvents} more</p>`;
      }

      html += '</div>';
      return html;
    },

    /**
     * Format event date
     */
    formatEventDate: function(date) {
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    },

    /**
     * Format event time
     */
    formatEventTime: function(date) {
      const d = new Date(date);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    },

    /**
     * Check if two dates are the same day
     */
    isSameDay: function(date1, date2) {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      return d1.toDateString() === d2.toDateString();
    },

    /**
     * Escape HTML special characters
     */
    escapeHtml: function(text) {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return text.replace(/[&<>"']/g, m => map[m]);
    },

    /**
     * Cache management
     */
    getFromCache: function(key) {
      try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        const { data, expiry } = JSON.parse(cached);
        if (Date.now() > expiry) {
          localStorage.removeItem(key);
          return null;
        }
        return data;
      } catch (e) {
        return null;
      }
    },

    saveToCache: function(key, data) {
      try {
        const cacheData = {
          data: data,
          expiry: Date.now() + this.config.cacheExpiry
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
      } catch (e) {
        console.warn('WCBCalendar: Cache save failed:', e);
      }
    },

    /**
     * Attach event listeners
     */
    attachEventListeners: function() {
      const container = document.getElementById(this.config.elementId);
      if (!container) return;
      
      const prevBtn = container.querySelector('.wcb-calendar-prev');
      const nextBtn = container.querySelector('.wcb-calendar-next');

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          this.currentDate.setMonth(this.currentDate.getMonth() - 1);
          this.renderCalendar();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          this.currentDate.setMonth(this.currentDate.getMonth() + 1);
          this.renderCalendar();
        });
      }
    }
  };

  // Expose globally
  if (typeof window !== 'undefined') {
    window.WCBCalendar = WCBCalendar;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = WCBCalendar;
  }
})();
