import { SoapService } from '../common/SoapService';
import { parseNodeRef } from '../models/NodeRef';

export class RepositoryService extends SoapService {
  constructor(baseUrl: string) {
    super(`${baseUrl}/alfresco/api/RepositoryService?wsdl`);
  }

  async getStores(): Promise<any[]> {
    await this.init();
    const result = await this.call('getStores', {});
    if (Array.isArray(result)) {
      return result;
    } else if (result.getStoresReturn) {
      return result.getStoresReturn;
    } else if (result.store) {
      return result.store;
    } else if (result.stores) {
      return result.stores;
    }
    return [];
  }

  async query(store: any, query: any, includeMetaData: boolean): Promise<any> {
    await this.init();
    return this.call('query', { store, query, includeMetaData });
  }

  async get(nodeRef: string): Promise<any> {
    await this.init();
    if (!nodeRef || typeof nodeRef !== 'string' || !nodeRef.includes('://')) {
      throw new Error('Invalid nodeRef: ' + nodeRef);
    }
    const [scheme, rest] = nodeRef.split('://');
    const [address, id] = rest.includes('/') ? rest.split('/') : [rest, undefined];
    if (!scheme || !address || !id) {
      throw new Error('Invalid nodeRef format: ' + nodeRef);
    }
    const where = { nodes: [ { store: { scheme, address }, uuid: id } ] };
    
    // Use the standard get method (no includeMetadata parameter)
    const result = await this.call('get', { where });
    if (result && result.getReturn && Array.isArray(result.getReturn) && result.getReturn.length > 0) {
      return result.getReturn[0];
    }
    throw new Error('Node not found for nodeRef: ' + nodeRef);
  }

  async queryChildren(nodeRef: string): Promise<any[]> {
    await this.init();
    if (!nodeRef || typeof nodeRef !== 'string' || !nodeRef.includes('://')) {
      throw new Error('Invalid nodeRef: ' + nodeRef);
    }
    const [scheme, rest] = nodeRef.split('://');
    const [address, id] = rest.includes('/') ? rest.split('/') : [rest, undefined];
    if (!scheme || !address || !id) {
      throw new Error('Invalid nodeRef format: ' + nodeRef);
    }
    
    // Use the Alfresco SOAP queryChildren method
    const node = { store: { scheme, address }, uuid: id };
    const result = await this.call('queryChildren', { node });
    
    // Extract children from the query result
    if (result && result.queryReturn && result.queryReturn.resultSet) {
      const rows = result.queryReturn.resultSet.rows || result.queryReturn.resultSet.row || [];
      const childrenArray = Array.isArray(rows) ? rows : [rows];
      return childrenArray.filter(row => row).map((row: any) => {
        // Extract nodeRef and other data from columns
        const getCol = (needle: string) => row.columns?.find((c: any) => c.name && c.name.includes(needle))?.value;
        const protocol = getCol('store-protocol');
        const identifier = getCol('store-identifier');
        const uuid = getCol('node-uuid');
        const nodeRef = protocol && identifier && uuid ? `${protocol}://${identifier}/${uuid}` : row.nodeRef;
        const name = row.name || getCol('name') || getCol('cm:name');
        const type = row.type || getCol('type') || getCol('cm:type');
        
        return {
          nodeRef: nodeRef || 'unknown',
          name: name || 'Unknown',
          type: type || 'unknown',
          properties: row.properties || {},
        };
      }).filter(node => node.nodeRef !== 'unknown');
    }
    return [];
  }

  async queryParents(nodeRef: string): Promise<any[]> {
    await this.init();
    if (!nodeRef || typeof nodeRef !== 'string' || !nodeRef.includes('://')) {
      throw new Error('Invalid nodeRef: ' + nodeRef);
    }
    const [scheme, rest] = nodeRef.split('://');
    const [address, id] = rest.includes('/') ? rest.split('/') : [rest, undefined];
    if (!scheme || !address || !id) {
      throw new Error('Invalid nodeRef format: ' + nodeRef);
    }
    
    // Use the Alfresco SOAP queryParents method
    const node = { store: { scheme, address }, uuid: id };
    const result = await this.call('queryParents', { node });
    
    // Extract parents from the query result
    if (result && result.queryReturn && result.queryReturn.resultSet) {
      const rows = result.queryReturn.resultSet.rows || result.queryReturn.resultSet.row || [];
      const parentsArray = Array.isArray(rows) ? rows : [rows];
      return parentsArray.filter(row => row).map((row: any) => {
        // Extract nodeRef and other data from columns
        const getCol = (needle: string) => row.columns?.find((c: any) => c.name && c.name.includes(needle))?.value;
        const protocol = getCol('store-protocol');
        const identifier = getCol('store-identifier');
        const uuid = getCol('node-uuid');
        const nodeRef = protocol && identifier && uuid ? `${protocol}://${identifier}/${uuid}` : row.nodeRef;
        const name = row.name || getCol('name') || getCol('cm:name');
        
        return {
          nodeRef: nodeRef || 'unknown',
          name: name || 'Unknown',
          properties: row.properties || {},
        };
      }).filter(node => node.nodeRef !== 'unknown');
    }
    return [];
  }

  async getRootChildren(_store: string): Promise<any[]> {
    await this.init();
    // Hardcode Company Home nodeRef and name as the root node
    return [{
      nodeRef: 'workspace://SpacesStore/a0fcfdeb-781d-4562-9bb9-e83ab7581522',
      name: 'Company Home',
      type: 'cm:folder',
      properties: {},
    }];
  }
}

// Helper to parse store address into protocol and identifier
function parseStoreAddress(address: string) {
  if (address.includes('://')) {
    const [scheme, addr] = address.split('://');
    return { scheme, address: addr };
  }
  // fallback: assume workspace
  return { scheme: 'workspace', address };
}

// Helper to convert nodeRef to PATH for lucene query
function nodeRefToPath(nodeRef: string): string {
  if (nodeRef.endsWith('://root')) return '/';
  return '/';
} 