import { NextRequest, NextResponse } from 'next/server';
import { AlfrescoClient, getFileContent } from 'alfresco-soap-api';

export async function GET(req: NextRequest) {
  const nodeRef = req.nextUrl.searchParams.get('nodeRef');
  const download = req.nextUrl.searchParams.get('download') === 'true';
  
  if (!nodeRef) {
    return NextResponse.json({ error: 'Missing nodeRef' }, { status: 400 });
  }

  try {
    console.log(`Starting content retrieval for nodeRef: ${nodeRef}`);
    
    // Use the same pattern as other API routes - only SOAP API
    const client = new AlfrescoClient({
      url: process.env.ALFRESCO_URL!,
      username: process.env.ALFRESCO_USERNAME!,
      password: process.env.ALFRESCO_PASSWORD!,
      scheme: process.env.ALFRESCO_SCHEME || 'workspace',
      address: process.env.ALFRESCO_ADDRESS || 'SpacesStore',
    });

    // Authenticate using SOAP API (same pattern as other routes)
    const ticket = await client.authenticate();
    console.log(`Authenticated with ticket: ${ticket ? 'Present' : 'Missing'}`);

    // Get the node details via SOAP to extract file metadata
    const nodeDetails = await client.repoService.get(nodeRef);
    console.log('Retrieved node details via SOAP');
    
    // Extract filename and content information from properties
    let filename = 'download';
    let contentSize = 0;
    let contentType = 'application/octet-stream';
    
    if (nodeDetails.properties && Array.isArray(nodeDetails.properties)) {
      // Find the name property
      const nameProperty = nodeDetails.properties.find((prop: any) => 
        prop.name === '{http://www.alfresco.org/model/content/1.0}name'
      );
      if (nameProperty && nameProperty.value) {
        filename = nameProperty.value;
      }
      
      // Find the content property  
      const contentProperty = nodeDetails.properties.find((prop: any) => 
        prop.name === '{http://www.alfresco.org/model/content/1.0}content'
      );
      if (contentProperty && contentProperty.value) {
        const contentData = contentProperty.value;
        if (typeof contentData === 'string') {
          // Parse: contentUrl=store://...|mimetype=application/pdf|size=9579|encoding=UTF-8|locale=en_CA_
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
    
    console.log(`Extracted metadata - filename: ${filename}, contentType: ${contentType}, size: ${contentSize}`);
    
    // Use SOAP ContentService to retrieve the actual file content
    let fileContent: Buffer;
    let actualContentType = contentType;
    
    try {
      console.log('Attempting to retrieve file content via SOAP ContentService...');
      
      // Use the ContentService read method to get content
      const contentResult = await client.contentService.read(nodeRef);
      console.log('ContentService.read result:', JSON.stringify(contentResult, null, 2));
      
      // Check if we got content information with a download URL
      if (contentResult && contentResult.content && Array.isArray(contentResult.content) && contentResult.content.length > 0) {
        const contentInfo = contentResult.content[0];
        console.log(`ContentService provided download URL: ${contentInfo.url}`);
        
        // Use the direct download URL provided by ContentService with SOAP ticket authentication
        if (contentInfo.url) {
          const ticket = client.ticket;
          const authenticatedUrl = `${contentInfo.url}?alf_ticket=${ticket}`;
          console.log(`Fetching content from authenticated URL: ${authenticatedUrl}`);
          
          const response = await fetch(authenticatedUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'NextJS-Alfresco-Client/1.0',
            },
          });
          
          console.log(`Download response: ${response.status} ${response.statusText}`);
          
          if (!response.ok) {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
          }
          
          // Check if we got HTML (login page) instead of file content
          const responseContentType = response.headers.get('content-type') || '';
          if (responseContentType.includes('text/html')) {
            throw new Error('Received HTML response - authentication failed');
          }
          
          // Get the actual file content
          fileContent = Buffer.from(await response.arrayBuffer());
          console.log(`Successfully retrieved ${fileContent.length} bytes via ContentService URL`);
          
          // Use the content type from SOAP response
          if (contentInfo.format && contentInfo.format.mimetype) {
            actualContentType = contentInfo.format.mimetype;
          }
        } else {
          throw new Error('ContentService did not provide a download URL');
        }
      } else {
        throw new Error('ContentService returned empty or invalid content data');
      }
      
    } catch (contentError) {
      console.error('SOAP ContentService failed:', contentError);
      console.log('Error details:', (contentError as Error).message);
      
      // Create a demo file showing what we successfully retrieved via SOAP
      const demoContent = `File Information Retrieved via Alfresco SOAP API

Filename: ${filename}
NodeRef: ${nodeRef}
Content Type: ${contentType}
Size: ${contentSize} bytes
Node Type: ${nodeDetails.type || 'Unknown'}

Request Details:
- Download Mode: ${download ? 'Download' : 'View'}
- Timestamp: ${new Date().toISOString()}
- Authentication: SOAP Ticket (${ticket})

SOAP API Results:
✓ Successfully authenticated with Alfresco
✓ Retrieved node metadata via RepositoryService
✓ Extracted file information: ${filename} (${contentType}, ${contentSize} bytes)
✗ ContentService.read failed: ${(contentError as Error).message}

Properties Retrieved:
${Array.isArray(nodeDetails.properties) 
  ? nodeDetails.properties.map((prop: any) => `- ${prop.name}: ${prop.value}`).join('\n')
  : 'No properties available'}

The SOAP API successfully retrieved metadata but content reading failed.
This could be due to:
1. Permissions - user may not have read access to content
2. Content property issues - content may not be stored in expected property
3. SOAP service configuration - ContentService may need different setup
4. Alfresco version compatibility - SOAP API methods may vary between versions

To troubleshoot:
1. Check user permissions on the document
2. Verify ContentService WSDL is accessible
3. Check Alfresco logs for SOAP service errors
4. Test with a different content property if needed
`;

      fileContent = Buffer.from(demoContent, 'utf-8');
      actualContentType = 'text/plain';
    }
    
    // Set appropriate response headers
    const headers = new Headers({
      'Content-Type': download ? 'application/octet-stream' : actualContentType,
      'Content-Length': fileContent.length.toString(),
    });

    if (download) {
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      headers.set('Content-Disposition', `inline; filename="${filename}"`);
    }

    return new NextResponse(fileContent, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Failed to get file content:', error);
    return NextResponse.json(
      { error: 'Failed to get file content: ' + (error as Error).message }, 
      { status: 500 }
    );
  }
} 