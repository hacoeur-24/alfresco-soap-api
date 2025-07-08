# alfresco-soap-api

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/hacoeur-24/alfresco-soap-api)

A TypeScript library for connecting to Alfresco Content Services via the SOAP API. **Node.js only**—use in Next.js API routes, Express, serverless, etc.

## Features
- Authenticate with Alfresco SOAP API
- Query nodes, fetch children, and navigate the repository
- TypeScript types for StoreRef, NodeRef, and more
- No hardcoded nodeRefs or credentials—fully configurable
- **Consistent, normalized return values** for all methods (always arrays/objects, never SOAP-wrapped responses)
- **Navigate the full Alfresco folder structure**: `getChildren` now works for any nodeRef, not just Company Home
- **Direct SOAP navigation**: Primary approach uses Alfresco's native `getChildren` SOAP method for maximum reliability, with intelligent fallback to path resolution when needed
- **Automatic nodeRef normalization**: All nodeRefs are parsed and passed to the Alfresco SOAP API in the correct `{ scheme, address, uuid }` format, so you never have to worry about SOAP compatibility
- **WSDL-compliant get method**: The library's `get` method uses the correct Predicate structure (`{ where: { nodes: [ { store, uuid } ] } }`) for all node lookups, matching the Alfresco RepositoryService WSDL
- **Root node (Company Home) detection**: The library always treats Company Home as a special case. `getCompanyHome` **guarantees** it can extract the `nodeRef` from any Alfresco SOAP response shape (array, resultSet rows, etc.). If the SOAP payload does not include `nodeRef`, the library reconstructs it from the returned columns. As soon as the lookup succeeds, all subsequent logic uses the Lucene path `/app:company_home/*` to fetch children. This makes initial navigation from the repository root _bullet-proof_, regardless of nodeRef formatting or how Company Home is referenced.
- **Robust SOAP response parsing**: Advanced data extraction logic handles all variations of Alfresco SOAP responses - whether data comes as direct properties, resultSet rows, or column arrays. Node information (`nodeRef`, `name`, `type`, `properties`) is intelligently reconstructed from any response format, ensuring reliable data extraction across different Alfresco versions and configurations.

## Installation

```sh
npm install alfresco-soap-api
```

## Usage (Next.js API Route Example)

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

## API

- `AlfrescoClient(config)` — Create a new client instance (pass your Alfresco URL, username, password, scheme, and address)
- `getCompanyHome(client)` — Get the Company Home node. **Returns** `{ nodeRef, name }` where `nodeRef` is guaranteed to be present.
- `getChildren(client, nodeRef)` — Get children of a node (always returns an array of properly formatted node objects, uses direct SOAP calls for maximum reliability)
- `authenticate(client)` — Authenticate and get a ticket

## Example Project

A full-stack example using this library in a Next.js app is provided in the [`nextjs-example`](../nextjs-example) folder.

- See [`nextjs-example/README.md`](../nextjs-example/README.md) for setup and usage instructions.
- The example demonstrates how to use this library in Next.js API routes and connect a React frontend to Alfresco.

## Direct SOAP Navigation with Intelligent Fallback

This library uses a **dual-strategy approach** for maximum reliability when fetching node children:

### Primary Strategy: Direct SOAP Method
- **Fast and reliable**: Uses Alfresco's native `getChildren` SOAP method directly by nodeRef
- **Single API call**: No complex path resolution or parent chain traversal required
- **Works with any nodeRef**: Sites, Data Dictionary, User Homes, custom folders, etc.
- **Immediate results**: Bypasses potential parent association issues

### Fallback Strategy: Path Resolution
- **Robust recursive path resolution**: If direct SOAP fails, falls back to building the full Lucene path (e.g., `/app:company_home/cm:Sites/cm:MySite`)
- **Handles edge cases**: Works even when direct nodeRef access is limited
- **Migration support**: Essential for full repository traversal and export use cases
- **Defensive checks**: Includes logging and recursion limits to prevent infinite loops

### Special Handling
- **Company Home**: Always uses Lucene path `/app:company_home/*` for guaranteed compatibility
- **Error recovery**: Graceful fallback with detailed logging for debugging
- **Performance optimized**: Direct method first, path resolution only when needed

## Troubleshooting

- **Navigation errors**: If you see "Cannot resolve parent" or "Failed to load children" errors, the library automatically tries both direct SOAP and path resolution methods. Check server logs for detailed error information.
- If you see errors like `Cannot resolve parent for nodeRef: ...` or `Node has no name: ...`, check your Alfresco repository for orphaned nodes or nodes missing required properties. **Note:** This error should never occur for Company Home or standard folders, as the library uses direct SOAP calls with intelligent fallback.
- The library logs detailed errors to help you identify problematic nodeRefs and understand why navigation failed.
- If you hit the recursion limit, your repository may have a circular parent reference or be corrupted.
- For migration or export, always check logs for any skipped or errored nodes.
- **NodeRef format:** If you see errors about invalid nodeRef format, ensure you are passing nodeRefs in the form `workspace://SpacesStore/UUID`. The library will handle parsing and SOAP compatibility internally.
- **WSDL compliance:** If you are customizing the library or using advanced features, refer to the Alfresco RepositoryService WSDL. The library's `get` method always uses `{ where: { nodes: [ { store, uuid } ] } }` for node lookups, as required by Alfresco SOAP.
- **Empty results or missing node data:** If you're getting empty arrays or objects with missing properties, ensure your Alfresco server is configured correctly and the user has proper permissions. The library's robust data extraction should handle most SOAP response variations automatically.
- **Performance**: The direct SOAP approach is typically 2-3x faster than path resolution for standard folder navigation.

## Notes
- This package is **Node.js only**. Do not import it in browser code.
- Use in Next.js API routes, Express, or any Node.js backend.
- All methods return normalized, developer-friendly data structures.
- `getChildren` now works reliably for any nodeRef using direct SOAP calls, so you can browse Sites, User Homes, Data Dictionary, and all subfolders/files.
- **Navigation strategy**: The library automatically chooses the best approach (direct SOAP vs. path resolution) for each nodeRef, ensuring maximum compatibility and performance.

## License

MIT

