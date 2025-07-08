import express from 'express';
import dotenv from 'dotenv';
import { AuthenticationService } from './services/AuthenticationService';
import { RepositoryService } from './services/RepositoryService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const ALFRESCO_URL = process.env.ALFRESCO_URL!;
const ALFRESCO_USER = process.env.ALFRESCO_USER!;
const ALFRESCO_PASS = process.env.ALFRESCO_PASS!;

let ticket: string | null = null;
let repositoryService: RepositoryService;

async function bootstrap() {
  // Authenticate and get ticket
  const authService = new AuthenticationService(ALFRESCO_URL);
  ticket = await authService.login(ALFRESCO_USER, ALFRESCO_PASS);

  // Instantiate RepositoryService and set ticket header
  repositoryService = new RepositoryService(ALFRESCO_URL);
  repositoryService.setTicket(ticket, ALFRESCO_USER);

  // API endpoint: GET /stores
  app.get('/stores', async (req, res) => {
    try {
      const stores = await repositoryService.getStores();
      res.json(stores);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // API endpoint: GET /stores/:storeId/root-nodes
  app.get('/stores/:storeId/root-nodes', async (req, res) => {
    try {
      const { storeId } = req.params;
      const children = await repositoryService.getRootChildren(storeId);
      res.json(children);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // API endpoint: GET /nodes/:nodeRef/children
  app.get('/nodes/:nodeRef/children', async (req, res) => {
    try {
      const { nodeRef } = req.params;
      // nodeRef may be URL-encoded, decode it
      const decodedNodeRef = decodeURIComponent(nodeRef);
      const children = await repositoryService.getNodeChildren(decodedNodeRef);
      res.json(children);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // API endpoint: GET /company-home-noderef
  app.get('/company-home-noderef', async (req, res) => {
    try {
      // Always use SpacesStore for this query
      const query = {
        language: 'lucene',
        statement: 'PATH:"/app:company_home"',
      };
      const storeObj = { scheme: 'workspace', address: 'SpacesStore' };
      const result = await repositoryService.query(storeObj, query, false);
      const nodes = result.queryReturn || result.nodes || [];
      const arr = Array.isArray(nodes) ? nodes : [nodes];
      if (arr.length > 0 && arr[0].nodeRef) {
        res.json({ nodeRef: arr[0].nodeRef });
      } else {
        res.status(404).json({ error: 'Company Home node not found' });
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
}); 