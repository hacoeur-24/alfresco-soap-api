# Alfresco SOAP API Client

A modern TypeScript client for Alfresco SOAP API with simplified convenience methods and service proxies. Create powerful Alfresco integrations with minimal setup.

## Features

- **🚀 Simple API**: Direct methods on `AlfrescoClient` for all common operations
- **🔧 Service Proxies**: Easy access via `client.repository`, `client.content`, `client.auth`
- **⚙️ Smart Defaults**: Optional configuration with sensible defaults
- **🎯 Unified Endpoints**: Create single API endpoints handling multiple operations
- **📝 TypeScript**: Full type safety and IntelliSense support
- **🔐 Automatic Auth**: All methods handle authentication automatically

## Installation

```bash
npm install alfresco-soap-api
```

## Quick Start

```typescript
import { AlfrescoClient } from 'alfresco-soap-api';

// Create client with minimal configuration
const client = new AlfrescoClient({
  url: 'http://your-alfresco-server:8080',
  username: 'admin',
  password: 'admin'
  // scheme and address are optional (defaults: 'workspace', 'SpacesStore')
});

// Use convenience methods directly
const companyHome = await client.getCompanyHome();
const children = await client.getChildren(companyHome.nodeRef);
const downloadUrl = await client.getDownloadUrl(someNodeRef);

// Search for content
const results = await client.search('TYPE:"cm:content"');

// Access service methods via proxies
const stores = await client.repository.getStores();
const nodeData = await client.content.read(nodeRef);
```

## API Reference

### Convenience Methods

All methods automatically handle authentication:

```typescript
// Document management
await client.getCompanyHome()                    // Get company home node
await client.getChildren(nodeRef)                // Get child nodes
await client.getParents(nodeRef)                 // Get parent nodes
await client.getNode(nodeRef)                    // Get node details

// Content operations
await client.getDownloadUrl(nodeRef)             // Get content download URL
await client.readContent(nodeRef)                // Read content data
await client.writeContent(nodeRef, content)      // Write content
await client.clearContent(nodeRef)               // Clear content

// Search and query
await client.search('TYPE:"cm:content"')         // Lucene search
await client.query({language: 'lucene', statement: '...'}) // Custom query
await client.getStores()                         // Get available stores
```

### Service Proxies

Access underlying services without creating instances:

```typescript
// Repository service proxy
await client.repository.getStores()
await client.repository.query(store, query, includeMetaData)
await client.repository.get(nodeRef)
await client.repository.queryChildren(nodeRef)
await client.repository.queryParents(nodeRef)

// Content service proxy  
await client.content.read(nodeRef, property)
await client.content.write(nodeRef, content, property, format)
await client.content.getDownloadUrl(nodeRef)
await client.content.clear(nodeRef, property)
await client.content.transform(sourceRef, prop, targetRef, targetProp, format)

// Authentication service proxy
await client.auth.login(username, password)
await client.auth.logout(ticket)
```

## Usage Patterns

### Single API File with Exported Handlers

Create one API file with all Alfresco operations:

```typescript
// app/api/alfresco/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AlfrescoClient } from 'alfresco-soap-api';

/**
 * Create and return an authenticated Alfresco client
 */
export async function getAlfrescoClient(): Promise<AlfrescoClient> {
  try {
    const client = new AlfrescoClient({
      url: process.env.ALFRESCO_URL!,
      username: process.env.ALFRESCO_USERNAME!,
      password: process.env.ALFRESCO_PASSWORD!,
      scheme: process.env.ALFRESCO_SCHEME,
      address: process.env.ALFRESCO_ADDRESS,
    });
    return client;
  } catch (error) {
    throw new Error(`Failed to create Alfresco client: ${(error as Error).message}`);
  }
}

/**
 * Get Company Home
 */
export async function handleGetCompanyHome(): Promise<NextResponse> {
  try {
    const client = await getAlfrescoClient();
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

/**
 * Get children of a node
 */
export async function handleGetChildren(nodeRef: string): Promise<NextResponse> {
  try {
    const client = await getAlfrescoClient();
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

/**
 * Redirect to content download
 */
export async function handleContentRedirect(nodeRef: string, download: boolean = false): Promise<NextResponse> {
  try {
    const client = await getAlfrescoClient();
    let alfrescoUrl = await client.getDownloadUrl(nodeRef);
    
    // Convert to download URL if needed
    if (download && alfrescoUrl.includes('/d/d/')) {
      alfrescoUrl = alfrescoUrl.replace('/d/d/', '/d/a/');
    }

    // Add ticket auth
    const authenticatedUrl = alfrescoUrl.includes('?') 
      ? `${alfrescoUrl}&alf_ticket=${encodeURIComponent(client.ticket!)}`
      : `${alfrescoUrl}?alf_ticket=${encodeURIComponent(client.ticket!)}`;

    return NextResponse.redirect(authenticatedUrl);
  } catch (error) {
    console.error('Content redirect error:', error);
    return NextResponse.json(
      { error: 'Failed to redirect to content: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Get available stores
 */
export async function handleGetStores(): Promise<NextResponse> {
  try {
    const client = await getAlfrescoClient();
    const stores = await client.getStores();
    return NextResponse.json(stores);
  } catch (error) {
    console.error('Failed to get stores:', error);
    return NextResponse.json(
      { error: 'Failed to get stores: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Search for content
 */
export async function handleSearch(searchTerm: string, includeMetaData: boolean = false): Promise<NextResponse> {
  try {
    const client = await getAlfrescoClient();
    const results = await client.search(searchTerm, includeMetaData);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json(
      { error: 'Search failed: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Get node details
 */
export async function handleGetNode(nodeRef: string): Promise<NextResponse> {
  try {
    const client = await getAlfrescoClient();
    const node = await client.getNode(nodeRef);
    return NextResponse.json(node);
  } catch (error) {
    console.error('Failed to get node:', error);
    return NextResponse.json(
      { error: 'Failed to get node: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
```

### Direct Usage in Server Components

```typescript
// In a React Server Component
import { AlfrescoClient } from 'alfresco-soap-api';

export default async function DocumentList() {
  const client = new AlfrescoClient({
    url: process.env.ALFRESCO_URL!,
    username: process.env.ALFRESCO_USERNAME!,
    password: process.env.ALFRESCO_PASSWORD!,
  });

  const companyHome = await client.getCompanyHome();
  const documents = await client.getChildren(companyHome.nodeRef);

  return (
    <div>
      <h1>{companyHome.name}</h1>
      {documents.map(doc => (
        <div key={doc.nodeRef}>
          <h3>{doc.name}</h3>
          <p>Type: {doc.type}</p>
        </div>
      ))}
    </div>
  );
}
```

### Frontend Integration

```typescript
// Use the exported handlers directly in your application

import { 
  handleGetCompanyHome, 
  handleGetChildren, 
  handleSearch,
  handleContentRedirect,
  handleGetStores 
} from './api/alfresco/route';

// Get company home
const companyHomeResponse = await handleGetCompanyHome();
const companyHome = await companyHomeResponse.json();

// Get children of a node
const childrenResponse = await handleGetChildren(nodeRef);
const children = await childrenResponse.json();

// Search for content
const searchResponse = await handleSearch('TYPE:"cm:content"');
const results = await searchResponse.json();

// Get stores
const storesResponse = await handleGetStores();
const stores = await storesResponse.json();

// For content download, you can create a simple endpoint:
// app/api/download/route.ts
import { NextRequest } from 'next/server';
import { handleContentRedirect } from '../alfresco/route';

export async function GET(req: NextRequest) {
  const nodeRef = req.nextUrl.searchParams.get('nodeRef');
  const download = req.nextUrl.searchParams.get('download') === 'true';
  
  if (!nodeRef) {
    return NextResponse.json({ error: 'Missing nodeRef' }, { status: 400 });
  }
  
  return handleContentRedirect(nodeRef, download);
}
```

## Configuration

### Environment Variables

```env
# Required
ALFRESCO_URL=http://your-alfresco-server:8080
ALFRESCO_USERNAME=admin
ALFRESCO_PASSWORD=admin

# Optional (with defaults)
ALFRESCO_SCHEME=workspace    # Default: workspace
ALFRESCO_ADDRESS=SpacesStore # Default: SpacesStore
```

### Configuration Interface

```typescript
interface AlfrescoClientConfig {
  url: string;           // Required: Alfresco server URL
  username: string;      // Required: Username
  password: string;      // Required: Password  
  scheme?: string;       // Optional: Store scheme (default: 'workspace')
  address?: string;      // Optional: Store address (default: 'SpacesStore')
}
```

## Advanced Usage

### Custom Queries

```typescript
// Lucene query
const results = await client.query({
  language: 'lucene',
  statement: 'PATH:"/app:company_home/*" AND TYPE:"cm:content"'
}, true); // includeMetaData

// XPath query
const results = await client.query({
  language: 'xpath',
  statement: '/app:company_home/cm:*[@cm:name="Documents"]'
});

// Simple search
const docs = await client.search('TYPE:"cm:content" AND @cm:name:"*.pdf"');
```

### Content Management

```typescript
// Read content metadata
const content = await client.readContent(nodeRef);

// Write content
await client.writeContent(nodeRef, 'Hello World', undefined, {
  mimetype: 'text/plain',
  encoding: 'UTF-8'
});

// Get authenticated download URL
const downloadUrl = await client.getDownloadUrl(nodeRef);
// URL includes proper authentication ticket

// Clear content
await client.clearContent(nodeRef);
```

### Working with Content URLs

```typescript
// Get download URL with authentication
const downloadUrl = await client.getDownloadUrl(nodeRef);
// Returns: http://server:8080/alfresco/d/d/workspace/SpacesStore/uuid/filename

// For downloads (attachment), modify URL pattern:
if (downloadUrl.includes('/d/d/')) {
  const attachmentUrl = downloadUrl.replace('/d/d/', '/d/a/');
  // Now forces download instead of display
}

// URL already includes alf_ticket for authentication
```

### Error Handling

```typescript
try {
  const children = await client.getChildren(nodeRef);
  console.log(`Found ${children.length} children`);
} catch (error) {
  if (error.message.includes('not found')) {
    console.log('Node does not exist');
  } else if (error.message.includes('permission')) {
    console.log('Access denied');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## Examples

### File Browser Using Handler Functions

```typescript
// app/api/browse/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleGetCompanyHome, handleGetChildren, handleSearch } from '../alfresco/route';

export async function GET(req: NextRequest) {
  const nodeRef = req.nextUrl.searchParams.get('nodeRef');
  const searchTerm = req.nextUrl.searchParams.get('search');

  // If searching, use search handler
  if (searchTerm) {
    return handleSearch(searchTerm);
  }

  // If nodeRef provided, get its children
  if (nodeRef) {
    return handleGetChildren(nodeRef);
  }

  // Otherwise, return company home
  return handleGetCompanyHome();
}
```

### Custom Content Information

```typescript
// app/page.tsx - Server Component
import { getAlfrescoClient } from './api/alfresco/route';

export default async function DocumentsPage() {
  const client = await getAlfrescoClient();
  
  // Get company home and its children
  const companyHome = await client.getCompanyHome();
  const documents = await client.getChildren(companyHome.nodeRef);

  return (
    <div>
      <h1>{companyHome.name}</h1>
      {documents.map(doc => (
        <div key={doc.nodeRef}>
          <h3>{doc.name}</h3>
          <p>Type: {doc.type}</p>
        </div>
      ))}
    </div>
  );
}
```

### Download Endpoint

```typescript
// app/api/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleContentRedirect } from '../alfresco/route';

export async function GET(req: NextRequest) {
  const nodeRef = req.nextUrl.searchParams.get('nodeRef');
  const download = req.nextUrl.searchParams.get('download') === 'true';
  
  if (!nodeRef) {
    return NextResponse.json({ error: 'Missing nodeRef' }, { status: 400 });
  }
  
  return handleContentRedirect(nodeRef, download);
}
```

## TypeScript Support

The library includes full TypeScript definitions:

```typescript
import { AlfrescoClient, NodeRef, StoreRef, AlfrescoClientConfig } from 'alfresco-soap-api';

// All methods are fully typed
const client: AlfrescoClient = new AlfrescoClient(config);
const nodeRef: NodeRef = 'workspace://SpacesStore/uuid';
const children: any[] = await client.getChildren(nodeRef);
```

## Notes

- **Node.js Only**: This package is for server-side use only (Next.js API routes, Express, etc.)
- **Authentication**: All methods automatically handle SOAP authentication
- **Session Management**: Client manages SOAP tickets internally
- **Error Handling**: Methods throw descriptive errors for debugging
- **Performance**: Client reuses SOAP connections for efficiency

## License

MIT

