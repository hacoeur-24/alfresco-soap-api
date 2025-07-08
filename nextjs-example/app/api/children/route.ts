import { NextRequest, NextResponse } from 'next/server';
import { AlfrescoClient, getCompanyHome, getChildren } from 'alfresco-soap-api';

// Helper to normalize nodeRefs
function normalizeNodeRef(ref: string) {
  return (ref || '').trim().toLowerCase();
}

export async function GET(req: NextRequest) {
  const nodeRef = req.nextUrl.searchParams.get('nodeRef');
  const store = req.nextUrl.searchParams.get('store') || process.env.ALFRESCO_ADDRESS || 'SpacesStore';
  if (!nodeRef) {
    return NextResponse.json({ error: 'Missing nodeRef' }, { status: 400 });
  }
  const client = new AlfrescoClient({
    url: process.env.ALFRESCO_URL!,
    username: process.env.ALFRESCO_USERNAME!,
    password: process.env.ALFRESCO_PASSWORD!,
    scheme: process.env.ALFRESCO_SCHEME || 'workspace',
    address: store,
  });

  // Always fetch the real Company Home nodeRef
  const companyHome = await getCompanyHome(client);
  const companyHomeNodeRef = companyHome?.nodeRef;
  const normalizedNodeRef = normalizeNodeRef(nodeRef);
  const normalizedCompanyHomeNodeRef = normalizeNodeRef(companyHomeNodeRef);

  if (
    normalizedNodeRef === '/app:company_home' ||
    normalizedNodeRef === '/app:company_home/*' ||
    normalizedNodeRef === normalizedCompanyHomeNodeRef
  ) {
    const children = await getChildren(client, '/app:company_home');
    return NextResponse.json(children);
  }

  const children = await getChildren(client, nodeRef);
  return NextResponse.json(children);
} 