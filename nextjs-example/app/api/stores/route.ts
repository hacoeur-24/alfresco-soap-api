import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  // Only return the configured store
  const scheme = process.env.ALFRESCO_SCHEME || 'workspace';
  const address = process.env.ALFRESCO_ADDRESS || 'SpacesStore';
  return NextResponse.json([{ scheme, address }]);
} 