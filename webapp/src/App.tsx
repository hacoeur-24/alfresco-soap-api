import React, { useEffect, useState } from 'react';

interface Store {
  address: string;
  protocol: string;
}

function App() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStores = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/stores');
      if (!res.ok) throw new Error('Failed to fetch stores');
      const data = await res.json();
      // Support both array and object response, and getStoresReturn
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Alfresco Stores</h1>
      <button onClick={fetchStores} disabled={loading} style={{ marginBottom: 16 }}>
        {loading ? 'Loading...' : 'Reload Stores'}
      </button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <table border={1} cellPadding={8} style={{ minWidth: 300 }}>
        <thead>
          <tr>
            <th>Protocol</th>
            <th>Address</th>
          </tr>
        </thead>
        <tbody>
          {stores.length === 0 && !loading ? (
            <tr><td colSpan={2}>No stores found.</td></tr>
          ) : (
            stores.map((store, idx) => (
              <tr key={idx}>
                <td>{store.protocol}</td>
                <td>{store.address}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;
