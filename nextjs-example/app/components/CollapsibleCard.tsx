"use client";
import React, { useState } from 'react';
import { FaChevronUp, FaChevronDown } from 'react-icons/fa';

const COLORS = {
  mainBg: '#3AAFA9',
  text: '#17252A',
  sidebar: '#2B7A78',
  white: '#FEFFFF',
  sidebarBg: '#DEF2F1',
};

interface CollapsibleCardProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  style?: React.CSSProperties;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({ 
  title, 
  children, 
  defaultOpen = true,
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div style={{ 
      background: COLORS.white,
      borderRadius: 12,
      boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
      marginBottom: 24,
      ...style
    }}>
      {/* Collapsible Header */}
      <div 
        onClick={toggleOpen}
        style={{ 
          padding: '24px 32px',
          borderBottom: isOpen ? `2px solid ${COLORS.sidebarBg}` : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s ease',
          borderRadius: isOpen ? '12px 12px 0 0' : '12px',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = COLORS.sidebarBg;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <h2 style={{ 
          color: COLORS.sidebar, 
          fontSize: 24, 
          fontWeight: 700, 
          margin: 0
        }}>
          {title}
        </h2>
        <div style={{
          color: COLORS.sidebar,
          fontSize: 16,
          transition: 'transform 0.2s ease'
        }}>
          {isOpen ? <FaChevronUp /> : <FaChevronDown />}
        </div>
      </div>
      
      {/* Collapsible Content */}
      {isOpen && (
        <div style={{ 
          padding: 32
        }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleCard; 