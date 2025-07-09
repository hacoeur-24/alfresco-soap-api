# alfresco-soap-api

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/hacoeur-24/alfresco-soap-api)

A TypeScript library for connecting to Alfresco Content Services via the SOAP API. **Node.js only**—use in Next.js API routes, Express, serverless, etc.

## Features
- Authenticate with Alfresco SOAP API
- Query nodes, fetch children, and navigate the repository
- **Download and retrieve file content** with multiple fallback methods for maximum compatibility
- TypeScript types for StoreRef, NodeRef, ContentData, and more
- No hardcoded nodeRefs or credentials—fully configurable
- **Consistent, normalized return values** for all methods (always arrays/objects, never SOAP-wrapped responses)
- **Navigate the full Alfresco folder structure**: `getChildren` now works for any nodeRef, not just Company Home
- **Native WSDL-compliant SOAP methods**: Uses Alfresco's official `queryChildren` SOAP operation for reliable folder navigation
- **Robust content retrieval**: Multiple SOAP-based approaches ensure file downloads work across different Alfresco versions, including older installations
- **Automatic nodeRef normalization**: All nodeRefs are parsed and passed to the Alfresco SOAP API in the correct `{ scheme, address, uuid }` format, so you never have to worry about SOAP compatibility
- **WSDL-compliant operations**: All SOAP methods strictly follow the Alfresco RepositoryService WSDL specification
- **Root node (Company Home) detection**: The library always treats Company Home as a special case. `getCompanyHome` **guarantees** it can extract the `nodeRef` from any Alfresco SOAP response shape (array, resultSet rows, etc.). If the SOAP payload does not include `nodeRef`, the library reconstructs it from the returned columns. As soon as the lookup succeeds, all subsequent logic uses the Lucene path `/app:company_home/*` to fetch children. This makes initial navigation from the repository root _bullet-proof_, regardless of nodeRef formatting or how Company Home is referenced.
- **Robust SOAP response parsing**: Advanced data extraction logic handles all variations of Alfresco SOAP responses - whether data comes as direct properties, resultSet rows, or column arrays. Node information (`nodeRef`, `name`, `type`, `properties`) is intelligently reconstructed from any response format, ensuring reliable data extraction across different Alfresco versions and configurations.

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

    // Get file content with automatic fallback methods
    const contentData = await getFileContent(client, nodeRef);
    
    const headers = new Headers({
      'Content-Type': download ? 'application/octet-stream' : contentData.contentType,
      'Content-Length': contentData.size.toString(),
    });

    if (download) {
      headers.set('Content-Disposition', `attachment; filename="${contentData.filename}"`);
    } else {
      headers.set('Content-Disposition', `inline; filename="${contentData.filename}"`);
    }

    return new NextResponse(contentData.buffer, {
      status: 200,
      headers,
    });

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
- `AlfrescoClient(config)` — Create a new client instance (pass your Alfresco URL, username, password, scheme, and address)
- `getCompanyHome(client)` — Get the Company Home node. **Returns** `{ nodeRef, name }` where `nodeRef` is guaranteed to be present.
- `getChildren(client, nodeRef)` — Get children of a node (always returns an array of properly formatted node objects, uses native Alfresco SOAP `queryChildren` method)
- `getFileContent(client, nodeRef)` — **NEW**: Download file content with multiple fallback approaches. **Returns** `ContentData` object.
- `authenticate(client)` — Authenticate and get a ticket

### TypeScript Interfaces

```ts
interface ContentData {
  buffer: Buffer;        // File content as Buffer
  filename: string;      // Original filename from Alfresco
  contentType: string;   // MIME type (e.g., 'application/pdf')
  size: number;         // File size in bytes
}

interface ContentInfo {
  content?: any[];
  url?: string;
  format?: {
    mimetype: string;
    encoding: string;
  };
  length?: number;
}
```

## Content Retrieval Features

### Multiple Fallback Methods
The `getFileContent` function uses multiple approaches to ensure maximum compatibility:

1. **SOAP Base64 Content Reading**: Attempts to retrieve content directly via SOAP as base64-encoded data
2. **Direct Property Reading**: Falls back to reading content from various content properties
3. **Detailed Error Reporting**: If all methods fail, provides comprehensive diagnostic information

### Older Alfresco Version Support
- **No HTTP authentication issues**: Uses pure SOAP methods instead of HTTP download URLs with ticket authentication
- **Compatible with legacy installations**: Works with older Alfresco versions that don't support modern authentication methods
- **Automatic method selection**: Tries the best approach first, then falls back gracefully

### Usage Examples

```ts
// Simple file download
const contentData = await getFileContent(client, nodeRef);
console.log(`Downloaded: ${contentData.filename} (${contentData.size} bytes)`);

// Stream to response
return new NextResponse(contentData.buffer, {
  headers: {
    'Content-Type': contentData.contentType,
    'Content-Disposition': `attachment; filename="${contentData.filename}"`
  }
});

// Save to file system (Node.js)
import fs from 'fs';
fs.writeFileSync(`./downloads/${contentData.filename}`, contentData.buffer);
```

## Example Project

A full-stack example using this library in a Next.js app is provided in the [`nextjs-example`](../nextjs-example) folder.

- See [`nextjs-example/README.md`](../nextjs-example/README.md) for setup and usage instructions.
- The example demonstrates how to use this library in Next.js API routes and connect a React frontend to Alfresco.
- **New**: Includes file download and content viewing examples using the improved content retrieval methods.

## Native SOAP Operations with WSDL Compliance

This library uses **official Alfresco SOAP methods** that match the RepositoryService WSDL specification exactly:

### Company Home Special Handling
- **Direct Lucene queries**: Company Home children are fetched using `PATH:"/app:company_home/*"` for guaranteed reliability
- **No parent resolution needed**: Bypasses any parent association issues for the root node
- **Universal compatibility**: Works regardless of nodeRef format or Alfresco version

### Direct SOAP Navigation for All Other Folders
For Sites, Data Dictionary, User Homes, and all other folders:

- **Native `queryChildren` method**: Uses Alfresco's official SOAP operation designed specifically for getting folder children
- **WSDL-compliant parameters**: Calls `queryChildren({ node: { store: { scheme, address }, uuid: id } })`
- **Single SOAP call**: No complex path resolution or parent chain traversal required
- **Reliable data extraction**: Processes `queryReturn.resultSet` response format consistently
- **Works with any nodeRef**: Sites, custom folders, deep hierarchies - everything works the same way

### Content Service Operations
- **Multiple retrieval methods**: Uses various SOAP ContentService operations for maximum compatibility
- **Base64 content reading**: Attempts direct SOAP-based content retrieval
- **Property-based fallbacks**: Reads content from different content properties as needed
- **No HTTP dependencies**: Purely SOAP-based approach eliminates authentication issues with older Alfresco versions

### Additional SOAP Operations
The library also provides:

- **`queryParents`**: Gets parent nodes using the official SOAP method
- **`get`**: Retrieves individual nodes with proper Predicate structure
- **`query`**: Executes Lucene queries with full WSDL compliance
- **`ContentService.read`**: Low-level content reading with property specification
- **`ContentService.getFileContent`**: High-level file retrieval with automatic fallbacks

### Why This Approach Works
- **Official Alfresco API**: Uses methods designed by Alfresco for exactly this purpose
- **No reverse engineering**: No need to guess parent associations or build complex paths
- **Server-optimized**: Alfresco handles all the complex relationship resolution internally
- **Consistent across versions**: WSDL specification ensures compatibility
- **Pure SOAP approach**: Eliminates HTTP authentication and compatibility issues

## Troubleshooting

### Repository Navigation
- **SOAP method errors**: All SOAP methods now strictly follow the WSDL specification. If you encounter method errors, verify your Alfresco server's SOAP API is enabled and accessible.
- **Navigation errors**: The library uses native `queryChildren` for folder navigation. If folders don't load, check that the user has permission to access the folder's children.
- **Node access errors**: If you see "Node not found" errors, verify the nodeRef exists and the user has read permissions.
- **WSDL compliance**: All SOAP calls follow the official Alfresco RepositoryService WSDL. The library automatically formats nodeRefs and parameters correctly.
- **Empty results**: If folders appear empty, check user permissions and that the Alfresco SOAP API is returning data correctly.

### Content Retrieval
- **"Received HTML response - authentication failed"**: This error typically occurs with older Alfresco versions using HTTP download URLs. The new `getFileContent` method eliminates this by using pure SOAP approaches.
- **Content reading failures**: The library tries multiple methods automatically. Check the console logs to see which methods were attempted and why they failed.
- **Permission errors**: Ensure the user account has read access to the specific document content, not just metadata.
- **Large file issues**: For very large files, SOAP-based retrieval may timeout. Consider implementing chunked reading or using alternative approaches for files over 100MB.
- **Encoding problems**: The library handles various content encodings automatically. If you see garbled content, check the original file encoding in Alfresco.
- **Older Alfresco versions**: The multiple fallback approach is specifically designed for compatibility with legacy Alfresco installations where modern authentication methods don't work.

### General
- **NodeRef format:** Ensure nodeRefs are in the form `workspace://SpacesStore/UUID`. The library handles parsing and SOAP formatting automatically.
- **Authentication**: Verify your credentials and that the user account has access to the folders and content you're trying to access.
- **Network connectivity**: Ensure your application can reach the Alfresco SOAP endpoints (typically `/alfresco/api/RepositoryService` and `/alfresco/api/ContentService`).

## Notes
- This package is **Node.js only**. Do not import it in browser code.
- Use in Next.js API routes, Express, or any Node.js backend.
- All methods return normalized, developer-friendly data structures.
- `getChildren` works reliably for any nodeRef using official Alfresco SOAP methods, so you can browse Sites, User Homes, Data Dictionary, and all subfolders/files.
- **Content retrieval**: `getFileContent` uses multiple SOAP-based approaches to ensure file downloads work across different Alfresco versions and configurations.
- **WSDL-compliant**: All SOAP operations strictly follow the Alfresco RepositoryService and ContentService WSDL specifications for maximum compatibility.
- **No custom workarounds**: Uses only official Alfresco API methods as intended by the platform.
- **Older Alfresco support**: Special attention to compatibility with legacy Alfresco installations through multiple fallback methods.

## License

MIT

