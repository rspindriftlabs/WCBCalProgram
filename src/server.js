const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const googleCalendar = require('./googleCalendar');
const calendar = require('./calendar');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Google Calendar service
let calendarService = null;

// Initialize calendar service on startup
googleCalendar.initializeService()
  .then(service => {
    calendarService = service;
    console.log('Google Calendar API initialized');
  })
  .catch(err => {
    console.error('Failed to initialize Google Calendar API:', err);
  });

// Routes

// Get events from calendar
app.get('/api/events', async (req, res) => {
  try {
    const { calendarId, maxResults, timeMin, timeMax } = req.query;
    
    if (!calendarService) {
      return res.status(503).json({ error: 'Calendar service not initialized' });
    }

    const options = {
      calendarId: calendarId || process.env.GOOGLE_CALENDAR_ID,
      maxResults: parseInt(maxResults) || 10,
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    };

    const events = await googleCalendar.getEvents(calendarService, options);
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get calendar view for specific month/year
app.get('/api/calendar/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const { calendarId } = req.query;
    
    if (!calendarService) {
      return res.status(503).json({ error: 'Calendar service not initialized' });
    }

    const calendarData = await calendar.getMonthCalendar(
      calendarService,
      calendarId || process.env.GOOGLE_CALENDAR_ID,
      parseInt(year),
      parseInt(month)
    );

    res.json({ success: true, data: calendarData });
  } catch (error) {
    console.error('Error fetching calendar:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Serve embeddable script
app.get('/embed.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'public/embed.js'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    calendarServiceReady: calendarService !== null
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`WCB Calendar server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Get events: http://localhost:${PORT}/api/events`);
});

module.exports = app;
