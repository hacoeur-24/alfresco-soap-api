import { useEffect, useState } from 'react';
import { getRootNodeRef } from './alfrescoServer';

// Color palette from image
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

function App() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // New state for root nodes in sidebar
  const [rootNodes, setRootNodes] = useState<any[]>([]);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [sidebarError, setSidebarError] = useState<string | null>(null);
  const [currentNodeRef, setCurrentNodeRef] = useState<string | null>(null);
  const [nodeStack, setNodeStack] = useState<string[]>([]); // for navigation

  const fetchStores = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/stores');
      if (!res.ok) throw new Error('Failed to fetch stores');
      const data = await res.json();
      let storesArr = [];
      if (Array.isArray(data)) {
        storesArr = data;
      } else if (data.getStoresReturn) {
        storesArr = data.getStoresReturn;
      } else if (data.store) {
        storesArr = data.store;
      } else if (data.stores) {
        storesArr = data.stores;
      }
      setStores(storesArr);
      if (storesArr.length > 0 && !selectedStore) {
        setSelectedStore(storesArr[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
    // Ensure body and html take full width/height, no margin
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.width = '100vw';
    document.body.style.height = '100vh';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.documentElement.style.width = '100vw';
    document.documentElement.style.height = '100vh';
    // eslint-disable-next-line
  }, []);

  // On mount, fetch and set the root nodeRef
  useEffect(() => {
    getRootNodeRef().then(ref => {
      setCurrentNodeRef(ref);
      setNodeStack([ref]);
    }).catch(err => {
      setSidebarError('Failed to get root node: ' + err.message);
    });
    // eslint-disable-next-line
  }, []);

  // Fetch children of the current node
  useEffect(() => {
    if (!currentNodeRef) {
      setRootNodes([]);
      setSidebarError(null);
      return;
    }
    setSidebarLoading(true);
    setSidebarError(null);
    fetch(`/nodes/${encodeURIComponent(currentNodeRef)}/children`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch node children');
        return res.json();
      })
      .then(data => {
        let nodes = [];
        if (Array.isArray(data)) {
          nodes = data;
        } else if (data.children) {
          nodes = data.children;
        } else if (data.getChildrenReturn) {
          nodes = data.getChildrenReturn;
        } else {
          nodes = data;
        }
        setRootNodes(nodes);
      })
      .catch(err => {
        setSidebarError(err.message);
        setRootNodes([]);
      })
      .finally(() => setSidebarLoading(false));
  }, [currentNodeRef]);

  // Modal for error
  const ErrorModal = ({ message, onClose }: { message: string; onClose: () => void }) => (
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

  return (
    <div style={{ background: COLORS.mainBg, display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', overflowX: 'hidden', boxSizing: 'border-box', minHeight: '100vh' }}>
      {/* Top Navbar */}
      <nav style={{ display: 'flex', alignItems: 'center', background: COLORS.nav, color: COLORS.white, padding: '0 32px', height: 64, width: '100%', boxSizing: 'border-box' }}>
        <h2 style={{ marginRight: 32, fontWeight: 700, letterSpacing: 1, fontSize: 24, color: COLORS.white }}>Alfresco</h2>
        {stores.map((store) => (
          <button
            key={store.address}
            onClick={() => setSelectedStore(store)}
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
          onClick={fetchStores}
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
      {/* Main Layout */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, width: '100%' }}>
        {/* Sidebar */}
        {!error && (
          <aside style={{ width: 240, background: COLORS.sidebarBg, padding: '24px 0', boxSizing: 'border-box', borderRight: `2px solid ${COLORS.sidebar}` }}>
            {/* Navigation header */}
            <div style={{ color: COLORS.sidebar, textAlign: 'center', fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
              {nodeStack.length > 1 && (
                <button
                  onClick={() => {
                    if (nodeStack.length > 1) {
                      const newStack = [...nodeStack];
                      newStack.pop();
                      setNodeStack(newStack);
                      setCurrentNodeRef(newStack[newStack.length - 1]);
                    }
                  }}
                  style={{ marginRight: 8, background: 'none', border: 'none', color: COLORS.sidebar, cursor: 'pointer', fontSize: 18 }}
                  aria-label="Back"
                >
                  ←
                </button>
              )}
              {rootNodes.length > 0 ? (rootNodes[0].parentName || 'Browse') : 'Browse'}
            </div>
            <hr style={{ border: 0, borderTop: `1.5px solid ${COLORS.sidebar}`, margin: '0 16px 0 16px', marginBottom: 0 }} />
            {/* Node children list */}
            <div style={{ marginTop: 16, padding: '0 16px' }}>
              {sidebarLoading ? (
                <div style={{ color: COLORS.text, opacity: 0.7, textAlign: 'center' }}>Loading...</div>
              ) : sidebarError ? (
                <div style={{ color: 'red', fontSize: 14, textAlign: 'center' }}>{sidebarError}</div>
              ) : rootNodes.length === 0 ? (
                <div style={{ color: COLORS.text, opacity: 0.5, textAlign: 'center' }}>No nodes</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {rootNodes.map((node: any, idx: number) => (
                    <li key={node.nodeRef || idx} style={{
                      padding: '8px 0',
                      borderBottom: `1px solid ${COLORS.sidebarBg}`,
                      color: COLORS.text,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => {
                      setNodeStack([...nodeStack, node.nodeRef]);
                      setCurrentNodeRef(node.nodeRef);
                    }}
                    >
                      {node.name || node.nodeRef}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}
        {/* Main Content */}
        <main style={{ flex: 1, background: COLORS.mainBg, padding: 32, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!error && (
            selectedStore ? (
              <div style={{ color: COLORS.text, fontSize: 22, fontWeight: 500 }}>
                Main content for <span style={{ color: COLORS.sidebar }}>{selectedStore.address}</span>
              </div>
            ) : (
              <div style={{ color: COLORS.text, opacity: 0.5, fontSize: 20 }}>
                Select a store to see details
              </div>
            )
          )}
        </main>
      </div>
      {/* Error Modal */}
      {error && <ErrorModal message={error} onClose={() => setError(null)} />}
    </div>
  );
}

export default App;
