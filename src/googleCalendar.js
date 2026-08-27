const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * Initialize Google Calendar service using API key
 * @returns {Promise<Object>} Google Calendar API instance
 */
async function initializeService() {
  try {
    if (!process.env.GOOGLE_CALENDAR_API_KEY) {
      throw new Error('GOOGLE_CALENDAR_API_KEY not set in environment variables');
    }

    const calendar = google.calendar({
      version: 'v3',
      auth: process.env.GOOGLE_CALENDAR_API_KEY
    });

    return calendar;
  } catch (error) {
    console.error('Error initializing Google Calendar service:', error);
    throw error;
  }
}

/**
 * Get events from Google Calendar
 * @param {Object} calendar - Google Calendar instance
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of calendar events
 */
async function getEvents(calendar, options) {
  try {
    const response = await calendar.events.list({
      calendarId: options.calendarId,
      timeMin: options.timeMin,
      timeMax: options.timeMax,
      maxResults: options.maxResults || 10,
      singleEvents: options.singleEvents !== false,
      orderBy: options.orderBy || 'startTime',
      showDeleted: false
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching events from Google Calendar:', error);
    throw error;
  }
}

/**
 * Get calendar metadata
 * @param {Object} calendar - Google Calendar instance
 * @param {String} calendarId - Calendar ID
 * @returns {Promise<Object>} Calendar metadata
 */
async function getCalendarMetadata(calendar, calendarId) {
  try {
    const response = await calendar.calendars.get({
      calendarId: calendarId
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching calendar metadata:', error);
    throw error;
  }
}

/**
 * Get list of accessible calendars
 * @param {Object} calendar - Google Calendar instance
 * @returns {Promise<Array>} Array of calendars
 */
async function listCalendars(calendar) {
  try {
    const response = await calendar.calendarList.list();
    return response.data.items || [];
  } catch (error) {
    console.error('Error listing calendars:', error);
    throw error;
  }
}

module.exports = {
  initializeService,
  getEvents,
  getCalendarMetadata,
  listCalendars
};
