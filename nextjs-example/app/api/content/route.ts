import { NextRequest, NextResponse } from 'next/server';
import { AlfrescoClient } from 'alfresco-soap-api';

export async function GET(req: NextRequest) {
  const nodeRef = req.nextUrl.searchParams.get('nodeRef');
  const download = req.nextUrl.searchParams.get('download') === 'true';
  
  if (!nodeRef) {
    return NextResponse.json({ error: 'Missing nodeRef' }, { status: 400 });
  }

  try {
    console.log(`Getting ${download ? 'download' : 'display'} URL for nodeRef: ${nodeRef}`);
    
    const client = new AlfrescoClient({
      url: process.env.ALFRESCO_URL!,
      username: process.env.ALFRESCO_USERNAME!,
      password: process.env.ALFRESCO_PASSWORD!,
      scheme: process.env.ALFRESCO_SCHEME || 'workspace',
      address: process.env.ALFRESCO_ADDRESS || 'SpacesStore',
    });

    await client.authenticate();
    
    // Get URL from SOAP
    let alfrescoUrl = await client.contentService.getDownloadUrl(nodeRef);
    
    // Convert to download URL if needed
    if (download) {
      if (alfrescoUrl.includes('/d/d/')) {
        // Convert display URL to attachment URL: /d/d/ -> /d/a/
        alfrescoUrl = alfrescoUrl.replace('/d/d/', '/d/a/');
        console.log(`Converted /d/d/ to /d/a/ for download: ${alfrescoUrl}`);
      } else if (alfrescoUrl.includes('/download/direct/')) {
        // Convert direct download to attachment: /download/direct/ -> /d/a/
        alfrescoUrl = alfrescoUrl.replace('/download/direct/', '/d/a/');
        console.log(`Converted /download/direct/ to /d/a/ for download: ${alfrescoUrl}`);
      }
    }

    // Add ticket auth and download parameter if needed
    let authenticatedUrl;
    if (alfrescoUrl.includes('?')) {
      authenticatedUrl = `${alfrescoUrl}&alf_ticket=${encodeURIComponent(client.ticket!)}`;
    } else {
      authenticatedUrl = `${alfrescoUrl}?alf_ticket=${encodeURIComponent(client.ticket!)}`;
    }

    console.log(`Redirecting to ${download ? 'download' : 'display'} URL`);
    return NextResponse.redirect(authenticatedUrl);

  } catch (error) {
    console.error('Download URL retrieval error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get download URL',
        message: (error as Error).message,
        nodeRef
      },
      { status: 500 }
    );
  }
} 