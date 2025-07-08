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

// Helper to normalize nodeRefs for robust comparison
function normalizeNodeRef(ref: string) {
  return (ref || '').trim().toLowerCase();
}

// Helper: recursively resolve the full Lucene path for a nodeRef (robust version)
async function resolvePathForNodeRef(client: AlfrescoClient, nodeRef: string, depth = 0, companyHomeNodeRef?: string): Promise<string> {
  if (!nodeRef || typeof nodeRef !== 'string') {
    console.error(`[alfresco-soap-api] resolvePathForNodeRef: Invalid nodeRef:`, nodeRef);
    throw new Error('Invalid nodeRef passed to resolvePathForNodeRef');
  }
  if (depth > 50) {
    // Prevent infinite recursion
    throw new Error('Max recursion depth reached in resolvePathForNodeRef for nodeRef: ' + nodeRef);
  }
  await client.authenticate();
  let node;
  try {
    node = await client.repoService.get(nodeRef);
  } catch (err) {
    console.error(`[alfresco-soap-api] Failed to fetch node for nodeRef: ${nodeRef}`, err);
    throw new Error('Failed to fetch node for nodeRef: ' + nodeRef);
  }
  // If this is company_home, return /app:company_home
  if (
    (companyHomeNodeRef && normalizeNodeRef(nodeRef) === normalizeNodeRef(companyHomeNodeRef)) ||
    (node.nodeRef && companyHomeNodeRef && normalizeNodeRef(node.nodeRef) === normalizeNodeRef(companyHomeNodeRef)) ||
    (node.properties && (node.properties['app:icon'] === 'company_home' || node.name === 'Company Home'))
  ) {
    return '/app:company_home';
  }
  // If this is the root, return '/'
  if (node.nodeRef && node.nodeRef.endsWith('://root')) return '/';
  // Try to find parent nodeRef
  let parentAssoc =
    node.parent ||
    node.parentNodeRef ||
    node.properties?.['cm:parent'] ||
    node.properties?.['cm:parentAssoc'] ||
    (node.aspects && node.aspects['cm:parent']) ||
    undefined;
  if (!parentAssoc) {
    // Try to find parent from associations
    if (node.associations && Array.isArray(node.associations)) {
      const parentAssocObj = node.associations.find((a: any) => a.associationType && a.associationType.includes('parent'));
      if (parentAssocObj && parentAssocObj.target) {
        parentAssoc = parentAssocObj.target;
      }
    }
  }
  if (!parentAssoc) {
    console.error(`[alfresco-soap-api] Could not resolve parent for nodeRef: ${nodeRef}`);
    throw new Error('Cannot resolve parent for nodeRef: ' + nodeRef);
  }
  // Recursively resolve parent path
  const parentPath = await resolvePathForNodeRef(client, parentAssoc, depth + 1, companyHomeNodeRef);
  // Get this node's name (cm:name)
  const nodeName = node.name || node.properties?.['cm:name'];
  if (!nodeName) {
    console.error(`[alfresco-soap-api] Node has no name: ${nodeRef}`);
    throw new Error('Node has no name: ' + nodeRef);
  }
  // Alfresco path elements are prefixed with cm: or other namespace
  const type = node.type || node.properties?.['cm:type'];
  const ns = type && type.startsWith('cm:') ? 'cm:' : '';
  return parentPath.endsWith('/') ? `${parentPath}${ns}${nodeName}` : `${parentPath}/${ns}${nodeName}`;
}

export async function getChildren(client: AlfrescoClient, nodeRef: NodeRef): Promise<any[]> {
  await client.authenticate();
  // Fetch Company Home nodeRef for robust root detection
  const companyHome = await getCompanyHome(client);
  const companyHomeNodeRef = companyHome.nodeRef;
  // Resolve the full Lucene path for the nodeRef
  const path = await resolvePathForNodeRef(client, nodeRef, 0, companyHomeNodeRef);
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