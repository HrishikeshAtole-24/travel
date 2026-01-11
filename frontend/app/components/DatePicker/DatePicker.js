'use client';

import { useState, useRef, useEffect } from 'react';
import './DatePicker.css';

export default function DatePicker({ 
  label = "DATE",
  icon = "fa-calendar-alt",
  value,
  onChange,
  onDateChange,
  isReturn = false,
  departureDate = null,
  returnDate = null,
  placeholder = "Select Date",
  required = false,
  onBothDatesSelected,
  isOpen = false,
  onToggle,
  onClose
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Sample flight prices - in real app, this would come from API
  const flightPrices = {
    '2026-01-04': 12500, // Added price for January 4th
    '2026-01-05': 12917,
    '2026-01-07': 12917,
    '2026-01-08': 12238,
    '2026-01-09': 12238,
    '2026-01-10': 11734,
    '2026-01-11': 11734,
    '2026-01-12': 12763,
    '2026-01-13': 12238,
    '2026-01-14': 12448,
    '2026-01-15': 11055,
    '2026-01-23': 11392,
    '2026-01-29': 11055,
    '2026-01-31': 11265,
    '2026-02-12': 12111,
    '2026-02-13': 11055,
  };

  // Format date for display
  const formatDisplayDate = (date) => {
    if (!date) return getPlaceholder();
    
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = d.getFullYear().toString().slice(-2);
    
    return `${day} ${month}'${year}`;
  };

  // Get weekday for subtext
  const getWeekday = (date) => {
    if (!date) return 'Select Date';
    return new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
  };
  
  // Update placeholder dynamically for return dates
  const getPlaceholder = () => {
    if (isReturn && !value) {
      return 'Select Date';
    }
    return placeholder;
  };

  // Check if date is in range between departure and return
  const isInDateRange = (current) => {
    if (!departureDate || !returnDate) {
      return false;
    }
    
    const dept = new Date(departureDate);
    const ret = new Date(returnDate);
    const currentDate = new Date(current);
    
    // Reset time to compare dates only
    dept.setHours(0, 0, 0, 0);
    ret.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
    
    // Only highlight if there are actual dates BETWEEN departure and return
    // For consecutive dates (like 4th and 5th), there should be no range
    const isInRange = currentDate > dept && currentDate < ret;
    
    return isInRange;
  };
  
  // Check if date is departure or return
  const isDateEndpoint = (current) => {
    if (!departureDate && !returnDate) return false;
    const dateStr = current.toISOString().split('T')[0];
    return dateStr === departureDate || dateStr === returnDate;
  };

  // Generate calendar for a month
  const generateCalendar = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const calendar = [];
    const current = new Date(startDate);

    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = current.toISOString().split('T')[0];
        const isCurrentMonth = current.getMonth() === month;
        
        // FIX: Use consistent local date calculation for today check (no UTC)
        const today = new Date();
        const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const isToday = dateStr === todayDateStr;
        
        const isSelected = value && dateStr === value;
        const isPast = current < new Date().setHours(0, 0, 0, 0);
        const isMinDate = isReturn && departureDate && current <= new Date(departureDate);
        
        // FIXED: Simple endpoint check only
        const isEndpoint = (dateStr === departureDate || dateStr === returnDate);
        
        // FIXED: Range only between departure and return, not including endpoints
        const isInRange = departureDate && returnDate && dateStr > departureDate && dateStr < returnDate;
        
        // FIX: Use dateStr to get correct day number to avoid timezone issues
        const dayNumber = parseInt(dateStr.split('-')[2]);
        
        weekDays.push({
          date: new Date(current),
          dateStr,
          day: dayNumber,  // Use consistent day calculation
          isCurrentMonth,
          isToday,
          isSelected,
          isPast,
          isMinDate,
          isInRange,
          isEndpoint,
          price: flightPrices[dateStr]
        });
        
        current.setDate(current.getDate() + 1);
      }
      calendar.push(weekDays);
      
      // Stop if we've filled the month
      if (current.getMonth() !== month) break;
    }

    return calendar;
  };

  // Handle date selection with MMT-style flow
  const handleDateSelect = (dateData) => {
    if (dateData.isPast || dateData.isMinDate) return;
    
    setSelectedDate(dateData.date);
    
    // Notify parent of date change
    if (onChange) {
      onChange(dateData.dateStr);
    }
    
    // Additional callback for complex date handling
    if (onDateChange) {
      onDateChange(dateData.dateStr, isReturn);
    }
    
    // Let parent handle calendar state management
    // Calendar closing is now controlled by parent component
  };

  // Navigate months
  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  // Get next month for dual view
  const getNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth;
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        inputRef.current && 
        !inputRef.current.contains(event.target)
      ) {
        onClose && onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Update selected date when value prop changes
  useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value));
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={`date-picker-mmt ${isOpen ? 'mobile-open' : ''} ${!value && isReturn ? 'return-cleared' : ''}`}>
      <label className="field-label">
        <i className={`fas ${icon}`}></i> {label}
      </label>
      
      <div className="date-picker-container">
        <div 
          ref={inputRef}
          className="date-input-display"
          onClick={() => onToggle && onToggle()}
        >
          <span className="date-value">
            {formatDisplayDate(value || selectedDate)}
          </span>
        </div>
        
        <div className="field-subtext">
          {getWeekday(value || selectedDate)}
        </div>

        {/* Calendar Dropdown */}
        {isOpen && (
          <div ref={dropdownRef} className="calendar-dropdown">
            <div className="calendar-header">
              <button type="button" onClick={() => navigateMonth(-1)} className="nav-button">
                <i className="fas fa-chevron-left"></i>
              </button>
              
              <div className="months-display">
                <span className="month-name">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <span className="month-name">
                  {monthNames[getNextMonth().getMonth()]} {getNextMonth().getFullYear()}
                </span>
              </div>
              
              <button type="button" onClick={() => navigateMonth(1)} className="nav-button">
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>

            <div className="dual-calendar">
              {/* First Month */}
              <div className="calendar-month">
                <div className="weekday-headers">
                  {weekDays.map(day => (
                    <div key={day} className="weekday-header">{day}</div>
                  ))}
                </div>
                
                <div className="calendar-grid">
                  {generateCalendar(currentMonth).map((week, weekIndex) => (
                    <div key={weekIndex} className="calendar-week">
                      {week.map((dateData, dayIndex) => (
                        <div
                          key={dayIndex}
                          className={`calendar-day ${
                            !dateData.isCurrentMonth ? 'other-month' : ''
                          } ${
                            dateData.isToday ? 'today' : ''
                          } ${
                            dateData.isSelected ? 'selected' : ''
                          } ${
                            dateData.isEndpoint ? 'endpoint' : ''
                          } ${
                            dateData.isInRange ? 'in-range' : ''
                          } ${
                            dateData.isPast || dateData.isMinDate ? 'disabled' : 'available'
                          }`}
                          onClick={() => handleDateSelect(dateData)}
                          data-date={dateData.dateStr}
                          data-selected={dateData.isSelected}
                          data-endpoint={dateData.isEndpoint}
                          data-in-range={dateData.isInRange}
                        >
                          <span className="day-number">{dateData.day}</span>
                          {dateData.price && dateData.isCurrentMonth && (
                            <span className="day-price">₹{dateData.price.toLocaleString()}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Second Month */}
              <div className="calendar-month">
                <div className="weekday-headers">
                  {weekDays.map(day => (
                    <div key={day} className="weekday-header">{day}</div>
                  ))}
                </div>
                
                <div className="calendar-grid">
                  {generateCalendar(getNextMonth()).map((week, weekIndex) => (
                    <div key={weekIndex} className="calendar-week">
                      {week.map((dateData, dayIndex) => (
                        <div
                          key={dayIndex}
                          className={`calendar-day ${
                            !dateData.isCurrentMonth ? 'other-month' : ''
                          } ${
                            dateData.isToday ? 'today' : ''
                          } ${
                            dateData.isSelected ? 'selected' : ''
                          } ${
                            dateData.isEndpoint ? 'endpoint' : ''
                          } ${
                            dateData.isInRange ? 'in-range' : ''
                          } ${
                            dateData.isPast || dateData.isMinDate ? 'disabled' : 'available'
                          }`}
                          onClick={() => handleDateSelect(dateData)}
                          data-date={dateData.dateStr}
                          data-selected={dateData.isSelected}
                          data-endpoint={dateData.isEndpoint}
                          data-in-range={dateData.isInRange}
                        >
                          <span className="day-number">{dateData.day}</span>
                          {dateData.price && dateData.isCurrentMonth && (
                            <span className="day-price">₹{dateData.price.toLocaleString()}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="calendar-footer">
              <span className="price-note">Showing our lowest prices in ₹</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}