import { SoapService } from '../common/SoapService';

export interface ContentInfo {
  content?: any[];
  url?: string;
  format?: {
    mimetype: string;
    encoding: string;
  };
  length?: number;
}

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

  /**
   * Retrieves file content using multiple fallback approaches for older Alfresco versions
   */
  async getFileContent(nodeRef: string, repositoryService: any): Promise<ContentData> {
    try {
      // First, get node metadata to extract filename and content info
      const nodeDetails = await repositoryService.get(nodeRef);
      
      let filename = 'download';
      let contentSize = 0;
      let contentType = 'application/octet-stream';
      
      if (nodeDetails.properties && Array.isArray(nodeDetails.properties)) {
        // Extract filename
        const nameProperty = nodeDetails.properties.find((prop: any) => 
          prop.name === '{http://www.alfresco.org/model/content/1.0}name'
        );
        if (nameProperty && nameProperty.value) {
          filename = nameProperty.value;
        }
        
        // Extract content metadata
        const contentProperty = nodeDetails.properties.find((prop: any) => 
          prop.name === '{http://www.alfresco.org/model/content/1.0}content'
        );
        if (contentProperty && contentProperty.value) {
          const contentData = contentProperty.value;
          if (typeof contentData === 'string') {
            if (contentData.includes('mimetype=')) {
              const mimetypeMatch = contentData.match(/mimetype=([^|]+)/);
              if (mimetypeMatch) {
                contentType = mimetypeMatch[1];
              }
            }
            if (contentData.includes('size=')) {
              const sizeMatch = contentData.match(/size=([^|]+)/);
              if (sizeMatch) {
                contentSize = parseInt(sizeMatch[1]) || 0;
              }
            }
          }
        }
      }

      // Try different approaches to get the actual content
      let fileContent: Buffer;

      try {
        // Approach 1: Try SOAP ContentService with base64 content reading
        fileContent = await this.readContentAsBase64(nodeRef);
        console.log(`Successfully retrieved content via SOAP base64 method: ${fileContent.length} bytes`);
             } catch (base64Error) {
         console.log('Base64 content reading failed, trying alternative approaches:', (base64Error as Error).message);
         
         try {
           // Approach 2: Try reading content property directly
           fileContent = await this.readContentProperty(nodeRef, repositoryService);
           console.log(`Successfully retrieved content via property reading: ${fileContent.length} bytes`);
         } catch (propertyError) {
           console.log('Property content reading failed:', (propertyError as Error).message);
           
           // Approach 3: Create a demo file with metadata (as fallback)
           const errorInfo = `Content Retrieval Failed

Filename: ${filename}
NodeRef: ${nodeRef}
Content Type: ${contentType}
Expected Size: ${contentSize} bytes

SOAP API Results:
✓ Successfully authenticated with Alfresco
✓ Retrieved node metadata via RepositoryService
✓ Extracted file information: ${filename} (${contentType}, ${contentSize} bytes)
✗ All content retrieval methods failed

Attempted Methods:
1. SOAP ContentService base64 reading: ${(base64Error as Error).message}
2. Direct content property reading: ${(propertyError as Error).message}

This could be due to:
1. Alfresco version compatibility issues
2. Different SOAP API configuration needed
3. Content stored in unsupported format
4. Permission restrictions on content access

Properties Retrieved:
${Array.isArray(nodeDetails.properties) 
  ? nodeDetails.properties.map((prop: any) => `- ${prop.name}: ${prop.value}`).join('\n')
  : 'No properties available'}
`;

          fileContent = Buffer.from(errorInfo, 'utf-8');
          contentType = 'text/plain';
          filename = `${filename.replace(/\.[^.]*$/, '')}_error.txt`;
        }
      }

      return {
        buffer: fileContent,
        filename,
        contentType,
        size: fileContent.length
      };

    } catch (error) {
      console.error('Failed to get file content:', error);
      throw new Error(`Failed to retrieve content for ${nodeRef}: ${(error as Error).message}`);
    }
  }

  /**
   * Attempts to read content as base64-encoded data via SOAP
   */
  private async readContentAsBase64(nodeRef: string): Promise<Buffer> {
    const result = await this.read(nodeRef);
    
    if (result && result.content && Array.isArray(result.content) && result.content.length > 0) {
      const contentInfo = result.content[0];
      
      // Check if content is provided as base64 data
      if (contentInfo.content && typeof contentInfo.content === 'string') {
        try {
          return Buffer.from(contentInfo.content, 'base64');
        } catch (base64Error) {
          throw new Error('Failed to decode base64 content');
        }
      }
      
      // Check if we have inline binary data
      if (contentInfo.data) {
        try {
          return Buffer.from(contentInfo.data);
        } catch (bufferError) {
          throw new Error('Failed to convert data to buffer');
        }
      }
    }
    
    throw new Error('No base64 content data available in SOAP response');
  }

  /**
   * Attempts to read content by examining the content property directly
   */
  private async readContentProperty(nodeRef: string, repositoryService: any): Promise<Buffer> {
    // Try reading different content-related properties that might contain the actual data
    const contentProperties = [
      '{http://www.alfresco.org/model/content/1.0}content',
      'content',
      'cm:content'
    ];

    for (const property of contentProperties) {
      try {
        const result = await this.read(nodeRef, property);
        
        if (result && result.content) {
          const content = Array.isArray(result.content) ? result.content[0] : result.content;
          
          if (content && content.content && typeof content.content === 'string') {
            // Try to decode as base64
            try {
              return Buffer.from(content.content, 'base64');
            } catch (decodeError) {
              // If not base64, try as direct text content
              return Buffer.from(content.content, 'utf8');
            }
          }
        }
             } catch (error) {
         console.log(`Failed to read property ${property}:`, (error as Error).message);
         continue;
       }
    }
    
    throw new Error('No content data found in any content property');
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