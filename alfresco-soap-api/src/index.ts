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

// Helper: recursively resolve the full Lucene path for a nodeRef
async function resolvePathForNodeRef(client: AlfrescoClient, nodeRef: string): Promise<string> {
  // Fetch the node
  await client.authenticate();
  const node = await client.repoService.get(nodeRef);
  // If this is company_home, return /app:company_home
  if (node.properties && node.properties['app:icon'] === 'company_home') {
    return '/app:company_home';
  }
  // If this is the root, return '/'
  if (node.nodeRef.endsWith('://root')) return '/';
  // Get parent nodeRef
  const parentAssoc = node.parent || node.properties?.['cm:parent'] || node.properties?.['cm:parentAssoc'] || node.parentNodeRef;
  if (!parentAssoc) throw new Error('Cannot resolve parent for nodeRef: ' + nodeRef);
  // Recursively resolve parent path
  const parentPath = await resolvePathForNodeRef(client, parentAssoc);
  // Get this node's name (cm:name)
  const nodeName = node.name || node.properties?.['cm:name'];
  if (!nodeName) throw new Error('Node has no name: ' + nodeRef);
  // Alfresco path elements are prefixed with cm: or other namespace
  const type = node.type || node.properties?.['cm:type'];
  const ns = type && type.startsWith('cm:') ? 'cm:' : '';
  return parentPath.endsWith('/') ? `${parentPath}${ns}${nodeName}` : `${parentPath}/${ns}${nodeName}`;
}

export async function getChildren(client: AlfrescoClient, nodeRef: NodeRef): Promise<any[]> {
  await client.authenticate();
  // Resolve the full Lucene path for the nodeRef
  const path = await resolvePathForNodeRef(client, nodeRef);
  const query = {
    language: 'lucene',
    statement: `PATH:"${path}/*"`,
  };
  const storeObj = { scheme: client.config.scheme, address: client.config.address };
  const result = await client.repoService.query(storeObj, query, false);
  const nodes = result.queryReturn || result.nodes || [];
  const arr = Array.isArray(nodes) ? nodes : [nodes];
  return arr.map((node: any) => ({
    nodeRef: node.nodeRef,
    name: node.name || node.properties?.['cm:name'] || node.nodeRef,
    type: node.type,
    properties: node.properties,
  }));
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