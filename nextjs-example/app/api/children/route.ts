import { NextRequest, NextResponse } from 'next/server';
import { AlfrescoClient, getChildren } from 'alfresco-soap-api';

export async function GET(req: NextRequest) {
  const nodeRef = req.nextUrl.searchParams.get('nodeRef');
  const store = req.nextUrl.searchParams.get('store') || process.env.ALFRESCO_ADDRESS || 'SpacesStore';
  
  if (!nodeRef) {
    return NextResponse.json({ error: 'Missing nodeRef' }, { status: 400 });
  }

  try {
    const client = new AlfrescoClient({
      url: process.env.ALFRESCO_URL!,
      username: process.env.ALFRESCO_USERNAME!,
      password: process.env.ALFRESCO_PASSWORD!,
      scheme: process.env.ALFRESCO_SCHEME || 'workspace',
      address: store,
    });

    // The backend now handles all Company Home logic and SOAP method selection
    const children = await getChildren(client, nodeRef);
    return NextResponse.json(children);
  } catch (error) {
    console.error('Failed to get children:', error);
    return NextResponse.json(
      { error: 'Failed to load children: ' + (error as Error).message }, 
      { status: 500 }
    );
  }
} 