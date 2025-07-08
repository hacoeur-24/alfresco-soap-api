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

interface Store {
  address: string;
}

interface HeaderProps {
  stores: Store[];
  selectedStore: Store | null;
  onSelectStore: (store: Store) => void;
  onReload: () => void;
}

const Header: React.FC<HeaderProps> = ({ stores, selectedStore, onSelectStore, onReload }) => (
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
    {stores.map((store) => (
      <button
        key={store.address}
        onClick={() => onSelectStore(store)}
        style={{
          marginRight: 16,
          background: selectedStore?.address === store.address ? COLORS.sidebar : COLORS.sidebarBg,
          color: selectedStore?.address === store.address ? COLORS.white : COLORS.text,
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
        onMouseOut={e => (e.currentTarget.style.background = selectedStore?.address === store.address ? COLORS.sidebar : COLORS.sidebarBg)}
        onFocus={e => (e.currentTarget.style.background = COLORS.sidebar)}
        onBlur={e => (e.currentTarget.style.background = selectedStore?.address === store.address ? COLORS.sidebar : COLORS.sidebarBg)}
        aria-pressed={selectedStore?.address === store.address}
      >
        {store.address}
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
      Reload Stores
    </button>
  </nav>
);

export default Header; 