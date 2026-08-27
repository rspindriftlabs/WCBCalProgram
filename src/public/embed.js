(function() {
  'use strict';

  const WCBCalendar = {
    config: {
      elementId: 'wcb-calendar',
      apiUrl: 'http://localhost:3000',
      calendarId: 'primary',
      theme: 'light'
    },

    /**
     * Initialize the calendar widget
     */
    init: function(options) {
      // Merge options with defaults
      Object.assign(this.config, options);
      
      const container = document.getElementById(this.config.elementId);
      if (!container) {
        console.error(`Element with id "${this.config.elementId}" not found`);
        return;
      }

      // Add theme class
      container.classList.add(`wcb-calendar-${this.config.theme}`);

      // Get current month
      const now = new Date();
      this.currentYear = now.getFullYear();
      this.currentMonth = now.getMonth() + 1;

      // Render calendar
      this.render();
    },

    /**
     * Render the calendar
     */
    render: function() {
      const container = document.getElementById(this.config.elementId);
      
      // Fetch calendar data
      this.fetchCalendarData(this.currentYear, this.currentMonth)
        .then(data => {
          container.innerHTML = this.buildCalendarHTML(data);
          this.attachEventListeners();
        })
        .catch(error => {
          console.error('Error rendering calendar:', error);
          container.innerHTML = `<div class="wcb-calendar-error">Failed to load calendar</div>`;
        });
    },

    /**
     * Fetch calendar data from API
     */
    fetchCalendarData: function(year, month) {
      const url = `${this.config.apiUrl}/api/calendar/${year}/${month}?calendarId=${this.config.calendarId}`;
      
      return fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          return response.json();
        })
        .then(json => {
          if (!json.success) {
            throw new Error(json.error || 'Unknown error');
          }
          return json.data;
        });
    },

    /**
     * Build calendar HTML
     */
    buildCalendarHTML: function(data) {
      let html = '<div class="wcb-calendar">';
      
      // Header
      html += this.buildHeader(data);
      
      // Weekday labels
      html += this.buildWeekdayLabels();
      
      // Calendar grid
      html += this.buildCalendarGrid(data);
      
      html += '</div>';
      
      // Events list
      html += this.buildEventsList(data);
      
      return html;
    },

    /**
     * Build calendar header
     */
    buildHeader: function(data) {
      const prevYear = this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear;
      const prevMonth = this.currentMonth === 1 ? 12 : this.currentMonth - 1;
      const nextYear = this.currentMonth === 12 ? this.currentYear + 1 : this.currentYear;
      const nextMonth = this.currentMonth === 12 ? 1 : this.currentMonth + 1;

      return `
        <div class="wcb-calendar-header">
          <button class="wcb-calendar-btn wcb-calendar-prev" data-year="${prevYear}" data-month="${prevMonth}">← Prev</button>
          <h2 class="wcb-calendar-title">${data.monthName} ${data.year}</h2>
          <button class="wcb-calendar-btn wcb-calendar-next" data-year="${nextYear}" data-month="${nextMonth}">Next →</button>
        </div>
      `;
    },

    /**
     * Build weekday labels
     */
    buildWeekdayLabels: function() {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      let html = '<div class="wcb-calendar-weekdays">';
      
      days.forEach(day => {
        html += `<div class="wcb-calendar-weekday">${day}</div>`;
      });
      
      html += '</div>';
      return html;
    },

    /**
     * Build calendar grid
     */
    buildCalendarGrid: function(data) {
      let html = '<div class="wcb-calendar-grid">';
      
      data.calendarGrid.forEach(week => {
        html += '<div class="wcb-calendar-week">';
        
        week.forEach(day => {
          if (!day) {
            html += '<div class="wcb-calendar-day wcb-calendar-empty"></div>';
          } else {
            const isToday = this.isToday(day.date);
            const hasEvents = day.events && day.events.length > 0;
            const classList = [
              'wcb-calendar-day',
              !day.isCurrentMonth ? 'wcb-calendar-other-month' : '',
              isToday ? 'wcb-calendar-today' : '',
              hasEvents ? 'wcb-calendar-has-events' : ''
            ].filter(c => c).join(' ');
            
            html += `
              <div class="${classList}" data-date="${day.date}">
                <div class="wcb-calendar-day-number">${day.day}</div>
                ${hasEvents ? `<div class="wcb-calendar-event-count">${day.events.length}</div>` : ''}
              </div>
            `;
          }
        });
        
        html += '</div>';
      });
      
      html += '</div>';
      return html;
    },

    /**
     * Build events list
     */
    buildEventsList: function(data) {
      if (!data.events || data.events.length === 0) {
        return '<div class="wcb-calendar-events"><p class="wcb-no-events">No upcoming events</p></div>';
      }

      let html = '<div class="wcb-calendar-events">';
      html += '<h3>Events</h3>';
      html += '<ul class="wcb-events-list">';
      
      data.events.forEach(event => {
        const startTime = this.formatEventTime(event.start.dateTime || event.start.date);
        html += `
          <li class="wcb-event-item">
            <div class="wcb-event-title">${event.summary || 'Untitled'}</div>
            <div class="wcb-event-time">${startTime}</div>
            ${event.description ? `<div class="wcb-event-description">${event.description}</div>` : ''}
            ${event.location ? `<div class="wcb-event-location">📍 ${event.location}</div>` : ''}
          </li>
        `;
      });
      
      html += '</ul></div>';
      return html;
    },

    /**
     * Format event time
     */
    formatEventTime: function(dateTimeString) {
      const date = new Date(dateTimeString);
      
      // Check if it's an all-day event (no time component)
      if (dateTimeString.length === 10) {
        return date.toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
      }
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    },

    /**
     * Check if date is today
     */
    isToday: function(dateString) {
      const today = new Date();
      const dateToCheck = new Date(dateString);
      
      return dateToCheck.toDateString() === today.toDateString();
    },

    /**
     * Attach event listeners
     */
    attachEventListeners: function() {
      const container = document.getElementById(this.config.elementId);
      
      // Previous button
      const prevBtn = container.querySelector('.wcb-calendar-prev');
      if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
          this.currentYear = parseInt(e.target.dataset.year);
          this.currentMonth = parseInt(e.target.dataset.month);
          this.render();
        });
      }
      
      // Next button
      const nextBtn = container.querySelector('.wcb-calendar-next');
      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          this.currentYear = parseInt(e.target.dataset.year);
          this.currentMonth = parseInt(e.target.dataset.month);
          this.render();
        });
      }
    }
  };

  // Expose to global scope
  if (typeof window !== 'undefined') {
    window.WCBCalendar = WCBCalendar;
  }

  // Export for module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = WCBCalendar;
  }
})();
