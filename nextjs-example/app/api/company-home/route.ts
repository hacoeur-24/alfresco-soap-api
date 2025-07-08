import { NextRequest, NextResponse } from 'next/server';
import { AlfrescoClient, getCompanyHome } from 'alfresco-soap-api';

export async function GET(req: NextRequest) {
  const store = req.nextUrl.searchParams.get('store') || process.env.ALFRESCO_ADDRESS || 'SpacesStore';
  const client = new AlfrescoClient({
    url: process.env.ALFRESCO_URL!,
    username: process.env.ALFRESCO_USERNAME!,
    password: process.env.ALFRESCO_PASSWORD!,
    scheme: process.env.ALFRESCO_SCHEME || 'workspace',
    address: store,
  });
  const companyHome = await getCompanyHome(client);
  return NextResponse.json(companyHome);
} 