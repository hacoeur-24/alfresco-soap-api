"use client";
import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import ErrorModal from './components/ErrorModal';

// Color palette
const COLORS = {
  mainBg: '#3AAFA9',
};

interface Store {
  address: string;
}

export default function HomePage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [sidebarError, setSidebarError] = useState<string | null>(null);
  const [currentNode, setCurrentNode] = useState<any | null>(null);
  const [nodeStack, setNodeStack] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);

  // Fetch stores from API
  const fetchStores = async () => {
    setError(null);
    setSidebarLoading(true);
    try {
      const res = await fetch('/api/stores');
      if (!res.ok) throw new Error('Failed to fetch stores');
      const data = await res.json();
      console.log('Stores API : ', data);
      setStores(data);
      if (data.length > 0 && !selectedStore) {
        setSelectedStore(data[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSidebarLoading(false);
    }
  };

  // Fetch Company Home and its children when store changes
  useEffect(() => {
    if (!selectedStore) return;
    setSidebarLoading(true);
    setSidebarError(null);
    fetch(`/api/company-home?store=${encodeURIComponent(selectedStore.address)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load Company Home');
        return res.json();
      })
      .then(node => {
        setCurrentNode(node);
        setNodeStack([node]);
        return fetch(`/api/children?nodeRef=${encodeURIComponent(node.nodeRef)}&store=${encodeURIComponent(selectedStore.address)}`);
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load children');
        return res.json();
      })
      .then(children => {
        setChildren(children);
      })
      .catch(err => {
        setSidebarError('Failed to load Company Home: ' + err.message);
        setCurrentNode(null);
        setChildren([]);
      })
      .finally(() => setSidebarLoading(false));
  }, [selectedStore]);

  // Fetch children when navigating
  const navigateToNode = (node: any) => {
    setSidebarLoading(true);
    setSidebarError(null);
    fetch(`/api/children?nodeRef=${encodeURIComponent(node.nodeRef)}&store=${encodeURIComponent(selectedStore?.address || '')}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load children');
        return res.json();
      })
      .then(children => {
        setCurrentNode(node);
        setNodeStack(prev => [...prev, node]);
        setChildren(children);
      })
      .catch(err => {
        setSidebarError('Failed to load children: ' + err.message);
      })
      .finally(() => setSidebarLoading(false));
  };

  // Go back in navigation
  const goBack = () => {
    if (nodeStack.length > 1) {
      const newStack = [...nodeStack];
      newStack.pop();
      const prevNode = newStack[newStack.length - 1];
      setSidebarLoading(true);
      setSidebarError(null);
      fetch(`/api/children?nodeRef=${encodeURIComponent(prevNode.nodeRef)}&store=${encodeURIComponent(selectedStore?.address || '')}`)
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
    fetchStores();
    // eslint-disable-next-line
  }, []);

  return (
    <div style={{ background: COLORS.mainBg, display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', overflowX: 'hidden', boxSizing: 'border-box', minHeight: '100vh', minWidth: '100vw', width: '100vw' }}>
      <Header
        stores={stores}
        selectedStore={selectedStore}
        onSelectStore={setSelectedStore}
        onReload={fetchStores}
      />
      <div style={{ flex: 1, display: 'flex', minHeight: 0, width: '100%' }}>
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
        <MainContent node={currentNode} />
      </div>
      {error && <ErrorModal message={error} onClose={() => setError(null)} />}
    </div>
  );
}
