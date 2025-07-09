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
  FaSearch,
  FaDownload,
  FaFolder
} from 'react-icons/fa';
import CollapsibleCard from './CollapsibleCard';

const COLORS = {
  mainBg: '#3AAFA9',
  text: '#17252A',
  sidebar: '#2B7A78',
  white: '#FEFFFF',
  sidebarBg: '#DEF2F1',
};

interface MainContentProps {
  node: any;
  children: any[];
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

// Helper function to get file extension and icon
const getFileInfo = (node: any) => {
  const name = node.name || '';
  const extension = name.includes('.') ? name.split('.').pop()?.toLowerCase() : '';
  
  const getFileIcon = (ext: string) => {
    switch (ext) {
      case 'pdf':
        return <FaFilePdf style={{ color: '#d32f2f' }} />;
      case 'doc':
      case 'docx':
        return <FaFileWord style={{ color: '#1976d2' }} />;
      case 'xls':
      case 'xlsx':
        return <FaFileExcel style={{ color: '#388e3c' }} />;
      case 'ppt':
      case 'pptx':
        return <FaFilePowerpoint style={{ color: '#f57c00' }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'svg':
        return <FaFileImage style={{ color: '#7b1fa2' }} />;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
      case 'flv':
        return <FaFileVideo style={{ color: '#e91e63' }} />;
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
        return <FaFileAudio style={{ color: '#ff5722' }} />;
      case 'zip':
      case 'rar':
      case 'tar':
      case 'gz':
      case '7z':
        return <FaFileArchive style={{ color: '#795548' }} />;
      case 'txt':
      case 'md':
      case 'log':
        return <FaFileAlt style={{ color: '#607d8b' }} />;
      default:
        return <FaFile style={{ color: '#9e9e9e' }} />;
    }
  };
  
  return {
    extension: extension || 'unknown',
    icon: getFileIcon(extension || 'default')
  };
};

const MainContent: React.FC<MainContentProps> = ({ node, children }) => {
  const files = children.filter(isFile);
  const folders = children.filter(child => !isFile(child));

  const handleOpenFile = (fileNode: any) => {
    // Open file in a new tab/window using the SOAP + HTTP approach
    const contentUrl = `/api/content?nodeRef=${encodeURIComponent(fileNode.nodeRef)}`;
    window.open(contentUrl, '_blank');
  };

  const handleDownloadFile = (fileNode: any) => {
    // Download file using the SOAP + HTTP approach
    const downloadUrl = `/api/content?nodeRef=${encodeURIComponent(fileNode.nodeRef)}&download=true`;
    
    // Create a temporary link element and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileNode.name || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main style={{ 
      flex: 1, 
      background: COLORS.mainBg, 
      padding: 32, 
      boxSizing: 'border-box', 
      overflow: 'auto'
    }}>
      {node ? (
        <div style={{ 
          maxWidth: 1000, 
          margin: '0 auto'
        }}>
          {/* Node Details Card */}
          <CollapsibleCard title={node.name || 'Unnamed Item'} defaultOpen={true}>
            {/* Node Reference */}
            <div style={{ 
              color: COLORS.text, 
              opacity: 0.7, 
              fontSize: 14,
              fontFamily: 'monospace',
              marginBottom: 24,
              padding: '8px 12px',
              background: COLORS.sidebarBg,
              borderRadius: 4,
              overflowWrap: 'break-word'
            }}>
              {node.nodeRef}
            </div>

            {/* Basic Information */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ 
                color: COLORS.sidebar, 
                fontSize: 18, 
                fontWeight: 600, 
                marginBottom: 12 
              }}>
                Basic Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 8 }}>
                <div style={{ color: COLORS.text, fontWeight: 600 }}>Type:</div>
                <div style={{ color: COLORS.text }}>{node.type || 'Unknown'}</div>
                
                <div style={{ color: COLORS.text, fontWeight: 600 }}>Node Reference:</div>
                <div style={{ 
                  color: COLORS.text, 
                  fontFamily: 'monospace', 
                  fontSize: 12,
                  background: COLORS.sidebarBg,
                  padding: '4px 8px',
                  borderRadius: 4,
                  overflowWrap: 'break-word'
                }}>
                  {node.nodeRef}
                </div>
                
                {files.length > 0 && (
                  <>
                    <div style={{ color: COLORS.text, fontWeight: 600 }}>Files:</div>
                    <div style={{ color: COLORS.text }}>{files.length} file{files.length !== 1 ? 's' : ''}</div>
                  </>
                )}
                
                {folders.length > 0 && (
                  <>
                    <div style={{ color: COLORS.text, fontWeight: 600 }}>Folders:</div>
                    <div style={{ color: COLORS.text }}>{folders.length} folder{folders.length !== 1 ? 's' : ''}</div>
                  </>
                )}
              </div>
            </div>

            {/* Properties */}
            {node.properties && Object.keys(node.properties).length > 0 && (
              <div>
                <h3 style={{ 
                  color: COLORS.sidebar, 
                  fontSize: 18, 
                  fontWeight: 600, 
                  marginBottom: 12 
                }}>
                  Properties
                </h3>
                <div style={{ 
                  background: COLORS.sidebarBg,
                  borderRadius: 8,
                  padding: 16
                }}>
                  {Object.entries(node.properties).map(([key, value]) => (
                    <div key={key} style={{ 
                      marginBottom: 12,
                      paddingBottom: 12,
                      borderBottom: `1px solid rgba(43, 122, 120, 0.2)`
                    }}>
                      <div style={{ 
                        color: COLORS.sidebar, 
                        fontWeight: 600, 
                        fontSize: 14,
                        marginBottom: 4
                      }}>
                        {key}
                      </div>
                      <div style={{ 
                        color: COLORS.text, 
                        fontSize: 13,
                        fontFamily: typeof value === 'string' && value.length > 50 ? 'monospace' : 'inherit',
                        background: COLORS.white,
                        padding: '6px 10px',
                        borderRadius: 4,
                        border: `1px solid rgba(43, 122, 120, 0.2)`,
                        overflowWrap: 'break-word'
                      }}>
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleCard>

          {/* Folders Section */}
          {folders.length > 0 && (
            <CollapsibleCard title={`Folders (${folders.length})`} defaultOpen={true}>
              
              {/* Folders Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr',
                gap: 16,
                padding: '12px 0',
                borderBottom: `2px solid ${COLORS.sidebarBg}`,
                marginBottom: 8,
                fontWeight: 600,
                fontSize: 14,
                color: COLORS.sidebar
              }}>
                <div>Type</div>
                <div>Name</div>
              </div>
              
              {/* Folder Rows */}
              <div>
                {folders.map((folder, index) => {
                  const isLastItem = index === folders.length - 1;
                  
                  return (
                    <div 
                      key={folder.nodeRef || index} 
                      style={{ 
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr',
                        gap: 16,
                        padding: '16px 0',
                        borderBottom: isLastItem ? 'none' : `1px solid ${COLORS.sidebarBg}`,
                        alignItems: 'center',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.sidebarBg;
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Folder Icon */}
                      <div style={{ 
                        fontSize: 20,
                        textAlign: 'center',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <FaFolder style={{ color: '#f57c00' }} />
                      </div>
                      
                      {/* Folder Name */}
                      <div style={{ 
                        color: COLORS.text, 
                        fontWeight: 600, 
                        fontSize: 16,
                        overflowWrap: 'break-word',
                        lineHeight: 1.4
                      }}>
                        {folder.name || 'Unnamed Folder'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleCard>
          )}

          {/* Files Section */}
          {files.length > 0 && (
            <CollapsibleCard title={`Files (${files.length})`} defaultOpen={true}>
              
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 120px 180px',
                gap: 16,
                padding: '12px 0',
                borderBottom: `2px solid ${COLORS.sidebarBg}`,
                marginBottom: 8,
                fontWeight: 600,
                fontSize: 14,
                color: COLORS.sidebar
              }}>
                <div>Type</div>
                <div>Name</div>
                <div>Extension</div>
                <div style={{ textAlign: 'center' }}>Actions</div>
              </div>
              
              {/* File Rows */}
              <div>
                {files.map((file, index) => {
                  const fileInfo = getFileInfo(file);
                  const isLastItem = index === files.length - 1;
                  
                  return (
                    <div 
                      key={file.nodeRef || index} 
                      style={{ 
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr 120px 180px',
                        gap: 16,
                        padding: '16px 0',
                        borderBottom: isLastItem ? 'none' : `1px solid ${COLORS.sidebarBg}`,
                        alignItems: 'center',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.sidebarBg;
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* File Icon */}
                      <div style={{ 
                        fontSize: 20,
                        textAlign: 'center',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        {fileInfo.icon}
                      </div>
                      
                      {/* File Name */}
                      <div style={{ 
                        color: COLORS.text, 
                        fontWeight: 600, 
                        fontSize: 16,
                        overflowWrap: 'break-word',
                        lineHeight: 1.4
                      }}>
                        {file.name || 'Unnamed File'}
                      </div>
                      
                      {/* Extension */}
                      <div style={{ 
                        color: COLORS.text, 
                        fontSize: 14,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        opacity: 0.8
                      }}>
                        {fileInfo.extension}
                      </div>
                      
                      {/* Action Buttons */}
                      <div style={{ 
                        display: 'flex', 
                        gap: 8,
                        justifyContent: 'center'
                      }}>
                        <button
                          onClick={() => handleOpenFile(file)}
                          style={{ 
                            background: COLORS.sidebar,
                            color: COLORS.white,
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(43, 122, 120, 0.3)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <FaSearch /> Open
                        </button>
                        <button
                          onClick={() => handleDownloadFile(file)}
                          style={{ 
                            background: COLORS.text,
                            color: COLORS.white,
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(23, 37, 42, 0.3)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <FaDownload /> Download
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleCard>
          )}
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          flexDirection: 'column'
        }}>
          <div style={{ 
            color: COLORS.text, 
            opacity: 0.5, 
            fontSize: 20,
            marginBottom: 8
          }}>
            Select a folder to see its contents
          </div>
          <div style={{ 
            color: COLORS.text, 
            opacity: 0.4, 
            fontSize: 14
          }}>
            Navigate through folders in the sidebar or header
          </div>
        </div>
      )}
    </main>
  );
};

export default MainContent; 