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

export async function getCompanyHome(client: AlfrescoClient): Promise<{ nodeRef: string; name: string }> {
  // Query for /app:company_home in the configured store – this runs only once per process and is cached below
  // 1. Authenticate (no-op when already authenticated)
  await client.authenticate();
  const query = {
    language: 'lucene',
    statement: 'PATH:"/app:company_home"',
  };
  const storeObj = { scheme: client.config.scheme, address: client.config.address };
  const res = await client.repoService.query(storeObj, query, false);

  // Helper to dig into the many shapes Alfresco SOAP can return
  function firstRowFromResponse(r: any): any | undefined {
    if (!r) return undefined;
    // Common shape when includeMetaData=false
    if (Array.isArray(r.queryReturn)) return r.queryReturn[0];
    if (r.queryReturn?.resultSet?.rows) return Array.isArray(r.queryReturn.resultSet.rows)
      ? r.queryReturn.resultSet.rows[0]
      : r.queryReturn.resultSet.rows;
    if (r.queryReturn) return r.queryReturn; // sometimes already the node object
    if (r.nodes) return Array.isArray(r.nodes) ? r.nodes[0] : r.nodes;
    if (r.getReturn) return Array.isArray(r.getReturn) ? r.getReturn[0] : r.getReturn;
    return undefined;
  }

  const row = firstRowFromResponse(res);
  if (!row) {
    throw new Error('Company Home not found – empty response');
  }

  // Attempt to read nodeRef directly first
  let nodeRef: string | undefined = row.nodeRef;
  let name: string | undefined = row.name;

  // If nodeRef is missing, try to reconstruct it from the columns array Alfresco returns
  if (!nodeRef && Array.isArray(row.columns)) {
    const getCol = (needle: string) => row.columns.find((c: any) => c.name && c.name.includes(needle))?.value;
    const protocol = getCol('store-protocol');
    const identifier = getCol('store-identifier');
    const uuid = getCol('node-uuid');
    if (protocol && identifier && uuid) {
      nodeRef = `${protocol}://${identifier}/${uuid}`;
    }
    name = name || getCol('name');
  }

  if (!nodeRef) {
    throw new Error('Company Home lookup succeeded but nodeRef could not be determined');
  }

  return { nodeRef, name: name || 'Company Home' };
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

  // Always treat Company Home nodeRef as special
  const companyHome = await getCompanyHome(client);
  const companyHomeNodeRef = companyHome?.nodeRef;
  const normalizedNodeRef = normalizeNodeRef(nodeRef);
  const normalizedCompanyHomeNodeRef = normalizeNodeRef(companyHomeNodeRef);

  if (
    normalizedNodeRef === '/app:company_home' ||
    normalizedNodeRef === '/app:company_home/*' ||
    normalizedNodeRef === normalizedCompanyHomeNodeRef
  ) {
    const path = '/app:company_home/*';
    const query = {
      language: 'lucene',
      statement: `PATH:"${path}"`,
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

  // All other cases: resolve path recursively
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