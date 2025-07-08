"use client";
import React from 'react';
import { 
  FaFilePdf, 
  FaFileWord, 
  FaFileExcel, 
  FaFilePowerpoint, 
  FaFileImage, 
  FaFileVideo, 
  FaFileAudio, 
  FaFileArchive, 
  FaFileAlt, 
  FaFile,
  FaFolder,
  FaFolderOpen
} from 'react-icons/fa';

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

// Helper function to determine if a node is a file based on its type
const isFile = (node: any): boolean => {
  if (!node || !node.type) return false;
  const type = node.type.toLowerCase();
  // Check if it's explicitly a folder type
  if (type.includes('folder') || type.includes('container') || type.includes('space')) {
    return false;
  }
  // If it has no file extension, it's likely a folder
  const name = node.name || '';
  if (!name.includes('.')) {
    return false;
  }
  return true;
};

// Helper function to get appropriate icon for a node
const getNodeIcon = (node: any) => {
  if (!isFile(node)) {
    // It's a folder
    return <FaFolder style={{ color: '#f57c00', fontSize: 16 }} />;
  }
  
  // It's a file - determine type by extension
  const name = node.name || '';
  const extension = name.includes('.') ? name.split('.').pop()?.toLowerCase() : '';
  
  const iconStyle = { fontSize: 16 };
  
  switch (extension) {
    case 'pdf':
      return <FaFilePdf style={{ ...iconStyle, color: '#d32f2f' }} />;
    case 'doc':
    case 'docx':
      return <FaFileWord style={{ ...iconStyle, color: '#1976d2' }} />;
    case 'xls':
    case 'xlsx':
      return <FaFileExcel style={{ ...iconStyle, color: '#388e3c' }} />;
    case 'ppt':
    case 'pptx':
      return <FaFilePowerpoint style={{ ...iconStyle, color: '#f57c00' }} />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'svg':
      return <FaFileImage style={{ ...iconStyle, color: '#7b1fa2' }} />;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'flv':
      return <FaFileVideo style={{ ...iconStyle, color: '#e91e63' }} />;
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
      return <FaFileAudio style={{ ...iconStyle, color: '#ff5722' }} />;
    case 'zip':
    case 'rar':
    case 'tar':
    case 'gz':
    case '7z':
      return <FaFileArchive style={{ ...iconStyle, color: '#795548' }} />;
    case 'txt':
    case 'md':
    case 'log':
      return <FaFileAlt style={{ ...iconStyle, color: '#607d8b' }} />;
    default:
      return <FaFile style={{ ...iconStyle, color: '#9e9e9e' }} />;
  }
};

const Sidebar: React.FC<SidebarProps> = ({ nodes, nodeStack, loading, error, onNodeClick, onBack }) => (
  <aside style={{ 
    width: 240, 
    background: COLORS.sidebarBg, 
    boxSizing: 'border-box', 
    borderRight: `2px solid ${COLORS.sidebar}`,
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  }}>
    {/* Navigation header - fixed at top */}
    <div style={{ 
      padding: '24px 16px 16px 16px',
      color: COLORS.sidebar, 
      fontWeight: 700, 
      fontSize: 18,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      position: 'relative'
    }}>
      {nodeStack.length > 1 ? (
        <button
          onClick={onBack}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: COLORS.sidebar, 
            cursor: 'pointer', 
            fontSize: 18,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            textAlign: 'left',
            fontWeight: 700
          }}
          aria-label="Back"
        >
          <span style={{ marginRight: 8 }}>←</span>
          <span>{nodeStack[nodeStack.length - 1]?.name || 'Browse'}</span>
        </button>
      ) : (
        <span style={{ flex: 1, textAlign: 'center' }}>
          {nodeStack[nodeStack.length - 1]?.name || 'Browse'}
        </span>
      )}
    </div>
    <hr style={{ 
      border: 0, 
      borderTop: `1.5px solid ${COLORS.sidebar}`, 
      margin: '0 16px', 
      flexShrink: 0
    }} />
    
    {/* Scrollable content area */}
    <div style={{ 
      flex: 1,
      overflow: 'auto',
      padding: '16px',
      minHeight: 0 // Important for flex child to allow shrinking
    }}>
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
              padding: '12px 8px',
              borderBottom: `1px solid rgba(43, 122, 120, 0.1)`,
              color: COLORS.text,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.15s',
              borderRadius: 4,
              marginBottom: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(43, 122, 120, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            onClick={() => onNodeClick(node)}
            >
              <span style={{ flexShrink: 0 }}>{getNodeIcon(node)}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.name || node.nodeRef}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  </aside>
);

export default Sidebar; 