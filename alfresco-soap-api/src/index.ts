import { AuthenticationService } from './services/AuthenticationService';
import { RepositoryService } from './services/RepositoryService';
import { ContentService } from './services/ContentService';
import { NodeRef } from './models/NodeRef';
import { StoreRef } from './models/StoreRef';

export interface AlfrescoClientConfig {
  url: string;
  username: string;
  password: string;
  scheme?: string;
  address?: string;
}

export class AlfrescoClient {
  config: AlfrescoClientConfig;
  ticket: string | null = null;
  authService: AuthenticationService;
  repoService: RepositoryService;
  contentService: ContentService;

  constructor(config: AlfrescoClientConfig) {
    // Provide sensible defaults for optional parameters
    this.config = {
      ...config,
      scheme: config.scheme || 'workspace',
      address: config.address || 'SpacesStore'
    };
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

  // ===== SERVICE PROXIES =====
  // Provide convenient access to service methods without needing to reference the service directly

  /**
   * Authentication service proxy - provides direct access to auth methods
   */
  get auth() {
    return {
      login: (username: string, password: string) => this.authService.login(username, password),
      logout: (ticket: string) => this.authService.logout(ticket)
    };
  }

  /**
   * Repository service proxy - provides direct access to repository methods
   */
  get repository() {
    return {
      getStores: () => this.repoService.getStores(),
      query: (store: any, query: any, includeMetaData: boolean) => this.repoService.query(store, query, includeMetaData),
      get: (nodeRef: string) => this.repoService.get(nodeRef),
      queryChildren: (nodeRef: string) => this.repoService.queryChildren(nodeRef),
      queryParents: (nodeRef: string) => this.repoService.queryParents(nodeRef),
      getRootChildren: (store: string) => this.repoService.getRootChildren(store)
    };
  }

  /**
   * Content service proxy - provides direct access to content methods
   */
  get content() {
    return {
      read: (nodeRef: string, property?: string) => this.contentService.read(nodeRef, property),
      getDownloadUrl: (nodeRef: string) => this.contentService.getDownloadUrl(nodeRef),
      write: (nodeRef: string, content: string | Buffer, property?: string, format?: any) => this.contentService.write(nodeRef, content, property, format),
      clear: (nodeRef: string, property?: string) => this.contentService.clear(nodeRef, property),
      transform: (sourceNodeRef: string, property: string, targetNodeRef: string, targetProperty: string, targetFormat: any) => this.contentService.transform(sourceNodeRef, property, targetNodeRef, targetProperty, targetFormat)
    };
  }

  // ===== CONVENIENCE METHODS =====
  // High-level methods that combine multiple operations for common use cases

  /**
   * Get Company Home node reference and name
   */
  async getCompanyHome(): Promise<{ nodeRef: string; name: string }> {
    await this.authenticate();
    const query = {
      language: 'lucene',
      statement: 'PATH:"/app:company_home"',
    };
    const storeObj = { scheme: this.config.scheme, address: this.config.address };
    const res = await this.repoService.query(storeObj, query, false);

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

  /**
   * Get children of a node
   */
  async getChildren(nodeRef: NodeRef): Promise<any[]> {
    await this.authenticate();

    // Always treat Company Home nodeRef as special
    const companyHome = await this.getCompanyHome();
    const companyHomeNodeRef = companyHome?.nodeRef;
    const normalizedNodeRef = this.normalizeNodeRef(nodeRef);
    const normalizedCompanyHomeNodeRef = this.normalizeNodeRef(companyHomeNodeRef);

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
      const storeObj = { scheme: this.config.scheme, address: this.config.address };
      const result = await this.repoService.query(storeObj, query, false);
      
      // Extract nodes from the SOAP response - could be in various shapes
      const extractedNodes = this.extractNodesFromQueryResponse(result);
      return extractedNodes;
    }

    // For all other nodes, use the proper Alfresco SOAP queryChildren method
    try {
      console.log(`[alfresco-soap-api] Using direct queryChildren SOAP method for nodeRef: ${nodeRef}`);
      const children = await this.repoService.queryChildren(nodeRef);
      return children; // This already returns properly formatted objects
    } catch (queryChildrenError) {
      console.error(`[alfresco-soap-api] queryChildren failed for ${nodeRef}:`, queryChildrenError);
      throw new Error(`Failed to get children for nodeRef ${nodeRef}: ${(queryChildrenError as Error).message}`);
    }
  }

  /**
   * Get download URL for content
   */
  async getDownloadUrl(nodeRef: NodeRef): Promise<string> {
    await this.authenticate();
    
    try {
      console.log(`[alfresco-soap-api] Getting download URL for nodeRef: ${nodeRef}`);
      const downloadUrl = await this.contentService.getDownloadUrl(nodeRef);
      console.log(`[alfresco-soap-api] Successfully got download URL for ${nodeRef}`);
      return downloadUrl;
    } catch (error) {
      console.error(`[alfresco-soap-api] Failed to get download URL for ${nodeRef}:`, error);
      throw new Error(`Failed to get download URL for nodeRef ${nodeRef}: ${(error as Error).message}`);
    }
  }

  /**
   * Get stores available in the repository
   */
  async getStores(): Promise<any[]> {
    await this.authenticate();
    return this.repository.getStores();
  }

  /**
   * Get node details by nodeRef
   */
  async getNode(nodeRef: string): Promise<any> {
    await this.authenticate();
    return this.repository.get(nodeRef);
  }

  /**
   * Execute a query against the repository
   */
  async query(query: { language: string; statement: string }, includeMetaData: boolean = false): Promise<any> {
    await this.authenticate();
    const storeObj = { scheme: this.config.scheme, address: this.config.address };
    return this.repository.query(storeObj, query, includeMetaData);
  }

  /**
   * Search for nodes using Lucene query syntax
   */
  async search(searchTerm: string, includeMetaData: boolean = false): Promise<any> {
    const query = {
      language: 'lucene',
      statement: searchTerm
    };
    return this.query(query, includeMetaData);
  }

  /**
   * Get parents of a node
   */
  async getParents(nodeRef: string): Promise<any[]> {
    await this.authenticate();
    return this.repository.queryParents(nodeRef);
  }

  /**
   * Read content from a node
   */
  async readContent(nodeRef: string, property?: string): Promise<any> {
    await this.authenticate();
    return this.content.read(nodeRef, property);
  }

  /**
   * Write content to a node
   */
  async writeContent(nodeRef: string, content: string | Buffer, property?: string, format?: any): Promise<any> {
    await this.authenticate();
    return this.content.write(nodeRef, content, property, format);
  }

  /**
   * Clear content from a node
   */
  async clearContent(nodeRef: string, property?: string): Promise<any> {
    await this.authenticate();
    return this.content.clear(nodeRef, property);
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Helper to normalize nodeRefs for robust comparison
   */
  private normalizeNodeRef(ref: string): string {
    return (ref || '').trim().toLowerCase();
  }

  /**
   * Helper function to extract nodes from query response in any shape
   */
  private extractNodesFromQueryResponse(result: any): any[] {
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
}

// Export types
export type { NodeRef, StoreRef }; 