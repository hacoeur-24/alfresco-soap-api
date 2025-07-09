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
3. **SOAP Content Streaming**: Uses SOAP streaming methods for binary content
4. **Detailed Error Reporting**: If all methods fail, provides comprehensive diagnostic information

### Hybrid SOAP+HTTP Method (Recommended)
For older Alfresco versions or when pure SOAP methods fail, use the hybrid approach:

```ts
import { AlfrescoClient, getFileContentHybrid } from 'alfresco-soap-api';

const contentData = await getFileContentHybrid(client, nodeRef);
```

**How it works:**
- Uses SOAP for authentication and metadata retrieval
- Uses HTTP download servlet for binary content (more reliable with older Alfresco versions)
- Automatically handles ticket-based authentication for HTTP requests

### Older Alfresco Version Support
- **No HTTP authentication issues**: Hybrid method eliminates common authentication problems with older Alfresco versions
- **Compatible with legacy installations**: Works with Alfresco versions that have limited SOAP content support
- **Automatic method selection**: Pure SOAP first, then hybrid fallback available

### Content Retrieval Methods Comparison

| Method | Description | Best For | Pros | Cons |
|--------|-------------|----------|------|------|
| `getFileContent` | Pure SOAP with multiple fallbacks | Modern Alfresco installations | Consistent SOAP API usage | May fail with older versions |
| `getFileContentHybrid` | SOAP metadata + HTTP download | Older Alfresco versions | More reliable binary transfer | Requires HTTP access |

### Usage Examples

#### Basic Content Download
```ts
// Try pure SOAP first
try {
  const contentData = await getFileContent(client, nodeRef);
  console.log(`Downloaded: ${contentData.filename} (${contentData.size} bytes)`);
} catch (error) {
  // Fallback to hybrid method for older Alfresco versions
  console.log('SOAP method failed, trying hybrid approach...');
  const contentData = await getFileContentHybrid(client, nodeRef);
  console.log(`Downloaded via hybrid: ${contentData.filename} (${contentData.size} bytes)`);
}
```

#### Next.js API Route with Method Selection
```ts
// app/api/content/route.ts
export async function GET(req: NextRequest) {
  const nodeRef = req.nextUrl.searchParams.get('nodeRef');
  const method = req.nextUrl.searchParams.get('method') || 'soap';
  
  const client = new AlfrescoClient(config);
  
  let contentData;
  if (method === 'hybrid') {
    contentData = await getFileContentHybrid(client, nodeRef);
  } else {
    contentData = await getFileContent(client, nodeRef);
  }
  
  return new NextResponse(contentData.buffer, {
    headers: {
      'Content-Type': contentData.contentType,
      'Content-Disposition': `attachment; filename="${contentData.filename}"`
    }
  });
}
```

#### Stream to Response
```ts
// Download file and stream to browser
const contentData = await getFileContentHybrid(client, nodeRef);

return new NextResponse(contentData.buffer, {
  headers: {
    'Content-Type': contentData.contentType,
    'Content-Disposition': `attachment; filename="${contentData.filename}"`
  }
});
```

#### Save to File System (Node.js)
```ts
import fs from 'fs';

const contentData = await getFileContent(client, nodeRef);
fs.writeFileSync(`./downloads/${contentData.filename}`, contentData.buffer);
```

## Troubleshooting Content Retrieval

### Common Issues and Solutions

#### "No base64 content data available in SOAP response"
**Cause**: Your Alfresco version doesn't support base64 content in SOAP responses.
**Solution**: Use the hybrid method: `getFileContentHybrid(client, nodeRef)`

#### "HTTP authentication failed" or "401 Unauthorized"
**Cause**: HTTP download servlet requires proper ticket authentication.
**Solution**: 
1. Ensure your Alfresco user has content read permissions
2. Check that the ticket is valid: `await client.authenticate()`
3. Try the pure SOAP method instead: `getFileContent(client, nodeRef)`

#### "Content Retrieval Failed" with detailed report
**Cause**: All SOAP methods failed, often indicates Alfresco configuration issues.
**Solutions**:
1. **Enable SOAP content streaming** in Alfresco configuration
2. **Use hybrid method**: `getFileContentHybrid(client, nodeRef)`
3. **Check permissions**: Ensure user has read access to content, not just metadata
4. **Verify Alfresco version**: Older versions (pre-4.0) have limited SOAP content support

#### "Method not found" or SOAP errors
**Cause**: Your Alfresco installation might have different SOAP method names.
**Solution**: Check your ContentService WSDL at `/alfresco/api/ContentService?wsdl`

#### Large File Issues
**Cause**: SOAP has limitations with large binary data transfer.
**Solutions**:
1. **Use hybrid method** for files > 10MB: `getFileContentHybrid(client, nodeRef)`
2. **Implement chunked reading** for very large files
3. **Consider REST API** for high-volume content access

### Configuration-Specific Solutions

#### Alfresco Version < 4.0
```ts
// Always use hybrid method for older versions
const contentData = await getFileContentHybrid(client, nodeRef);
```

#### Custom Alfresco Installations
```ts
// Test both methods and use what works
try {
  return await getFileContent(client, nodeRef);
} catch {
  return await getFileContentHybrid(client, nodeRef);
}
```

#### Network/Proxy Issues
```ts
// Hybrid method bypasses some network issues
const contentData = await getFileContentHybrid(client, nodeRef);
```

### When to Use Each Method

**Use `getFileContent` (Pure SOAP) when:**
- Modern Alfresco installation (4.0+)
- SOAP content streaming is enabled
- You want consistent SOAP API usage
- No HTTP access restrictions

**Use `getFileContentHybrid` (SOAP+HTTP) when:**
- Older Alfresco versions
- Pure SOAP methods fail
- Large file downloads
- More reliable binary transfer needed
- Working with legacy Alfresco installations

**Use `getFileContentForMigration` (Migration-Grade) when:**
- Building migration tools
- File integrity is critical
- Need audit trails and verification
- Require checksum validation
- Moving data between systems

## 🔒 File Integrity Guarantees for Migration

For migration tools, we provide **comprehensive integrity verification**:

### Migration-Grade Content Retrieval
```ts
import { getFileContentForMigration, IntegrityReport } from 'alfresco-soap-api';

const result = await getFileContentForMigration(client, nodeRef);

// Complete integrity report
const integrity: IntegrityReport = result.integrity;
console.log('File valid:', integrity.isValid);
console.log('MD5:', integrity.checksums.md5);
console.log('SHA256:', integrity.checksums.sha256);
console.log('Size match:', integrity.downloadedSize === integrity.expectedSize);
```

### Integrity Verification Process

1. **Size Verification**: Compare downloaded bytes vs Alfresco metadata
2. **Checksum Generation**: MD5 and SHA256 for verification
3. **Metadata Validation**: Filename, MIME type, encoding checks  
4. **Content Validation**: Ensure content is not empty or corrupted
5. **Audit Trail**: Complete log of all verification steps

### Example Integrity Report
```json
{
  "nodeRef": "workspace://SpacesStore/12345",
  "isValid": true,
  "errors": [],
  "warnings": ["Using generic MIME type"],
  "checksums": {
    "md5": "d41d8cd98f00b204e9800998ecf8427e",
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "downloadedSize": 1024,
  "expectedSize": 1024,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔐 Why Our Approach Ensures Perfect Integrity

### 1. **Same Method as Alfresco**
We use **identical content URLs** that Alfresco generates:
```
/alfresco/d/d/workspace/SpacesStore/{uuid}/content.bin?alf_ticket={ticket}
```

### 2. **Metadata Cross-Verification**
- Get expected size/type from SOAP metadata
- Compare with downloaded content
- Verify checksums match

### 3. **Multiple Transport Validation**
- Try SOAP content streaming first
- Fallback to HTTP download
- Both methods verified against same metadata

### 4. **Cryptographic Verification**
```ts
// Generate checksums for verification
const integrity = result.integrity;
const md5 = integrity.checksums.md5;      // For quick verification
const sha256 = integrity.checksums.sha256; // For secure verification
```

## 📊 Migration Tool Example

```ts
import { 
  AlfrescoClient, 
  getFileContentForMigration, 
  getChildren 
} from 'alfresco-soap-api';

async function migrateFolder(client: AlfrescoClient, folderNodeRef: string, outputDir: string) {
  const children = await getChildren(client, folderNodeRef);
  
  for (const child of children) {
    if (child.type === 'cm:content') {
      try {
        // Migration-grade download with full integrity checking
        const result = await getFileContentForMigration(client, child.nodeRef);
        
        if (!result.integrity.isValid) {
          console.error(`INTEGRITY FAILED for ${child.name}:`, result.integrity.errors);
          continue; // Skip corrupted files
        }
        
        // Save file with integrity verification
        const outputPath = path.join(outputDir, result.filename);
        await fs.writeFile(outputPath, result.buffer);
        
        // Create audit record
        const auditRecord = {
          sourceNodeRef: child.nodeRef,
          filename: result.filename,
          size: result.size,
          md5: result.integrity.checksums.md5,
          sha256: result.integrity.checksums.sha256,
          migrationTime: new Date().toISOString(),
          integrityChecks: result.integrity.checks
        };
        
        await saveAuditRecord(auditRecord);
        console.log(`✅ Migrated: ${result.filename} (${result.size} bytes, MD5: ${result.integrity.checksums.md5})`);
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${child.name}:`, error);
      }
    }
  }
}
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

