"use client";
import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import ErrorModal from './components/ErrorModal';

// Color palette
const COLORS = {
  mainBg: '#3AAFA9',
  sidebar: '#2B7A78',
  white: '#FEFFFF',
};

export default function HomePage() {
  const [companyHomeChildren, setCompanyHomeChildren] = useState<any[]>([]);
  const [selectedRoot, setSelectedRoot] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [sidebarError, setSidebarError] = useState<string | null>(null);
  const [currentNode, setCurrentNode] = useState<any | null>(null);
  const [nodeStack, setNodeStack] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);

  // Fetch Company Home and its children on mount
  const fetchCompanyHomeAndChildren = async () => {
    setError(null);
    setSidebarLoading(true);
    try {
      const res = await fetch('/api/alfresco?action=company-home');
      if (!res.ok) throw new Error('Failed to fetch Company Home');
      const companyHome = await res.json();
      const childrenRes = await fetch(`/api/alfresco?action=children&nodeRef=${encodeURIComponent(companyHome.nodeRef)}`);
      if (!childrenRes.ok) throw new Error('Failed to fetch Company Home children');
      const children = await childrenRes.json();
      setCompanyHomeChildren(children);
      // Optionally, select the first root by default
      // setSelectedRoot(children[0] || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSidebarLoading(false);
    }
  };

  // When a root (e.g., Sites) is selected, show its children in the sidebar
  useEffect(() => {
    if (!selectedRoot || !selectedRoot.nodeRef) {
      setChildren([]);
      setNodeStack([]);
      setCurrentNode(null);
      return;
    }
    setSidebarLoading(true);
    setSidebarError(null);
    fetch(`/api/alfresco?action=children&nodeRef=${encodeURIComponent(selectedRoot.nodeRef)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load children');
        return res.json();
      })
      .then(children => {
        setChildren(children);
        setNodeStack([selectedRoot]);
        setCurrentNode(selectedRoot); // Show the selected root in main content too
      })
      .catch(err => {
        setSidebarError('Failed to load children: ' + err.message);
        setChildren([]);
        setNodeStack([]);
        setCurrentNode(null);
      })
      .finally(() => setSidebarLoading(false));
  }, [selectedRoot]);

  // When a node is clicked in the sidebar, fetch its children
  const navigateToNode = (node: any) => {
    if (!node || !node.nodeRef) {
      setSidebarError('Invalid node selected.');
      return;
    }
    setSidebarLoading(true);
    setSidebarError(null);
    fetch(`/api/alfresco?action=children&nodeRef=${encodeURIComponent(node.nodeRef)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load children');
        return res.json();
      })
      .then(children => {
        // Always set the current node and its children
        setCurrentNode(node);
        // If the node has children, also navigate into it for sidebar
        if (children && children.length > 0) {
          setNodeStack(prev => [...prev, node]);
          setChildren(children);
        }
        // If no children, keep current sidebar but show node details in main content
      })
      .catch(err => {
        // If we can't get children (might be a file), show the node in main content
        setCurrentNode(node);
        setSidebarError(null); // Clear any previous errors since this might be expected for files
      })
      .finally(() => setSidebarLoading(false));
  };

  // Go back in navigation
  const goBack = () => {
    if (nodeStack.length > 1) {
      const newStack = [...nodeStack];
      newStack.pop();
      const prevNode = newStack[newStack.length - 1];
      if (!prevNode || !prevNode.nodeRef) {
        setSidebarError('Invalid node in navigation stack.');
        setChildren([]);
        setNodeStack([]);
        setCurrentNode(null);
        return;
      }
      setSidebarLoading(true);
      setSidebarError(null);
      fetch(`/api/alfresco?action=children&nodeRef=${encodeURIComponent(prevNode.nodeRef)}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to load children');
          return res.json();
        })
        .then(children => {
          setCurrentNode(prevNode);
          setNodeStack(newStack);
          setChildren(children);
        })
        .catch(err => {
          setSidebarError('Failed to load children: ' + err.message);
        })
        .finally(() => setSidebarLoading(false));
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchCompanyHomeAndChildren();
    // eslint-disable-next-line
  }, []);

  return (
    <div style={{ 
      background: COLORS.mainBg, 
      display: 'flex', 
      flexDirection: 'column', 
      fontFamily: 'sans-serif', 
      boxSizing: 'border-box', 
      height: '100vh', 
      width: '100vw',
      overflow: 'hidden'
    }}>
      <Header
        roots={companyHomeChildren}
        selectedRoot={selectedRoot}
        onSelectRoot={setSelectedRoot}
        onReload={fetchCompanyHomeAndChildren}
      />
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        minHeight: 0, 
        width: '100%',
        overflow: 'hidden'
      }}>
        {!error && (
          <Sidebar
            nodes={children}
            nodeStack={nodeStack}
            loading={sidebarLoading}
            error={sidebarError}
            onNodeClick={navigateToNode}
            onBack={goBack}
          />
        )}
        <MainContent node={currentNode} children={children} />
      </div>
      {error && <ErrorModal message={error} onClose={() => setError(null)} />}
    </div>
  );
}
