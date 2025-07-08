"use client";
import React from 'react';

const COLORS = {
  nav: '#17252A',
  sidebar: '#2B7A78',
  sidebarBg: '#DEF2F1',
  mainBg: '#3AAFA9',
  text: '#17252A',
  white: '#FEFFFF',
};

interface HeaderProps {
  roots: any[];
  selectedRoot: any;
  onSelectRoot: (root: any) => void;
  onReload: () => void;
}

const Header: React.FC<HeaderProps> = ({ roots, selectedRoot, onSelectRoot, onReload }) => (
  <nav style={{
    display: 'flex',
    alignItems: 'center',
    background: COLORS.nav,
    color: COLORS.white,
    padding: '0 32px',
    height: 64,
    width: '100%',
    boxSizing: 'border-box',
  }}>
    <h2 style={{ marginRight: 32, fontWeight: 700, letterSpacing: 1, fontSize: 24, color: COLORS.white }}>
      Alfresco
    </h2>
    {roots.map((root, idx) => (
      <button
        key={root.nodeRef || root.name || idx}
        onClick={() => onSelectRoot(root)}
        style={{
          marginRight: 16,
          background: selectedRoot?.nodeRef === root.nodeRef ? COLORS.sidebar : COLORS.sidebarBg,
          color: selectedRoot?.nodeRef === root.nodeRef ? COLORS.white : COLORS.text,
          border: 'none',
          borderRadius: 6,
          padding: '8px 18px',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 16,
          transition: 'background 0.2s, color 0.2s',
          outline: 'none',
        }}
        onMouseOver={e => (e.currentTarget.style.background = COLORS.sidebar)}
        onMouseOut={e => (e.currentTarget.style.background = selectedRoot?.nodeRef === root.nodeRef ? COLORS.sidebar : COLORS.sidebarBg)}
        onFocus={e => (e.currentTarget.style.background = COLORS.sidebar)}
        onBlur={e => (e.currentTarget.style.background = selectedRoot?.nodeRef === root.nodeRef ? COLORS.sidebar : COLORS.sidebarBg)}
        aria-pressed={selectedRoot?.nodeRef === root.nodeRef}
      >
        {root.name || root.nodeRef}
      </button>
    ))}
    <div style={{ flex: 1 }} />
    <button
      onClick={onReload}
      style={{
        background: COLORS.sidebar,
        color: COLORS.white,
        border: 'none',
        borderRadius: 6,
        padding: '8px 18px',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: 16,
        marginLeft: 16,
      }}
    >
      Reload
    </button>
  </nav>
);

export default Header; 