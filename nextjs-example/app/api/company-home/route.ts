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
  const raw = await getCompanyHome(client);
  // Normalize the response to always return { nodeRef, name }
  if (raw && raw.resultSet && raw.resultSet.rows && raw.resultSet.rows[0]) {
    const row = raw.resultSet.rows[0];
    const protocol = row.columns.find((c: any) => c.name.includes('store-protocol'))?.value;
    const identifier = row.columns.find((c: any) => c.name.includes('store-identifier'))?.value;
    const uuid = row.columns.find((c: any) => c.name.includes('node-uuid'))?.value;
    const name = row.columns.find((c: any) => c.name.includes('name'))?.value || 'Company Home';
    if (protocol && identifier && uuid) {
      const nodeRef = `${protocol}://${identifier}/${uuid}`;
      return NextResponse.json({ nodeRef, name });
    }
  }
  // fallback: try to return nodeRef and name if present
  if (raw && raw.nodeRef) {
    return NextResponse.json({ nodeRef: raw.nodeRef, name: raw.name || 'Company Home' });
  }
  return NextResponse.json({ error: 'Company Home not found or could not normalize response' }, { status: 500 });
} 