import { SoapService } from '../common/SoapService';

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
    return this.call('get', { nodeRef });
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

  async getNodeChildren(nodeRef: string): Promise<any[]> {
    await this.init();
    // Use the Alfresco SOAP getChildren method to fetch children by nodeRef
    const result = await this.call('getChildren', { nodeRef });
    let children = result.getChildrenReturn || result.children || result.nodes || [];
    if (!Array.isArray(children)) children = [children];
    return children
      .filter((node: any) => node && node.nodeRef)
      .map((node: any) => ({
        nodeRef: node.nodeRef,
        name: node.name || node.properties?.['cm:name'] || node.nodeRef,
        type: node.type,
        properties: node.properties,
      }));
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