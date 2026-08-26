import React, { useState, useRef, useEffect } from 'react';

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
  className,
  style,
  disabled,
  required
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const wrapperRef = useRef(null);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', ...style }}>
      <input
        className={className}
        style={{ width: '100%', boxSizing: 'border-box', ...style }}
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        disabled={disabled}
        required={required}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
      />
      {isOpen && !disabled && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          maxHeight: '200px',
          overflowY: 'auto',
          margin: 0,
          padding: 0,
          listStyle: 'none',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          zIndex: 1000,
          boxShadow: 'var(--glass-shadow)',
          marginTop: '4px'
        }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <li
                key={index}
                style={{
                  padding: '0.5rem 0.75rem',
                  cursor: 'pointer',
                  borderBottom: index === filteredOptions.length - 1 ? 'none' : '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input onBlur
                  setSearchTerm(option);
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                {option}
              </li>
            ))
          ) : (
            <li style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No options found
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
