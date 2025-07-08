"use client";
import React from 'react';

const COLORS = {
  mainBg: '#3AAFA9',
  text: '#17252A',
  sidebar: '#2B7A78',
};

interface MainContentProps {
  node: any;
}

const MainContent: React.FC<MainContentProps> = ({ node }) => (
  <main style={{ flex: 1, background: COLORS.mainBg, padding: 32, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {node ? (
      <div style={{ color: COLORS.text, fontSize: 22, fontWeight: 500 }}>
        Main content for <span style={{ color: COLORS.sidebar }}>{node.name || node.nodeRef}</span>
      </div>
    ) : (
      <div style={{ color: COLORS.text, opacity: 0.5, fontSize: 20 }}>
        Select a node to see details
      </div>
    )}
  </main>
);

export default MainContent; 