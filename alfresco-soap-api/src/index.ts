import { AuthenticationService } from './services/AuthenticationService';
import { RepositoryService } from './services/RepositoryService';
import { NodeRef } from './models/NodeRef';
import { StoreRef } from './models/StoreRef';

export interface AlfrescoClientConfig {
  url: string;
  username: string;
  password: string;
  scheme: string;
  address: string;
}

export class AlfrescoClient {
  config: AlfrescoClientConfig;
  ticket: string | null = null;
  authService: AuthenticationService;
  repoService: RepositoryService;

  constructor(config: AlfrescoClientConfig) {
    this.config = config;
    this.authService = new AuthenticationService(config.url);
    this.repoService = new RepositoryService(config.url);
  }

  async authenticate() {
    this.ticket = await this.authService.login(this.config.username, this.config.password);
    this.repoService.setTicket(this.ticket, this.config.username);
    return this.ticket;
  }
}

export async function getCompanyHome(client: AlfrescoClient): Promise<any> {
  // Query for /app:company_home in the configured store
  await client.authenticate();
  const query = {
    language: 'lucene',
    statement: 'PATH:"/app:company_home"',
  };
  const storeObj = { scheme: client.config.scheme, address: client.config.address };
  const result = await client.repoService.query(storeObj, query, false);
  const nodes = result.queryReturn || result.nodes || [];
  const arr = Array.isArray(nodes) ? nodes : [nodes];
  if (arr.length > 0) return arr[0];
  throw new Error('Company Home not found');
}

export async function getChildren(client: AlfrescoClient, nodeRef: NodeRef): Promise<any[]> {
  await client.authenticate();
  // Use the RepositoryService.getNodeChildren method to fetch children by nodeRef
  return client.repoService.getNodeChildren(nodeRef);
}

// Helper: convert nodeRef to path (for now, only supports company_home)
async function nodeRefToPath(client: AlfrescoClient, nodeRef: NodeRef): Promise<string> {
  // If nodeRef is company home, return /app:company_home
  const companyHome = await getCompanyHome(client);
  if (companyHome.nodeRef === nodeRef) return '/app:company_home';
  // TODO: implement lookup for other nodeRefs if needed
  return '/app:company_home';
}

export type { NodeRef, StoreRef }; 