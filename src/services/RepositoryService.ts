import { SoapService } from '../common/SoapService';

export class RepositoryService extends SoapService {
  constructor(baseUrl: string) {
    super(`${baseUrl}/alfresco/api/RepositoryService?wsdl`);
  }

  async getStores(): Promise<any> {
    await this.init();
    const result = await this.call('getStores', {});
    return result.stores || result;
  }

  async query(store: any, query: any): Promise<any> {
    await this.init();
    return this.call('query', { store, query });
  }

  async get(nodeRef: string): Promise<any> {
    await this.init();
    return this.call('get', { nodeRef });
  }
} 