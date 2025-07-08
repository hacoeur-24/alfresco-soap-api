import { NextRequest, NextResponse } from 'next/server';
import { AlfrescoClient } from 'alfresco-soap-api';

export async function GET() {
  const client = new AlfrescoClient({
    url: process.env.ALFRESCO_URL!,
    username: process.env.ALFRESCO_USERNAME!,
    password: process.env.ALFRESCO_PASSWORD!,
    scheme: process.env.ALFRESCO_SCHEME || 'workspace',
    address: process.env.ALFRESCO_ADDRESS || 'SpacesStore',
  });
  await client.authenticate();
  const stores = await client.repoService.getStores();
  return NextResponse.json(stores);
} 