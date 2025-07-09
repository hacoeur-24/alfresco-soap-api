# alfresco-soap-api

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/hacoeur-24/alfresco-soap-api)

A TypeScript library for connecting to Alfresco Content Services via the SOAP API. **Node.js only**—use in Next.js API routes, Express, serverless, etc.

## Features
- **Authenticate with Alfresco SOAP API**
- **Query nodes, fetch children, and navigate the repository**
- **Download and retrieve file content** using WSDL-compliant SOAP operations
- **TypeScript types** for StoreRef, NodeRef, ContentData, and more
- **No hardcoded nodeRefs or credentials**—fully configurable
- **Consistent, normalized return values** for all methods (always arrays/objects, never SOAP-wrapped responses)
- **Navigate the full Alfresco folder structure**: `getChildren` works for any nodeRef, not just Company Home
- **WSDL-compliant SOAP methods**: Uses Alfresco's official SOAP operations exactly as specified in the WSDL
- **Robust content retrieval**: Uses SOAP ContentService.read to get download URLs, then fetches content via Alfresco's own URLs
- **Automatic nodeRef normalization**: All nodeRefs are parsed and passed to the Alfresco SOAP API in the correct `{ scheme, address, uuid }` format
- **Consistent architecture**: ContentService follows the same patterns as RepositoryService for maintainability

## Installation

```sh
npm install alfresco-soap-api
```

## Usage Examples

### Basic Repository Navigation (Next.js API Route)

```ts
// app/api/company-home/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AlfrescoClient, getCompanyHome } from 'alfresco-soap-api';

export async function GET() {
  const client = new AlfrescoClient({
    url: process.env.ALFRESCO_URL!,
    username: process.env.ALFRESCO_USERNAME!,
    password: process.env.ALFRESCO_PASSWORD!,
    scheme: 'workspace',
    address: 'SpacesStore',
  });
  const companyHome = await getCompanyHome(client);
  return NextResponse.json(companyHome);
}
```

### File Content Retrieval (Next.js API Route)

```ts
// app/api/content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AlfrescoClient, getFileContent } from 'alfresco-soap-api';

export async function GET(req: NextRequest) {
  const nodeRef = req.nextUrl.searchParams.get('nodeRef');
  const download = req.nextUrl.searchParams.get('download') === 'true';
  
  if (!nodeRef) {
    return NextResponse.json({ error: 'Missing nodeRef' }, { status: 400 });
  }

  try {
    const client = new AlfrescoClient({
      url: process.env.ALFRESCO_URL!,
      username: process.env.ALFRESCO_USERNAME!,
      password: process.env.ALFRESCO_PASSWORD!,
      scheme: 'workspace',
      address: 'SpacesStore',
    });

    // Get file content using SOAP + HTTP approach
    const contentData = await getFileContent(client, nodeRef);
    
    const headers = new Headers({
      'Content-Type': download ? 'application/octet-stream' : contentData.contentType,
      'Content-Length': contentData.size.toString(),
    });

    if (download) {
      headers.set('Content-Disposition', `attachment; filename="${contentData.filename}"`);
    }

    return new NextResponse(contentData.buffer, { headers });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get file content: ' + (error as Error).message }, 
      { status: 500 }
    );
  }
}
```

## API Reference

### Core Functions
- `AlfrescoClient(config)` — Create a new client instance
- `getCompanyHome(client)` — Get the Company Home node. Returns `{ nodeRef, name }`
- `getChildren(client, nodeRef)` — Get children of a node using native SOAP `queryChildren`
- `getFileContent(client, nodeRef)` — Download file content using SOAP + HTTP approach
- `authenticate(client)` — Authenticate and get a ticket

### TypeScript Interfaces

```ts
interface ContentData {
  buffer: Buffer;        // File content as Buffer
  filename: string;      // Original filename from Alfresco
  contentType: string;   // MIME type (e.g., 'application/pdf')
  size: number;         // File size in bytes
}

interface AlfrescoClientConfig {
  url: string;           // Alfresco server URL
  username: string;      // Username for authentication
  password: string;      // Password for authentication
  scheme: string;        // Store scheme (usually 'workspace')
  address: string;       // Store address (usually 'SpacesStore')
}
```

## How Content Retrieval Works

The `getFileContent` function uses a **robust two-step approach**:

### Step 1: SOAP ContentService.read
```ts
// Uses exact WSDL operation to get Content object
const result = await contentService.read(nodeRef, property);
// Extract download URL from Content object
const downloadUrl = result.content[0].url;
```

### Step 2: HTTP Download
```ts
// Download content via Alfresco's own URL
const response = await fetch(downloadUrl);
const fileContent = Buffer.from(await response.arrayBuffer());
```

### Why This Approach Works
1. **Uses exact WSDL operations** - no guessing or workarounds
2. **Alfresco provides the download URL** - no authentication issues
3. **Consistent with RepositoryService** - same patterns and architecture
4. **Reliable across versions** - uses official Alfresco mechanisms

## Content Service Operations

The ContentService provides these WSDL-compliant operations:

### Reading Content
```ts
// Get Content object with download URL
const contentInfo = await client.contentService.read(nodeRef, property);

// High-level file download
const fileData = await getFileContent(client, nodeRef);
```

### Writing Content
```ts
await client.contentService.write(nodeRef, content, property, format);
```

### Clearing Content
```ts
await client.contentService.clear(nodeRef, property);
```

### Transforming Content
```ts
await client.contentService.transform(
  sourceNodeRef, 
  property, 
  targetNodeRef, 
  targetProperty, 
  targetFormat
);
```

## Usage Examples

### Download File to File System
```ts
import fs from 'fs';
import { AlfrescoClient, getFileContent } from 'alfresco-soap-api';

const client = new AlfrescoClient(config);
const contentData = await getFileContent(client, nodeRef);

// Save to file system
fs.writeFileSync(`./downloads/${contentData.filename}`, contentData.buffer);
console.log(`Downloaded: ${contentData.filename} (${contentData.size} bytes)`);
```

### Stream Content to Browser
```ts
// Next.js API route
export async function GET(req: NextRequest) {
  const nodeRef = req.nextUrl.searchParams.get('nodeRef');
  const client = new AlfrescoClient(config);
  
  const contentData = await getFileContent(client, nodeRef);
  
  return new NextResponse(contentData.buffer, {
    headers: {
      'Content-Type': contentData.contentType,
      'Content-Disposition': `attachment; filename="${contentData.filename}"`
    }
  });
}
```

### Batch File Processing
```ts
import { AlfrescoClient, getChildren, getFileContent } from 'alfresco-soap-api';

async function downloadFolder(client: AlfrescoClient, folderNodeRef: string) {
  const children = await getChildren(client, folderNodeRef);
  
  for (const child of children) {
    if (child.type === 'cm:content') {
      try {
        const contentData = await getFileContent(client, child.nodeRef);
        
        // Process file
        console.log(`Processing: ${contentData.filename}`);
        fs.writeFileSync(`./output/${contentData.filename}`, contentData.buffer);
        
      } catch (error) {
        console.error(`Failed to download ${child.name}:`, error);
      }
    }
  }
}
```

## WSDL Compliance

This library strictly follows the official Alfresco SOAP WSDL specifications:

### RepositoryService Operations
- `query` - Execute Lucene queries
- `queryChildren` - Get folder children
- `queryParents` - Get parent nodes  
- `get` - Retrieve individual nodes

### ContentService Operations
- `read` - Get Content objects with download URLs
- `write` - Write content to repository
- `clear` - Clear content from nodes
- `transform` - Transform content between formats

### Parameter Formatting
All SOAP calls use the exact parameter structure specified in the WSDL:
```ts
// RepositoryService calls
{ nodes: [{ store: { scheme, address }, uuid: id }] }

// ContentService calls  
{ items: { nodes: [{ store: { scheme, address }, uuid: id }] }, property: propertyName }
```

## Troubleshooting

### Content Retrieval Issues

#### "No URL found in Content object"
**Cause**: ContentService.read didn't return a Content object with a URL field
**Solution**: 
1. Verify the nodeRef has content (not just metadata)
2. Check user permissions for content access
3. Ensure the node is a file (cm:content) not a folder

#### "Download URL returned login page"
**Cause**: The download URL requires authentication that failed
**Solution**:
1. Verify the SOAP ticket is valid: `await client.authenticate()`
2. Check user permissions for the specific content
3. Ensure the nodeRef exists and has content

#### "HTTP 404: Not Found"
**Cause**: The download URL is invalid or content doesn't exist
**Solution**:
1. Verify the nodeRef is correct and points to a file
2. Check if the content was moved or deleted
3. Ensure the content store is accessible

### Repository Navigation Issues

#### "Node not found" errors
**Solution**: Verify the nodeRef exists and user has read permissions

#### "Empty results" from getChildren
**Solution**: Check user permissions and verify the nodeRef is a folder

#### SOAP method errors
**Solution**: Verify your Alfresco server's SOAP API is enabled and accessible

### General Issues

#### Authentication failures
**Solution**: Verify your credentials and network connectivity to Alfresco

#### Permission errors  
**Solution**: Ensure the user account has appropriate access to folders and content

## Example Project

A complete Next.js example is provided in the [`nextjs-example`](../nextjs-example) folder:

- Full-stack Alfresco browser with file download
- Demonstrates all library features
- See [`nextjs-example/README.md`](../nextjs-example/README.md) for setup instructions

## Architecture

### Consistent Design Patterns
Both RepositoryService and ContentService follow the same patterns:
- **Same authentication method** (WS-Security with tickets)
- **Same parameter formatting** (proper Predicate structures)
- **Same error handling** approach
- **Same response normalization**

### WSDL-First Approach
- Uses only operations defined in official Alfresco WSDLs
- No custom workarounds or reverse-engineered methods
- Parameters match WSDL specifications exactly
- Responses are properly typed and normalized

### Why This Architecture Works
1. **Predictable behavior** across all Alfresco versions
2. **Easy to maintain** - follows official specifications
3. **Reliable** - uses Alfresco's intended mechanisms
4. **Extensible** - easy to add new WSDL-compliant operations

## Notes
- This package is **Node.js only**. Do not import it in browser code.
- Use in Next.js API routes, Express, or any Node.js backend.
- All methods return normalized, developer-friendly data structures.
- Content retrieval uses Alfresco's own download URLs for maximum compatibility.
- All SOAP operations strictly follow the official Alfresco WSDL specifications.

## License

MIT

