import { AuthenticationService } from './services/AuthenticationService';
import { RepositoryService } from './services/RepositoryService';
import { ContentService } from './services/ContentService';
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
  contentService: ContentService;

  constructor(config: AlfrescoClientConfig) {
    this.config = config;
    this.authService = new AuthenticationService(config.url);
    this.repoService = new RepositoryService(config.url);
    this.contentService = new ContentService(config.url);
  }

  async authenticate() {
    this.ticket = await this.authService.login(this.config.username, this.config.password);
    this.repoService.setTicket(this.ticket, this.config.username);
    this.contentService.setTicket(this.ticket, this.config.username);
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
    
    // Extract nodes from the SOAP response - could be in various shapes
    const extractedNodes = extractNodesFromQueryResponse(result);
    return extractedNodes;
  }

  // For all other nodes, use the proper Alfresco SOAP queryChildren method
  try {
    console.log(`[alfresco-soap-api] Using direct queryChildren SOAP method for nodeRef: ${nodeRef}`);
    const children = await client.repoService.queryChildren(nodeRef);
    return children; // This already returns properly formatted objects
  } catch (queryChildrenError) {
    console.error(`[alfresco-soap-api] queryChildren failed for ${nodeRef}:`, queryChildrenError);
    throw new Error(`Failed to get children for nodeRef ${nodeRef}: ${(queryChildrenError as Error).message}`);
  }
}

// Helper function to extract nodes from query response in any shape
function extractNodesFromQueryResponse(result: any): any[] {
  if (!result) return [];

  // Try different response shapes that Alfresco SOAP can return
  let rawNodes: any[] = [];
  
  if (Array.isArray(result.queryReturn)) {
    rawNodes = result.queryReturn;
  } else if (result.queryReturn?.resultSet?.rows) {
    rawNodes = Array.isArray(result.queryReturn.resultSet.rows) 
      ? result.queryReturn.resultSet.rows 
      : [result.queryReturn.resultSet.rows];
  } else if (result.queryReturn) {
    rawNodes = Array.isArray(result.queryReturn) ? result.queryReturn : [result.queryReturn];
  } else if (result.nodes) {
    rawNodes = Array.isArray(result.nodes) ? result.nodes : [result.nodes];
  } else if (result.getReturn) {
    rawNodes = Array.isArray(result.getReturn) ? result.getReturn : [result.getReturn];
  }

  return rawNodes
    .filter((node: any) => node && (node.nodeRef || node.columns)) // Keep nodes that have nodeRef or columns
    .map((node: any) => {
      // Try to extract nodeRef directly first
      let nodeRef: string | undefined = node.nodeRef;
      let name: string | undefined = node.name;
      let type: string | undefined = node.type;
      let properties: any = node.properties;

      // If nodeRef is missing, try to reconstruct from columns (common in Lucene queries)
      if (!nodeRef && Array.isArray(node.columns)) {
        const getCol = (needle: string) => node.columns.find((c: any) => c.name && c.name.includes(needle))?.value;
        const protocol = getCol('store-protocol');
        const identifier = getCol('store-identifier');
        const uuid = getCol('node-uuid');
        if (protocol && identifier && uuid) {
          nodeRef = `${protocol}://${identifier}/${uuid}`;
        }
        name = name || getCol('name') || getCol('cm:name');
        type = type || getCol('type') || getCol('cm:type');
        
        // Build properties object from columns if not present
        if (!properties && node.columns) {
          properties = {};
          node.columns.forEach((col: any) => {
            if (col.name && col.value !== undefined) {
              properties[col.name] = col.value;
            }
          });
        }
      }

      // Fallback name extraction
      if (!name) {
        name = node.properties?.['cm:name'] || 
               node.properties?.name ||
               (nodeRef ? nodeRef.split('/').pop() : 'Unknown');
      }

      return {
        nodeRef: nodeRef || 'unknown',
        name: name || 'Unknown',
        type: type || 'unknown',
        properties: properties || {},
      };
    })
    .filter((node: any) => node.nodeRef !== 'unknown'); // Filter out nodes we couldn't parse
}

/**
 * Get download URL for content using SOAP ContentService.read
 * Returns the direct download URL that can be used for redirects or direct access
 */
export async function getDownloadUrl(client: AlfrescoClient, nodeRef: NodeRef): Promise<string> {
  await client.authenticate();
  
  try {
    console.log(`[alfresco-soap-api] Getting download URL for nodeRef: ${nodeRef}`);
    const downloadUrl = await client.contentService.getDownloadUrl(nodeRef);
    console.log(`[alfresco-soap-api] Successfully got download URL for ${nodeRef}`);
    return downloadUrl;
  } catch (error) {
    console.error(`[alfresco-soap-api] Failed to get download URL for ${nodeRef}:`, error);
    throw new Error(`Failed to get download URL for nodeRef ${nodeRef}: ${(error as Error).message}`);
  }
}

// Helper: convert nodeRef to path (for now, only supports company_home)
async function nodeRefToPath(client: AlfrescoClient, nodeRef: NodeRef): Promise<string> {
  // If nodeRef is company home, return /app:company_home
  const companyHome = await getCompanyHome(client);
  if (companyHome.nodeRef === nodeRef) return '/app:company_home';
  // TODO: implement lookup for other nodeRefs if needed
  return '/app:company_home';
}

// Export types
export type { NodeRef, StoreRef }; 