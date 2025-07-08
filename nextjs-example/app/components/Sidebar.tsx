"use client";
import React from 'react';

const COLORS = {
  sidebar: '#2B7A78',
  sidebarBg: '#DEF2F1',
  text: '#17252A',
};

interface SidebarProps {
  nodes: any[];
  nodeStack: any[];
  loading: boolean;
  error: string | null;
  onNodeClick: (node: any) => void;
  onBack: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ nodes, nodeStack, loading, error, onNodeClick, onBack }) => (
  <aside style={{ width: 240, background: COLORS.sidebarBg, padding: '24px 0', boxSizing: 'border-box', borderRight: `2px solid ${COLORS.sidebar}` }}>
    {/* Navigation header */}
    <div style={{ color: COLORS.sidebar, textAlign: 'center', fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
      {nodeStack.length > 1 && (
        <button
          onClick={onBack}
          style={{ marginRight: 8, background: 'none', border: 'none', color: COLORS.sidebar, cursor: 'pointer', fontSize: 18 }}
          aria-label="Back"
        >
          ←
        </button>
      )}
      {nodeStack[nodeStack.length - 1]?.name || 'Browse'}
    </div>
    <hr style={{ border: 0, borderTop: `1.5px solid ${COLORS.sidebar}`, margin: '0 16px 0 16px', marginBottom: 0 }} />
    {/* Node children list */}
    <div style={{ marginTop: 16, padding: '0 16px' }}>
      {loading ? (
        <div style={{ color: COLORS.text, opacity: 0.7, textAlign: 'center' }}>Loading...</div>
      ) : error ? (
        <div style={{ color: 'red', fontSize: 14, textAlign: 'center' }}>{error}</div>
      ) : nodes.length === 0 ? (
        <div style={{ color: COLORS.text, opacity: 0.5, textAlign: 'center' }}>No nodes</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {nodes.map((node: any, idx: number) => (
            <li key={node.nodeRef || idx} style={{
              padding: '8px 0',
              borderBottom: `1px solid ${COLORS.sidebarBg}`,
              color: COLORS.text,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onClick={() => onNodeClick(node)}
            >
              {node.name || node.nodeRef}
            </li>
          ))}
        </ul>
      )}
    </div>
  </aside>
);

export default Sidebar; 