import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

export default function CustomDatePicker({ value, onChange, placeholder = "Select Date" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef(null);

  useEffect(() => {
    if (value) {
      const [year, month, day] = value.split('-');
      setCurrentMonth(new Date(year, month - 1, 1));
    } else {
      setCurrentMonth(new Date());
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const handlePrevMonth = (e) => {
    e.preventDefault();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.preventDefault();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDate = (day) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    onChange(`${year}-${month}-${dayStr}`);
    setIsOpen(false);
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth);
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="custom-datepicker-container" ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        className="form-input" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          cursor: 'pointer',
          color: value ? 'inherit' : 'var(--text-secondary)',
          userSelect: 'none'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{value ? value.split('-').reverse().join('-') : placeholder}</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {value && (
            <div 
              style={{ display: 'flex', alignItems: 'center', padding: '0.1rem' }}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
            >
              <X size={14} style={{ color: 'var(--text-secondary)' }} />
            </div>
          )}
          <CalendarIcon size={16} style={{ color: 'var(--text-secondary)' }} />
        </div>
      </div>
      
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 9999,
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        >
          <div 
            className="glass-card animate-fade-in" 
            style={{
              zIndex: 10000,
              width: '100%',
              maxWidth: '320px',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <button type="button" className="btn btn-icon" onClick={handlePrevMonth} style={{ padding: '0.25rem' }}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ fontWeight: 600 }}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button type="button" className="btn btn-icon" onClick={handleNextMonth} style={{ padding: '0.25rem' }}>
              <ChevronRight size={16} />
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', textAlign: 'center', marginBottom: '0.5rem' }}>
            {dayNames.map(day => (
              <div key={day} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{day}</div>
            ))}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
            {days.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} />;
              
              const isSelected = value && 
                parseInt(value.split('-')[0]) === currentMonth.getFullYear() &&
                parseInt(value.split('-')[1]) === currentMonth.getMonth() + 1 &&
                parseInt(value.split('-')[2]) === day;
                
              const isToday = new Date().getFullYear() === currentMonth.getFullYear() &&
                new Date().getMonth() === currentMonth.getMonth() &&
                new Date().getDate() === day;
                
              return (
                <div 
                  key={index} 
                  onClick={() => handleSelectDate(day)}
                  style={{
                    padding: '0.4rem 0',
                    textAlign: 'center',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    backgroundColor: isSelected ? 'var(--primary)' : isToday ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: isSelected ? '#fff' : 'inherit',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = isToday ? 'rgba(255,255,255,0.1)' : 'transparent';
                  }}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
