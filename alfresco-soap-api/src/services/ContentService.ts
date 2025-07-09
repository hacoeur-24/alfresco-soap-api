import { SoapService } from '../common/SoapService';

export interface ContentData {
  buffer: Buffer;
  filename: string;
  contentType: string;
  size: number;
}

export class ContentService extends SoapService {
  constructor(baseUrl: string) {
    super(`${baseUrl}/alfresco/api/ContentService?wsdl`);
  }

  /**
   * Read content using SOAP ContentService read operation (WSDL-compliant)
   * Returns Content object with URL for download (this is the correct Alfresco design)
   */
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
    
    // Use exact WSDL format: items (Predicate) + property (string)
    const items = { 
      nodes: [{ 
        store: { scheme, address }, 
        uuid: id 
      }] 
    };
    
    const propertyName = property || '{http://www.alfresco.org/model/content/1.0}content';
    
    try {
      const result = await this.call('read', { 
        items, 
        property: propertyName 
      });
      return result;
    } catch (error) {
      console.error('ContentService.read failed:', error);
      throw error;
    }
  }

  /**
   * Get download URL for content using SOAP ContentService.read
   * Simple helper that extracts the download URL from SOAP response
   */
  async getDownloadUrl(nodeRef: string): Promise<string> {
    console.log(`[ContentService] Getting download URL for nodeRef: ${nodeRef}`);
    
    const readResult = await this.read(nodeRef);
    
    // Extract download URL from SOAP response
    let downloadUrl: string | null = null;
    
    if (readResult.content && Array.isArray(readResult.content)) {
      const content = readResult.content[0];
      if (content && content.url) {
        downloadUrl = content.url;
      }
    } else if (readResult.content && readResult.content.url) {
      downloadUrl = readResult.content.url;
    } else if (readResult.readResponse && readResult.readResponse.content) {
      const content = Array.isArray(readResult.readResponse.content) 
        ? readResult.readResponse.content[0] 
        : readResult.readResponse.content;
      if (content && content.url) {
        downloadUrl = content.url;
      }
    }

    if (!downloadUrl) {
      throw new Error('No download URL found in ContentService.read response');
    }

    console.log(`[ContentService] Download URL extracted: ${downloadUrl}`);
    return downloadUrl;
  }

  /**
   * Write content to repository using SOAP ContentService write operation (WSDL-compliant)
   */
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
    
    // Use exact WSDL format: node (Reference) + property + content (base64) + format
    const node = { 
      store: { scheme, address }, 
      uuid: id 
    };
    
    const propertyName = property || '{http://www.alfresco.org/model/content/1.0}content';
    
    // Convert content to base64 if it's a Buffer
    const contentData = Buffer.isBuffer(content) ? content.toString('base64') : content;
    
    try {
      const result = await this.call('write', { 
        node, 
        property: propertyName,
        content: contentData,
        format: format || { mimetype: 'application/octet-stream', encoding: 'UTF-8' }
      });
      return result;
    } catch (error) {
      console.error('ContentService.write failed:', error);
      throw error;
    }
  }

  /**
   * Clear content from repository using SOAP ContentService clear operation (WSDL-compliant)
   */
  async clear(nodeRef: string, property?: string): Promise<any> {
    await this.init();
    if (!nodeRef || typeof nodeRef !== 'string' || !nodeRef.includes('://')) {
      throw new Error('Invalid nodeRef: ' + nodeRef);
    }
    const [scheme, rest] = nodeRef.split('://');
    const [address, id] = rest.includes('/') ? rest.split('/') : [rest, undefined];
    if (!scheme || !address || !id) {
      throw new Error('Invalid nodeRef format: ' + nodeRef);
    }
    
    // Use exact WSDL format: items (Predicate) + property
    const items = { 
      nodes: [{ 
        store: { scheme, address }, 
        uuid: id 
      }] 
    };
    
    const propertyName = property || '{http://www.alfresco.org/model/content/1.0}content';
    
    try {
      const result = await this.call('clear', { 
        items, 
        property: propertyName 
      });
      return result;
    } catch (error) {
      console.error('ContentService.clear failed:', error);
      throw error;
    }
  }

  /**
   * Transform content using SOAP ContentService transform operation (WSDL-compliant)
   */
  async transform(sourceNodeRef: string, property: string, targetNodeRef: string, targetProperty: string, targetFormat: any): Promise<any> {
    await this.init();
    
    // Parse source nodeRef
    const [sourceScheme, sourceRest] = sourceNodeRef.split('://');
    const [sourceAddress, sourceId] = sourceRest.includes('/') ? sourceRest.split('/') : [sourceRest, undefined];
    
    // Parse target nodeRef  
    const [targetScheme, targetRest] = targetNodeRef.split('://');
    const [targetAddress, targetId] = targetRest.includes('/') ? targetRest.split('/') : [targetRest, undefined];
    
    // Use exact WSDL format
    const source = { 
      store: { scheme: sourceScheme, address: sourceAddress }, 
      uuid: sourceId 
    };
    
    const destinationReference = { 
      store: { scheme: targetScheme, address: targetAddress }, 
      uuid: targetId 
    };
    
    try {
      const result = await this.call('transform', { 
        source,
        property,
        destinationReference,
        destinationProperty: targetProperty,
        destinationFormat: targetFormat
      });
      return result;
    } catch (error) {
      console.error('ContentService.transform failed:', error);
      throw error;
    }
  }
} 