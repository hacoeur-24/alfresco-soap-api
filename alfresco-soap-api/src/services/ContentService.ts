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
   * Returns Content object with url field for download
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
   * Get file content using SOAP + HTTP approach (robust for older Alfresco)
   * Step 1: Use SOAP read to get Content object with download URL
   * Step 2: Fetch content via the URL provided by Alfresco with proper authentication
   */
  async getFileContent(nodeRef: string, repositoryService: any, ticket: string, baseUrl: string): Promise<ContentData> {
    try {
      console.log(`[ContentService] Starting content retrieval for nodeRef: ${nodeRef}`);

      // Step 1: Get node metadata for filename/type info
      const nodeDetails = await repositoryService.get(nodeRef);
      
      let filename = 'download';
      let contentSize = 0;
      let contentType = 'application/octet-stream';
      
      // Extract file metadata from node properties (same as before)
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
            
            const sizeMatch = contentData.match(/size=([^|]+)/);
            if (sizeMatch) {
              contentSize = parseInt(sizeMatch[1]) || 0;
            }
          }
        }
      }

      console.log(`[ContentService] Metadata extracted: ${filename}, ${contentType}, ${contentSize} bytes`);

      // Step 2: Use ContentService.read to get Content object with URL
      console.log(`[ContentService] Calling ContentService.read for nodeRef: ${nodeRef}`);
      const readResult = await this.read(nodeRef);
      
      console.log(`[ContentService] ContentService.read result:`, readResult);

      // Extract Content objects from read response
      let contentObjects = [];
      if (readResult.readReturn && Array.isArray(readResult.readReturn)) {
        contentObjects = readResult.readReturn;
      } else if (readResult.content && Array.isArray(readResult.content)) {
        contentObjects = readResult.content;
      } else if (readResult.content) {
        contentObjects = [readResult.content];
      } else if (readResult.readReturn) {
        contentObjects = [readResult.readReturn];
      }

      if (!contentObjects || contentObjects.length === 0) {
        throw new Error('No content objects returned from ContentService.read');
      }

      const contentObj = contentObjects[0];
      console.log(`[ContentService] Content object:`, contentObj);

      // Step 3: Extract download URL from Content object
      let downloadUrl = null;
      if (contentObj.url) {
        downloadUrl = contentObj.url;
        console.log(`[ContentService] Found download URL: ${downloadUrl}`);
      } else {
        throw new Error('No URL found in Content object - cannot download content');
      }

      // Step 4: Download content via the URL provided by Alfresco with authentication
      console.log(`[ContentService] Downloading content from URL: ${downloadUrl}`);
      
      // Try multiple authentication methods for the download URL
      const authMethods = [
        // Method 1: Add alf_ticket parameter to URL
        {
          name: 'URL_TICKET',
          url: downloadUrl.includes('?') 
            ? `${downloadUrl}&alf_ticket=${encodeURIComponent(ticket)}`
            : `${downloadUrl}?alf_ticket=${encodeURIComponent(ticket)}`,
          headers: {}
        },
        // Method 2: Use ticket in Authorization header
        {
          name: 'AUTH_HEADER',
          url: downloadUrl,
          headers: { 'Authorization': `Basic ${Buffer.from(`${ticket}:`).toString('base64')}` }
        },
        // Method 3: Use the original URL as-is (in case it's already authenticated)
        {
          name: 'ORIGINAL_URL',
          url: downloadUrl,
          headers: {}
        }
      ];

      let response: Response | null = null;
      let lastError: string = '';

      for (const authMethod of authMethods) {
        try {
          console.log(`[ContentService] Trying ${authMethod.name}: ${authMethod.url.replace(ticket, 'TICKET_HIDDEN')}`);
          
          const headers: Record<string, string> = {
            'User-Agent': 'Alfresco-SOAP-API-Client',
            'Accept': '*/*'
          };
          Object.assign(headers, authMethod.headers);

          response = await fetch(authMethod.url, {
            method: 'GET',
            headers
          });

          if (!response.ok) {
            console.log(`[ContentService] ${authMethod.name} failed: HTTP ${response.status}: ${response.statusText}`);
            lastError = `HTTP ${response.status}: ${response.statusText}`;
            response = null; // Reset for next attempt
            continue;
          }

          // Check if we got HTML (login page) by looking at headers first
          const responseContentType = response.headers.get('content-type') || '';
          if (responseContentType.includes('text/html')) {
            console.log(`[ContentService] ${authMethod.name} returned HTML content-type - likely login page`);
            lastError = 'Download URL returned HTML - likely login page';
            response = null; // Reset for next attempt
            continue;
          }

          console.log(`[ContentService] ${authMethod.name} successful`);
          break; // Success! Exit the loop

        } catch (error) {
          console.log(`[ContentService] ${authMethod.name} error: ${(error as Error).message}`);
          lastError = (error as Error).message;
          response = null; // Reset for next attempt
          continue;
        }
      }

      if (!response || !response.ok) {
        throw new Error(`All authentication methods failed. Last error: ${lastError}`);
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
      console.error('[ContentService] Content retrieval failed:', error);
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