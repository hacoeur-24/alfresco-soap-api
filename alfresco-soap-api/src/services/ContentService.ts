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
   * Returns Content object with content data
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
   * Get file content using pure SOAP approach (matches RepositoryService pattern)
   * Uses SOAP authentication like other services - no HTTP calls needed
   */
  async getFileContent(nodeRef: string, repositoryService: any): Promise<ContentData> {
    try {
      console.log(`[ContentService] Starting SOAP content retrieval for nodeRef: ${nodeRef}`);

      // Step 1: Get node metadata for filename/type info using RepositoryService
      const nodeDetails = await repositoryService.get(nodeRef);
      
      let filename = 'download';
      let contentType = 'application/octet-stream';
      
      // Extract file metadata from node properties
      if (nodeDetails.properties && Array.isArray(nodeDetails.properties)) {
        const nameProperty = nodeDetails.properties.find((prop: any) => 
          prop.name === '{http://www.alfresco.org/model/content/1.0}name'
        );
        if (nameProperty && nameProperty.value) {
          filename = nameProperty.value;
        }
        
        const contentProperty = nodeDetails.properties.find((prop: any) => 
          prop.name === '{http://www.alfresco.org/model/content/1.0}content'
        );
        
        if (contentProperty && contentProperty.value) {
          const contentData = contentProperty.value;
          if (typeof contentData === 'string') {
            const mimetypeMatch = contentData.match(/mimetype=([^|]+)/);
            if (mimetypeMatch) {
              contentType = mimetypeMatch[1];
            }
          }
        }
      }

      console.log(`[ContentService] Metadata extracted: ${filename}, ${contentType}`);

      // Step 2: Use ContentService.read SOAP operation to get content
      console.log(`[ContentService] Calling ContentService.read SOAP operation for nodeRef: ${nodeRef}`);
      const readResult = await this.read(nodeRef);
      
      console.log(`[ContentService] ContentService.read result received`);

      // Step 3: Extract content from SOAP response
      let contentData: Buffer;
      
      // The SOAP response should contain the content directly
      // Look for content in various possible response shapes
      if (readResult.readResponse && readResult.readResponse.content) {
        const content = Array.isArray(readResult.readResponse.content) 
          ? readResult.readResponse.content[0] 
          : readResult.readResponse.content;
        
        if (content.url) {
          // If there's a URL, it means content is not embedded - this indicates a configuration issue
          throw new Error('ContentService returned URL instead of content data. This suggests the content is too large or the server is configured for URL-based access. Try using a smaller file or check your Alfresco configuration.');
        }
        
        // Content should be in the SOAP response as base64 or similar
        if (content.data || content.content) {
          const base64Content = content.data || content.content;
          contentData = Buffer.from(base64Content, 'base64');
        } else {
          throw new Error('No content data found in SOAP response');
        }
      } else if (readResult.content) {
        // Direct content array
        const contentArray = Array.isArray(readResult.content) ? readResult.content : [readResult.content];
        const content = contentArray[0];
        
        if (content && content.url && !content.data && !content.content) {
          throw new Error('ContentService returned URL instead of content data. This suggests the content is too large or the server is configured for URL-based access.');
        }
        
        const base64Content = content.data || content.content;
        if (base64Content) {
          contentData = Buffer.from(base64Content, 'base64');
        } else {
          throw new Error('No content data found in Content object');
        }
      } else {
        throw new Error('Unexpected SOAP response structure - no content found');
      }
      
      console.log(`[ContentService] Successfully extracted ${contentData.length} bytes via SOAP`);

      return {
        buffer: contentData,
        filename,
        contentType,
        size: contentData.length
      };

    } catch (error) {
      console.error('[ContentService] SOAP content retrieval failed:', error);
      throw new Error(`Content retrieval failed for ${nodeRef}: ${(error as Error).message}`);
    }
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