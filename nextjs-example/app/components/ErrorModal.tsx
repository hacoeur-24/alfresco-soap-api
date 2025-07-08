"use client";
import React from 'react';

const COLORS = {
  nav: '#17252A',
  white: '#FEFFFF',
  text: '#17252A',
};

interface ErrorModalProps {
  message: string;
  onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ message, onClose }) => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(23, 37, 42, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  }}>
    <div style={{
      background: COLORS.white,
      color: COLORS.text,
      borderRadius: 12,
      boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      padding: '32px 40px',
      minWidth: 320,
      maxWidth: '90vw',
      textAlign: 'center',
    }}>
      <h2 style={{ color: COLORS.nav, marginBottom: 16 }}>Backend Error</h2>
      <p style={{ marginBottom: 24 }}>{message}</p>
      <button
        onClick={onClose}
        style={{
          background: COLORS.nav,
          color: COLORS.white,
          border: 'none',
          borderRadius: 6,
          padding: '10px 24px',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 16,
        }}
      >
        Dismiss
      </button>
    </div>
  </div>
);

export default ErrorModal; 