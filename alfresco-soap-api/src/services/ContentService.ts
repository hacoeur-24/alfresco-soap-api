import { SoapService } from '../common/SoapService';

export class ContentService extends SoapService {
  constructor(baseUrl: string) {
    super(`${baseUrl}/alfresco/api/ContentService?wsdl`);
  }

  async read(nodeRef: string, property?: string): Promise<any> {
    await this.init();
    if (!nodeRef || typeof nodeRef !== 'string' || !nodeRef.includes('://')) {
      throw new Error('Invalid nodeRef: ' + nodeRef);
    }
    const [scheme, rest] = nodeRef.split('://');
    const [address, id] = rest.includes('/') ? rest.split('/') : [rest, undefined];
    if (!scheme || !address || !id) {
      throw new Error('Invalid nodeRef format: ' + nodeRef);
    }
    
    const predicate = { 
      nodes: [{ 
        store: { scheme, address }, 
        uuid: id 
      }] 
    };
    
    const propertyName = property || '{http://www.alfresco.org/model/content/1.0}content';
    
    try {
      const result = await this.call('read', { 
        predicate, 
        property: propertyName 
      });
      return result;
    } catch (error) {
      console.error('ContentService.read failed:', error);
      throw error;
    }
  }

  async write(nodeRef: string, content: string | Buffer, property?: string, format?: any): Promise<any> {
    await this.init();
    if (!nodeRef || typeof nodeRef !== 'string' || !nodeRef.includes('://')) {
      throw new Error('Invalid nodeRef: ' + nodeRef);
    }
    const [scheme, rest] = nodeRef.split('://');
    const [address, id] = rest.includes('/') ? rest.split('/') : [rest, undefined];
    if (!scheme || !address || !id) {
      throw new Error('Invalid nodeRef format: ' + nodeRef);
    }
    
    const predicate = { 
      nodes: [{ 
        store: { scheme, address }, 
        uuid: id 
      }] 
    };
    
    const propertyName = property || '{http://www.alfresco.org/model/content/1.0}content';
    
    // Convert content to base64 if it's a Buffer
    const contentData = Buffer.isBuffer(content) ? content.toString('base64') : content;
    
    try {
      const result = await this.call('write', { 
        predicate, 
        property: propertyName,
        content: contentData,
        format 
      });
      return result;
    } catch (error) {
      console.error('ContentService.write failed:', error);
      throw error;
    }
  }

  async transform(sourceNodeRef: string, property: string, targetNodeRef: string, targetProperty: string): Promise<any> {
    await this.init();
    
    // Parse source nodeRef
    const [sourceScheme, sourceRest] = sourceNodeRef.split('://');
    const [sourceAddress, sourceId] = sourceRest.includes('/') ? sourceRest.split('/') : [sourceRest, undefined];
    
    // Parse target nodeRef  
    const [targetScheme, targetRest] = targetNodeRef.split('://');
    const [targetAddress, targetId] = targetRest.includes('/') ? targetRest.split('/') : [targetRest, undefined];
    
    const sourcePredicate = { 
      nodes: [{ 
        store: { scheme: sourceScheme, address: sourceAddress }, 
        uuid: sourceId 
      }] 
    };
    
    const targetPredicate = { 
      nodes: [{ 
        store: { scheme: targetScheme, address: targetAddress }, 
        uuid: targetId 
      }] 
    };
    
    try {
      const result = await this.call('transform', { 
        source: sourcePredicate,
        sourceProperty: property,
        target: targetPredicate,
        targetProperty 
      });
      return result;
    } catch (error) {
      console.error('ContentService.transform failed:', error);
      throw error;
    }
  }
} 