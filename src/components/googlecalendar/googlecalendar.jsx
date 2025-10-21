import React, { useState, useEffect } from 'react';
import { loadGoogleApi, signIn, signOut, listEvents, getAuthInstance, isInitialized, createEvent, updateEvent, deleteEvent } from './google-calendar.js';
import { googleCalendarMCardService } from '../../services/google-calendar-mcard-service.js';

const ViewToggle = ({ view, onViewChange }) => (
  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
    <button
      onClick={() => onViewChange('grid')}
      className={`px-4 py-2 rounded ${
        view === 'grid'
          ? 'bg-white dark:bg-gray-600 shadow-sm'
          : 'text-gray-600 dark:text-gray-300'
      }`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    </button>
    <button
      onClick={() => onViewChange('list')}
      className={`px-4 py-2 rounded ${
        view === 'list'
          ? 'bg-white dark:bg-gray-600 shadow-sm'
          : 'text-gray-600 dark:text-gray-300'
      }`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    </button>
  </div>
);

const FilterBar = ({ searchTerm, onSearchChange }) => (
  <div className="relative">
    <input
      type="text"
      placeholder="Search events..."
      value={searchTerm}
      onChange={(e) => onSearchChange(e.target.value)}
      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
    />
    <svg
      className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  </div>
);

const MonthNavigation = ({ selectedDate, onDateChange }) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  const goToPreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(currentMonth - 1);
    onDateChange(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(currentMonth + 1);
    onDateChange(newDate);
  };

  const goToCurrentMonth = () => {
    onDateChange(new Date());
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return currentMonth === now.getMonth() && currentYear === now.getFullYear();
  };

  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <button
        onClick={goToPreviousMonth}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Previous Month"
      >
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {monthNames[currentMonth]} {currentYear}
        </h2>
        {!isCurrentMonth() && (
          <button
            onClick={goToCurrentMonth}
            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            Today
          </button>
        )}
      </div>
      
      <button
        onClick={goToNextMonth}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Next Month"
      >
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

const CalendarList = ({ calendars, visibility, onToggleVisibility, onColorChange }) => {
  const defaultColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
  ];

  if (!calendars || calendars.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">My Calendars</h3>
      <div className="space-y-2">
        {calendars.map((calendar, index) => {
          const isVisible = visibility[calendar.id] !== false; // Default to visible
          const calendarColor = calendar.color || defaultColors[index % defaultColors.length];
          
          return (
            <div key={calendar.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3 flex-1">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => onToggleVisibility(calendar.id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: calendarColor }}
                  ></div>
                  <span className={`text-sm ${
                    isVisible 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-500 dark:text-gray-400 line-through'
                  }`}>
                    {calendar.name}
                  </span>
                  {calendar.isPrimary && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                      Primary
                    </span>
                  )}
                </label>
                
                {/* Color picker */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <input
                    type="color"
                    value={calendarColor}
                    onChange={(e) => onColorChange(calendar.id, e.target.value)}
                    className="w-6 h-6 rounded border-0 cursor-pointer"
                    title="Change calendar color"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Quick actions */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <button
            onClick={() => {
              const newVisibility = {};
              calendars.forEach(cal => {
                newVisibility[cal.id] = true;
              });
              Object.keys(newVisibility).forEach(id => onToggleVisibility(id, true));
            }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Show All
          </button>
          <span className="text-xs text-gray-400">•</span>
          <button
            onClick={() => {
              calendars.forEach(cal => onToggleVisibility(cal.id, false));
            }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Hide All
          </button>
        </div>
      </div>
    </div>
  );
};

const CalendarGrid = ({ selectedDate, onDateSelect }) => {
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const today = new Date();
  
  // Get first day of the month and how many days in the month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  
  // Get days from previous month to fill the grid
  const prevMonth = new Date(currentYear, currentMonth - 1, 0);
  const daysInPrevMonth = prevMonth.getDate();
  
  // Create array of all days to display
  const days = [];
  
  // Add days from previous month
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: daysInPrevMonth - i,
      isCurrentMonth: false,
      isPrevMonth: true,
      fullDate: new Date(currentYear, currentMonth - 1, daysInPrevMonth - i)
    });
  }
  
  // Add days from current month
  for (let date = 1; date <= daysInMonth; date++) {
    days.push({
      date,
      isCurrentMonth: true,
      isPrevMonth: false,
      fullDate: new Date(currentYear, currentMonth, date)
    });
  }
  
  // Add days from next month to complete the grid (42 days = 6 weeks)
  const remainingDays = 42 - days.length;
  for (let date = 1; date <= remainingDays; date++) {
    days.push({
      date,
      isCurrentMonth: false,
      isPrevMonth: false,
      fullDate: new Date(currentYear, currentMonth + 1, date)
    });
  }
  
  const isToday = (date) => {
    return date.toDateString() === today.toDateString();
  };
  
  const isSelected = (date) => {
    return date.toDateString() === selectedDate.toDateString();
  };
  
  const handleDateClick = (dayInfo) => {
    if (!dayInfo.isCurrentMonth) {
      // If clicking on prev/next month day, navigate to that month
      const newDate = new Date(dayInfo.fullDate);
      onDateSelect(newDate);
    } else {
      // If clicking on current month day, select that specific date
      onDateSelect(dayInfo.fullDate);
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <div key={index} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((dayInfo, index) => {
          const isCurrentDay = isToday(dayInfo.fullDate);
          const isSelectedDay = isSelected(dayInfo.fullDate);
          
          return (
            <button
              key={index}
              onClick={() => handleDateClick(dayInfo)}
              className={`
                h-10 w-10 rounded-full text-sm font-medium transition-colors
                ${
                  isSelectedDay
                    ? 'bg-blue-600 text-white'
                    : isCurrentDay
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                    : dayInfo.isCurrentMonth
                    ? 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                    : 'text-gray-400 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                }
              `}
            >
              {dayInfo.date}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Helper component to render HTML content
const HTMLContent = ({ html, className = '' }) => {
  return <div 
    className={className}
    dangerouslySetInnerHTML={{ __html: html }} 
  />;
};

// Event Creation Modal Component
const EventCreateModal = ({ isOpen, onClose, onEventCreated, availableCalendars, selectedDate }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    isAllDay: false,
    calendarId: 'primary',
    attendees: '',
    reminders: []
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Initialize form with selected date
  useEffect(() => {
    if (isOpen && selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const endTime = `${(now.getHours() + 1).toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      setFormData(prev => ({
        ...prev,
        startDate: dateStr,
        endDate: dateStr,
        startTime: currentTime,
        endTime: endTime
      }));
    }
  }, [isOpen, selectedDate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsCreating(true);

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Event title is required');
      }

      // Prepare event data
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        isAllDay: formData.isAllDay,
        useDefaultReminders: true
      };

      if (formData.isAllDay) {
        eventData.startDate = formData.startDate;
        eventData.endDate = formData.endDate || formData.startDate;
      } else {
        // Combine date and time for datetime
        const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
        const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
        
        if (endDateTime <= startDateTime) {
          throw new Error('End time must be after start time');
        }
        
        eventData.startDateTime = startDateTime.toISOString();
        eventData.endDateTime = endDateTime.toISOString();
      }

      // Parse attendees
      if (formData.attendees.trim()) {
        eventData.attendees = formData.attendees
          .split(',')
          .map(email => ({ email: email.trim() }))
          .filter(attendee => attendee.email);
      }

      // Create the event
      const response = await createEvent(eventData, formData.calendarId);
      
      console.log('✅ Event created successfully:', response.result);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        location: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        isAllDay: false,
        calendarId: 'primary',
        attendees: '',
        reminders: []
      });
      
      // Notify parent component
      if (onEventCreated) {
        onEventCreated(response.result);
      }
      
      onClose();
      
    } catch (err) {
      console.error('❌ Error creating event:', err);
      setError(err.message || 'Failed to create event. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create New Event
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Event Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter event title"
            />
          </div>

          {/* Calendar Selection */}
          {availableCalendars && availableCalendars.length > 1 && (
            <div>
              <label htmlFor="calendarId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Calendar
              </label>
              <select
                id="calendarId"
                name="calendarId"
                value={formData.calendarId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {availableCalendars.map(calendar => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.name} {calendar.isPrimary ? '(Primary)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* All Day Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isAllDay"
              name="isAllDay"
              checked={formData.isAllDay}
              onChange={handleInputChange}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="isAllDay" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              All day event
            </label>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Start Time */}
            {!formData.isAllDay && (
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}

            {/* End Date */}
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date *
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* End Time */}
            {!formData.isAllDay && (
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter event location"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter event description"
            />
          </div>

          {/* Attendees */}
          <div>
            <label htmlFor="attendees" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Attendees
            </label>
            <input
              type="text"
              id="attendees"
              name="attendees"
              value={formData.attendees}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter email addresses separated by commas"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Separate multiple email addresses with commas
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                'Create Event'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Event Details Modal Component
const EventDetailsModal = ({ event, isOpen, onClose, calendarColor }) => {
  if (!isOpen || !event) return null;

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'No date specified';
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No date specified';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isAllDayEvent = !event.start?.dateTime;
  const eventColor = calendarColor || event.calendarColor || '#3B82F6';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: eventColor }}
              ></div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {event.summary || 'Untitled Event'}
              </h2>
            </div>
            {event.calendarName && !event.isPrimary && (
              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <span>From calendar: {event.calendarName}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Date and Time */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Date & Time
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              {isAllDayEvent ? (
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">All Day Event</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {event.start?.date && event.end?.date ? (
                      event.start.date === event.end.date ? (
                        formatDate(event.start.date)
                      ) : (
                        `${formatDate(event.start.date)} - ${formatDate(event.end.date)}`
                      )
                    ) : (
                      formatDate(event.start?.date)
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {formatDateTime(event.start?.dateTime)}
                  </div>
                  {event.end?.dateTime && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Until: {formatDateTime(event.end.dateTime)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Location
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="text-gray-900 dark:text-white">{event.location}</div>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Description
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <HTMLContent 
                  html={event.description} 
                  className="prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-white" 
                />
              </div>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Attendees ({event.attendees.length})
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="space-y-2">
                  {event.attendees.map((attendee, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="text-gray-900 dark:text-white">
                          {attendee.displayName || attendee.email}
                        </div>
                        {attendee.displayName && attendee.email && (
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {attendee.email}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {attendee.organizer && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                            Organizer
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          attendee.responseStatus === 'accepted' 
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : attendee.responseStatus === 'declined'
                            ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                            : attendee.responseStatus === 'tentative'
                            ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {attendee.responseStatus === 'accepted' ? 'Going' :
                           attendee.responseStatus === 'declined' ? 'Not Going' :
                           attendee.responseStatus === 'tentative' ? 'Maybe' : 'No Response'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Meeting Link */}
          {event.hangoutLink && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Meeting Link
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <a 
                  href={event.hangoutLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Join Meeting
                </a>
              </div>
            </div>
          )}

          {/* Event Status */}
          {event.status && event.status !== 'confirmed' && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Status
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  event.status === 'cancelled' 
                    ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                    : event.status === 'tentative'
                    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          {event.htmlLink && (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              View in Google Calendar
            </a>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const EventCard = ({ event, view, calendarColor, onEventClick }) => {
  const startDate = new Date(event.start.dateTime || event.start.date);
  const endDate = event.end ? new Date(event.end.dateTime || event.end.date) : null;
  const isAllDay = !event.start.dateTime;
  
  const eventColor = calendarColor || event.calendarColor || '#3B82F6';

  // Format time display
  const getTimeDisplay = () => {
    if (isAllDay) {
      return 'All day';
    }
    const timeStr = startDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    if (endDate) {
      const endTimeStr = endDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      return `${timeStr} - ${endTimeStr}`;
    }
    return timeStr;
  };

  const getDateDisplay = () => {
    return startDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (view === 'grid') {
    return (
      <div 
        className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
        onClick={() => onEventClick && onEventClick(event)}
      >
        {/* Color accent bar */}
        <div className="h-1.5" style={{ backgroundColor: eventColor }}></div>
        
        <div className="p-4">
          {/* Date and Time */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                {getDateDisplay()}
              </div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {getTimeDisplay()}
              </div>
            </div>
            {!event.isPrimary && event.calendarName && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: eventColor }}></div>
                <span className="text-xs text-gray-600 dark:text-gray-300">{event.calendarName}</span>
              </div>
            )}
          </div>
          
          {/* Event Title */}
          <h3 className="font-semibold text-base text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {event.summary || 'Untitled Event'}
          </h3>
          
          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}
          
          {/* Description preview */}
          {event.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {event.description.replace(/<[^>]*>/g, '')}
            </p>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div 
      className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer overflow-hidden"
      onClick={() => onEventClick && onEventClick(event)}
    >
      <div className="flex">
        {/* Color accent */}
        <div className="w-1" style={{ backgroundColor: eventColor }}></div>
        
        <div className="flex-1 p-4">
          <div className="flex items-start gap-4">
            {/* Time column */}
            <div className="flex-shrink-0 w-24">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                {getDateDisplay()}
              </div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {getTimeDisplay()}
              </div>
            </div>
            
            {/* Event details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold text-base text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {event.summary || 'Untitled Event'}
                </h3>
                {!event.isPrimary && event.calendarName && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full flex-shrink-0">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: eventColor }}></div>
                    <span className="text-xs text-gray-600 dark:text-gray-300">{event.calendarName}</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                {event.location && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="line-clamp-1">{event.location}</span>
                  </div>
                )}
                {event.attendees && event.attendees.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>{event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const GoogleCalendar = ({ className = '' }) => {
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]); // Store all events before filtering
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [view, setView] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [configError, setConfigError] = useState(false);
  const [isExportingToMCard, setIsExportingToMCard] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [calendarSummary, setCalendarSummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSpecificDateSelected, setIsSpecificDateSelected] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState([]);
  const [calendarVisibility, setCalendarVisibility] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  // Initialize Google API
  useEffect(() => {
    const initializeGoogleApi = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Check for saved auth token in localStorage
        const savedToken = localStorage.getItem('googleAuthToken');
        
        await loadGoogleApi();
        
        // Check if user is already authenticated by checking for token
        const token = window.gapi.client.getToken();
        const isTokenValid = token !== null;
        
        // If we have a saved token but no current token, try to restore the session
        if (savedToken && !isTokenValid) {
          try {
            // Try to restore the session with the saved token
            window.gapi.client.setToken(JSON.parse(savedToken));
            // Verify the token is still valid by making a test request
            const response = await window.gapi.client.calendar.events.list({
              'calendarId': 'primary',
              'timeMin': (new Date()).toISOString(),
              'showDeleted': false,
              'singleEvents': true,
              'maxResults': 1
            });
            
            // If we get here, the token is still valid
            setIsAuthenticated(true);
            await fetchEvents();
            return;
          } catch (err) {
            console.log('Saved token is invalid or expired, clearing...');
            localStorage.removeItem('googleAuthToken');
            setIsAuthenticated(false);
          }
        } else if (isTokenValid) {
          // If we have a valid token from gapi
          setIsAuthenticated(true);
          await fetchEvents();
        }
      } catch (err) {
        console.error('Error initializing Google Calendar API:', err);
        if (err.message && err.message.includes('400')) {
          setConfigError(true);
          setError('Invalid Google Calendar API key. Please check your API credentials.');
        } else {
          setError('Failed to initialize Google Calendar. Please check your internet connection and refresh the page.');
        }
      } finally {
        setIsLoading(false);
        setIsInitializing(false);
      }
    };

    // Avoid initialization during server-side rendering
    if (typeof window !== 'undefined') {
      initializeGoogleApi();
    } else {
      setIsLoading(false);
      setIsInitializing(false);
    }
  }, []);

  // Refetch events when selectedDate changes
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchEvents();
    }
  }, [selectedDate, isAuthenticated, isSpecificDateSelected]);

  // Re-filter events when calendar visibility changes (without refetching from API)
  useEffect(() => {
    if (allEvents.length > 0) {
      // Re-filter from all stored events without making new API calls
      const visibleEvents = allEvents.filter(event => {
        const calendarId = event.calendarId || 'primary';
        return calendarVisibility[calendarId] !== false;
      });
      
      console.log(`Filtered events: ${visibleEvents.length} visible out of ${allEvents.length} total`);
      setEvents(visibleEvents);
      
      // Update calendar summary with new counts
      if (availableCalendars.length > 0) {
        setCalendarSummary(prev => prev ? {
          ...prev,
          totalEvents: visibleEvents.length
        } : null);
      }
    }
  }, [calendarVisibility, allEvents]);

  // Handle date selection from calendar grid
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setIsSpecificDateSelected(true);
  };

  // Handle month navigation (resets to month view)
  const handleMonthChange = (date) => {
    setSelectedDate(date);
    setIsSpecificDateSelected(false);
  };

  // Handle calendar visibility toggle
  const handleToggleCalendarVisibility = (calendarId, isVisible) => {
    setCalendarVisibility(prev => ({
      ...prev,
      [calendarId]: isVisible
    }));
  };

  // Handle calendar color change
  const handleCalendarColorChange = (calendarId, color) => {
    setAvailableCalendars(prev => 
      prev.map(cal => 
        cal.id === calendarId 
          ? { ...cal, color }
          : cal
      )
    );
    
    // Save color preference to localStorage
    const savedColors = JSON.parse(localStorage.getItem('calendarColors') || '{}');
    savedColors[calendarId] = color;
    localStorage.setItem('calendarColors', JSON.stringify(savedColors));
  };

  // Handle event click to open modal
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  // Handle create event modal
  const handleCreateEvent = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
  };

  // Handle event creation success
  const handleEventCreated = async (newEvent) => {
    try {
      setIsCreatingEvent(true);
      console.log('✅ New event created:', newEvent);
      
      // Save the new event to MCard immediately
      try {
        const userEmail = window.gapi?.client?.getToken()?.access_token ? 
          'google_calendar_user' : 'unknown_user';
        
        console.log('📤 Saving newly created event to MCard:', newEvent.id);
        
        // Format the event for MCard storage
        const eventForMCard = {
          ...newEvent,
          calendarId: newEvent.organizer?.email === userEmail ? 'primary' : (newEvent.calendarId || 'primary'),
          calendarName: 'Primary Calendar',
          isPrimary: true
        };
        
        await googleCalendarMCardService.saveEventToMCard(eventForMCard, userEmail);
        console.log('✅ New event saved to MCard successfully');
        
      } catch (mcardError) {
        console.warn('⚠️ Failed to save new event to MCard:', mcardError);
        // Don't fail the whole operation if MCard save fails
      }
      
      // Refresh the events list to show the new event
      await fetchEvents();
      
      // Show success message
      setExportStatus('✅ Event created and saved successfully!');
      setTimeout(() => setExportStatus(''), 3000);
      
    } catch (error) {
      console.error('❌ Error refreshing events after creation:', error);
      setExportStatus('✅ Event created, but failed to refresh list. Please refresh manually.');
      setTimeout(() => setExportStatus(''), 5000);
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      await signIn();
      setIsAuthenticated(true);
      
      // Save the token to localStorage for persistence
      const token = window.gapi.client.getToken();
      if (token) {
        localStorage.setItem('googleAuthToken', JSON.stringify(token));
      }
      
      // Fetch events and calendar list using the main fetch function
      await fetchEvents();
      
      // Send events to MCard (this will be handled by fetchEvents now)
      // The fetchEvents function will handle all calendar processing
      
    } catch (err) {
      console.error('Sign in error:', err);
      
      if (err.error === 'popup_blocked_by_browser') {
        setError('Please allow popups for this site to sign in with Google.');
      } else if (err.error === 'access_denied') {
        setError('Access denied. Please grant calendar access to view your events.');
      } else if (err.error === 'immediate_failed') {
        setError('Authentication failed. Please try again.');
      } else if (err.message && err.message.includes('Cross-Origin-Opener-Policy')) {
        setError('Browser security policy blocked the sign-in process. Please try using a different browser or disable enhanced tracking protection for this site.');
      } else {
        setError('Failed to sign in. Please try again.');
      }
      
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      await signOut();
      setIsAuthenticated(false);
      setEvents([]);
      setAllEvents([]);
      setAvailableCalendars([]);
      setCalendarVisibility({});
      setCalendarSummary(null);
      
      // Clear the saved token from localStorage
      localStorage.removeItem('googleAuthToken');
      
    } catch (err) {
      console.error('Sign out error:', err);
      setError('Failed to sign out. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendEventsToContext = async (events) => {
    try {
      const today = new Date();
      const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const oneMonthFromNow = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

      // Filter events for different time periods
      const todayEvents = events.filter(event => {
        const eventDate = new Date(event.start.dateTime || event.start.date);
        return eventDate.toDateString() === today.toDateString();
      });

      const weekEvents = events.filter(event => {
        const eventDate = new Date(event.start.dateTime || event.start.date);
        return eventDate <= oneWeekFromNow && eventDate >= today;
      });

      const monthEvents = events.filter(event => {
        const eventDate = new Date(event.start.dateTime || event.start.date);
        return eventDate <= oneMonthFromNow && eventDate >= today;
      });

      // Format events data
      const eventsContext = {
        today: todayEvents.map(event => ({
          summary: event.summary,
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date
        })),
        week: weekEvents.map(event => ({
          summary: event.summary,
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date
        })),
        month: monthEvents.map(event => ({
          summary: event.summary,
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date
        }))
      };

      // Send to API
      await fetch('http://localhost:4321/api/card-collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          card: {
            content: {
              dimensionType: 'abstractSpecification',
              context: JSON.stringify(eventsContext),
              goal: '',
              successCriteria: ''
            }
          }
        })
      });
    } catch (error) {
      console.error('Error sending events to context:', error);
    }
  };

  // Update fetchEvents to include sending to context
  const fetchEvents = async (dateFilter = null) => {
    try {
      setError(null);
      setIsLoading(true);
      
      if (!isInitialized()) {
        throw new Error('Google API not initialized');
      }
      
      const response = await listEvents(dateFilter || selectedDate, isSpecificDateSelected);
      const fetchedEvents = response.result.items || [];
      
      // Log summary of calendar access
      console.log(`Successfully fetched events from accessible calendars. Total events: ${fetchedEvents.length}`);
      if (response.result.summary) {
        console.log(response.result.summary);
      }
      
      // Store all events before filtering
      setAllEvents(fetchedEvents);
      
      // Fetch all calendars (not just ones with events)
      let allCalendars = [];
      try {
        const allCalendarsResponse = await window.gapi.client.calendar.calendarList.list({
          minAccessRole: 'reader'
        });
        allCalendars = allCalendarsResponse.result.items || [];
        console.log(`Found ${allCalendars.length} total calendars in user's account`);
      } catch (calendarListError) {
        console.warn('Failed to fetch complete calendar list, using calendars from events only:', calendarListError);
        // Fallback: create calendar entries from events only
        const eventCalendars = new Set();
        fetchedEvents.forEach(event => {
          const calendarId = event.calendarId || 'primary';
          const calendarName = event.calendarName || 'Primary Calendar';
          if (!eventCalendars.has(calendarId)) {
            allCalendars.push({
              id: calendarId,
              summary: calendarName,
              primary: event.isPrimary || false,
              backgroundColor: event.calendarColor
            });
            eventCalendars.add(calendarId);
          }
        });
      }
      
      // Create calendar summary with ALL calendars
      const calendarMap = new Map();
      const savedColors = JSON.parse(localStorage.getItem('calendarColors') || '{}');
      let totalEvents = 0;
      
      // First, add all calendars with zero event count
      allCalendars.forEach(calendar => {
        calendarMap.set(calendar.id, {
          id: calendar.id,
          name: calendar.summary,
          eventCount: 0,
          color: savedColors[calendar.id] || calendar.backgroundColor || calendar.colorId,
          isPrimary: calendar.primary || false
        });
      });
      
      // Then, update event counts for calendars that have events
      fetchedEvents.forEach(event => {
        const calendarId = event.calendarId || 'primary';
        
        if (calendarMap.has(calendarId)) {
          const calendarInfo = calendarMap.get(calendarId);
          calendarInfo.eventCount++;
          totalEvents++;
        }
      });
      
      // Convert map to array for easier rendering
      const calendarsArray = Array.from(calendarMap.values());
      
      // Update available calendars only if they changed
      setAvailableCalendars(prev => {
        const hasChanged = prev.length !== calendarsArray.length || 
          calendarsArray.some(cal => !prev.find(p => p.id === cal.id));
        return hasChanged ? calendarsArray : prev;
      });
      
      // Initialize visibility for new calendars (default to visible)
      setCalendarVisibility(prev => {
        const newVisibility = { ...prev };
        let hasChanges = false;
        calendarsArray.forEach(cal => {
          if (!(cal.id in newVisibility)) {
            newVisibility[cal.id] = true;
            hasChanges = true;
          }
        });
        return hasChanges ? newVisibility : prev;
      });
      
      // Filter events based on current calendar visibility
      const visibleEvents = fetchedEvents.filter(event => {
        const calendarId = event.calendarId || 'primary';
        return calendarVisibility[calendarId] !== false; // Default to visible if not set
      });
      
      setCalendarSummary({
        calendars: calendarsArray,
        totalCalendars: calendarsArray.length,
        totalEvents: visibleEvents.length,
        allEvents: totalEvents
      });
      
      setEvents(visibleEvents);
      
      // Send events to context
      await sendEventsToContext(visibleEvents);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayEvents = visibleEvents.filter(event => {
        const eventDate = new Date(event.start.dateTime || event.start.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === today.getTime();
      });
      
      // Set error message based on today's meetings
      if (todayEvents.length > 0) {
        setError(`You have ${todayEvents.length} meeting${todayEvents.length > 1 ? 's' : ''} today`);
      } else {
        setError('No meeting today');
      }
      
    } catch (err) {
      console.error('Calendar fetch error:', err);
      
      // Handle quota exceeded errors without signing out
      if (err.status === 403 && err.body && err.body.includes('rateLimitExceeded')) {
        setError('Google Calendar API quota exceeded. Please wait a moment and try refreshing.');
        // Don't sign out the user for quota issues
      } else if (err.status === 403) {
        setError('Access denied. Please ensure you have granted calendar access and try signing in again.');
        setIsAuthenticated(false);
      } else if (err.status === 401) {
        setError('Your session has expired. Please sign in again.');
        setIsAuthenticated(false);
      } else {
        setError(`Failed to load calendar events: ${err.message || 'Unknown error'}`);
      }
      if (err.status === 0) {
        setError('Failed to load calendar events. Please check your internet connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Manual export to MCard function
  const handleExportToMCard = async () => {
    if (!events || events.length === 0) {
      setExportStatus('No events to export');
      setTimeout(() => setExportStatus(''), 3000);
      return;
    }

    try {
      setIsExportingToMCard(true);
      setExportStatus('Exporting events to MCard...');

      // Get user email if available
      const userEmail = window.gapi?.client?.getToken()?.access_token ? 
        'google_calendar_user' : 'unknown_user';

      console.log('📤 Manual export: Starting MCard sync for user:', userEmail);
      console.log('📤 Manual export: Exporting', events.length, 'events to MCard');

      // Use the MCard service to save all events
      const result = await googleCalendarMCardService.saveAllEventsToMCard(events, userEmail);
      
      console.log('✅ Manual export: MCard sync result:', result);

      // Also send to context API (following the example pattern)
      await sendEventsToContext(events);

      const statusMessage = `✅ Successfully exported ${result.savedCount} events to MCard!` + 
        (result.skippedCount > 0 ? ` (${result.skippedCount} birthday events skipped)` : '') +
        (result.failedCount > 0 ? ` (${result.failedCount} failed)` : '');
      
      setExportStatus(statusMessage);
      console.log(`✅ Manual export: Successfully synced ${result.savedCount} events to MCard, ${result.skippedCount} skipped, ${result.failedCount} failed`);
      
      // Clear status after 5 seconds
      setTimeout(() => {
        setExportStatus('');
        setIsExportingToMCard(false);
      }, 5000);
      
    } catch (error) {
      console.error('❌ Manual export: Error syncing events to MCard:', error);
      setExportStatus(`❌ Export failed: ${error.message}`);
      
      // Clear error after 7 seconds
      setTimeout(() => {
        setExportStatus('');
        setIsExportingToMCard(false);
      }, 7000);
    }
  };

  const filteredEvents = events.filter(event => {
    const searchLower = searchTerm.toLowerCase();
    return (
      event.summary?.toLowerCase().includes(searchLower) ||
      event.description?.toLowerCase().includes(searchLower)
    );
  });

  const todayMeetings = events.filter(event => {
    const today = new Date();
    const eventDate = new Date(event.start.dateTime || event.start.date);
    return eventDate.toDateString() === today.toDateString();
  });

  // For initial loading state
  if (isInitializing) {
    return (
      <div className={`flex items-center justify-center h-full dark:bg-gray-800 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary dark:border-blue-400"></div>
      </div>
    );
  }

  // For configuration errors, show a more helpful message
  if (configError) {
    return (
      <div className={`p-6 dark:bg-gray-800 h-full overflow-auto ${className}`}>
        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">Configuration Required</h3>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">{error}</p>
          <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 mb-4">
            <p className="text-sm font-mono mb-2">1. Create a <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">.env</code> file in your project root with:</p>
            <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs overflow-auto">
              PUBLIC_GOOGLE_API_KEY=your_api_key_here<br/>
              PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
            </pre>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You'll need to create these credentials in the <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Google Cloud Console</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-auto bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header Section */}
      {isAuthenticated && (
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-6 py-4">
            {/* Top Bar with Actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Google Calendar</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {todayMeetings.length > 0 
                      ? `${todayMeetings.length} ${todayMeetings.length === 1 ? 'meeting' : 'meetings'} today`
                      : 'No meetings today'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchEvents()}
                  disabled={isLoading}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={isLoading || isCreatingEvent}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <span>New Event</span>
                </button>
                <button
                  onClick={handleExportToMCard}
                  disabled={isLoading || isExportingToMCard || events.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  title="Export to MCard"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </button>
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  title="Sign Out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Export Status Display */}
            {exportStatus && (
              <div className={`rounded-lg p-3 text-sm mb-4 ${
                exportStatus.includes('✅') 
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200'
                  : exportStatus.includes('❌')
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200'
                  : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200'
              }`}>
                <div className="flex items-center gap-2">
                  {isExportingToMCard && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                  )}
                  <span>{exportStatus}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!isAuthenticated ? (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
          <div className="text-center">
            <div className="mb-6">
              <div className="inline-flex p-4 bg-white dark:bg-gray-800 rounded-full shadow-lg mb-4">
                <svg className="w-12 h-12 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connect Your Calendar</h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">Sign in to view and manage your calendar events</p>
            </div>
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-8 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg flex items-center gap-3 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all mx-auto"
            >
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="w-6 h-6"
              />
              <span className="font-medium">{isLoading ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-6 p-6">
          {/* Left Sidebar - Calendar & Filters */}
          <div className="w-80 flex-shrink-0 space-y-4">
            {/* Month Navigation */}
            <MonthNavigation 
              selectedDate={selectedDate} 
              onDateChange={handleMonthChange} 
            />
            
            {/* Calendar Grid */}
            <CalendarGrid 
              selectedDate={selectedDate} 
              onDateSelect={handleDateSelect} 
            />
            
            {/* My Calendars List */}
            <CalendarList 
              calendars={availableCalendars}
              visibility={calendarVisibility}
              onToggleVisibility={handleToggleCalendarVisibility}
              onColorChange={handleCalendarColorChange}
            />
          </div>
          
          {/* Main Content - Events List */}
          <div className="flex-1 min-w-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Events Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {isSpecificDateSelected 
                      ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                      : selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    }
                  </h2>
                  <ViewToggle view={view} onViewChange={setView} />
                </div>
                <FilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
                
                {/* Calendar Summary */}
                {calendarSummary && calendarSummary.totalCalendars > 1 && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">{calendarSummary.totalEvents} events</span>
                    <span>•</span>
                    <span>{calendarSummary.totalCalendars} calendars</span>
                  </div>
                )}
              </div>
              
              {/* Events Content */}
              <div className="p-6">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-600 border-t-transparent mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading events...</p>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                      <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                      {searchTerm ? 'No events found' : 'No events'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'Try adjusting your search' : 'Create a new event to get started'}
                    </p>
                  </div>
                ) : (
                  <div className={view === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-3'}>
                    {filteredEvents.map((event) => {
                      const calendar = availableCalendars.find(cal => cal.id === (event.calendarId || 'primary'));
                      return (
                        <EventCard 
                          key={event.id} 
                          event={event} 
                          view={view} 
                          calendarColor={calendar?.color}
                          onEventClick={handleEventClick}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Event Details Modal */}
      <EventDetailsModal 
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        calendarColor={selectedEvent ? availableCalendars.find(cal => cal.id === (selectedEvent.calendarId || 'primary'))?.color : null}
      />
      
      {/* Event Creation Modal */}
      <EventCreateModal 
        isOpen={isCreateModalOpen}
        onClose={handleCreateModalClose}
        onEventCreated={handleEventCreated}
        availableCalendars={availableCalendars}
        selectedDate={selectedDate}
      />
    </div>
  );
};

export default GoogleCalendar;
