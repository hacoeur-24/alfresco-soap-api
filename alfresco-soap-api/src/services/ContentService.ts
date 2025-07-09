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
   * Get file content using Alfresco's hybrid SOAP+HTTP approach
   * Step 1: Use SOAP ContentService.read to get download URL
   * Step 2: Fetch content from URL with proper SOAP session authentication
   */
  async getFileContent(nodeRef: string, repositoryService: any, ticket: string, baseUrl: string): Promise<ContentData> {
    try {
      console.log(`[ContentService] Starting hybrid SOAP+HTTP content retrieval for nodeRef: ${nodeRef}`);

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

      // Step 2: Use ContentService.read SOAP operation to get download URL
      console.log(`[ContentService] Calling ContentService.read SOAP operation for nodeRef: ${nodeRef}`);
      const readResult = await this.read(nodeRef);
      
      console.log(`[ContentService] ContentService.read result received`);

      // Step 3: Extract download URL from SOAP response
      let downloadUrl: string | null = null;
      
      // Look for content URL in various possible response shapes
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

      console.log(`[ContentService] Download URL received: ${downloadUrl}`);

      // Step 4: Convert relative URL to absolute if needed
      let fullDownloadUrl = downloadUrl;
      if (downloadUrl.startsWith('/')) {
        // Remove /alfresco from baseUrl if present and add the relative path
        const cleanBaseUrl = baseUrl.replace(/\/alfresco\/?$/, '');
        fullDownloadUrl = `${cleanBaseUrl}${downloadUrl}`;
      }

      console.log(`[ContentService] Full download URL: ${fullDownloadUrl}`);

      // Step 5: Download content with SOAP session authentication
      // Use alf_ticket parameter which should work with the same session as SOAP
      const authenticatedUrl = fullDownloadUrl.includes('?')
        ? `${fullDownloadUrl}&alf_ticket=${encodeURIComponent(ticket)}`
        : `${fullDownloadUrl}?alf_ticket=${encodeURIComponent(ticket)}`;

      console.log(`[ContentService] Downloading content with ticket authentication...`);

      const response = await fetch(authenticatedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Alfresco-SOAP-API-Client',
          'Accept': '*/*'
        }
      });

      console.log(`[ContentService] Download response: HTTP ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
      }

      // Check content type to ensure we didn't get a login page
      const responseContentType = response.headers.get('content-type') || '';
      if (responseContentType.includes('text/html')) {
        throw new Error('Download returned HTML - authentication may have failed');
      }

      const arrayBuffer = await response.arrayBuffer();
      const fileContent = Buffer.from(arrayBuffer);
      
      console.log(`[ContentService] Successfully downloaded ${fileContent.length} bytes`);

      return {
        buffer: fileContent,
        filename,
        contentType,
        size: fileContent.length
      };

    } catch (error) {
      console.error('[ContentService] Hybrid SOAP+HTTP content retrieval failed:', error);
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