import { NextRequest, NextResponse } from 'next/server';
import { AlfrescoClient } from 'alfresco-soap-api';

// Create a single client instance that can be reused
const createClient = () => new AlfrescoClient({
  url: process.env.ALFRESCO_URL!,
  username: process.env.ALFRESCO_USERNAME!,
  password: process.env.ALFRESCO_PASSWORD!,
  scheme: process.env.ALFRESCO_SCHEME || 'workspace',
  address: process.env.ALFRESCO_ADDRESS || 'SpacesStore',
});

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action');
  
  try {
    const client = createClient();
    
    switch (action) {
      case 'company-home':
        return await handleCompanyHome(req, client);
      
      case 'children':
        return await handleChildren(req, client);
      
      case 'content':
        return await handleContent(req, client);
      
      case 'stores':
        return await handleStores(req, client);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: company-home, children, content, or stores' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Alfresco API error:', error);
    return NextResponse.json(
      { error: 'API request failed: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// Handler for getting Company Home
async function handleCompanyHome(req: NextRequest, client: AlfrescoClient) {
  try {
    const companyHome = await client.getCompanyHome();
    return NextResponse.json(companyHome);
  } catch (error) {
    console.error('Failed to get Company Home:', error);
    return NextResponse.json(
      { error: 'Company Home not found: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// Handler for getting children of a node
async function handleChildren(req: NextRequest, client: AlfrescoClient) {
  const nodeRef = req.nextUrl.searchParams.get('nodeRef');
  
  if (!nodeRef) {
    return NextResponse.json({ error: 'Missing nodeRef parameter' }, { status: 400 });
  }

  try {
    const children = await client.getChildren(nodeRef);
    return NextResponse.json(children);
  } catch (error) {
    console.error('Failed to get children:', error);
    return NextResponse.json(
      { error: 'Failed to load children: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// Handler for getting content/download URLs
async function handleContent(req: NextRequest, client: AlfrescoClient) {
  const nodeRef = req.nextUrl.searchParams.get('nodeRef');
  const download = req.nextUrl.searchParams.get('download') === 'true';
  
  if (!nodeRef) {
    return NextResponse.json({ error: 'Missing nodeRef parameter' }, { status: 400 });
  }

  try {
    console.log(`Getting ${download ? 'download' : 'display'} URL for nodeRef: ${nodeRef}`);
    
    let alfrescoUrl = await client.getDownloadUrl(nodeRef);
    
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

    // Add ticket auth
    let authenticatedUrl;
    if (alfrescoUrl.includes('?')) {
      authenticatedUrl = `${alfrescoUrl}&alf_ticket=${encodeURIComponent(client.ticket!)}`;
    } else {
      authenticatedUrl = `${alfrescoUrl}?alf_ticket=${encodeURIComponent(client.ticket!)}`;
    }

    console.log(`Redirecting to ${download ? 'download' : 'display'} URL`);
    return NextResponse.redirect(authenticatedUrl);

  } catch (error) {
    console.error('Content URL retrieval error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get content URL',
        message: (error as Error).message,
        nodeRef
      },
      { status: 500 }
    );
  }
}

// Handler for getting available stores
async function handleStores(req: NextRequest, client: AlfrescoClient) {
  try {
    const stores = await client.repository.getStores();
    return NextResponse.json(stores);
  } catch (error) {
    console.error('Failed to get stores:', error);
    return NextResponse.json(
      { error: 'Failed to load stores: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 