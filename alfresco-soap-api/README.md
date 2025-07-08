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
- **Native WSDL-compliant SOAP methods**: Uses Alfresco's official `queryChildren` SOAP operation for reliable folder navigation
- **Automatic nodeRef normalization**: All nodeRefs are parsed and passed to the Alfresco SOAP API in the correct `{ scheme, address, uuid }` format, so you never have to worry about SOAP compatibility
- **WSDL-compliant operations**: All SOAP methods strictly follow the Alfresco RepositoryService WSDL specification
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
- `getChildren(client, nodeRef)` — Get children of a node (always returns an array of properly formatted node objects, uses native Alfresco SOAP `queryChildren` method)
- `authenticate(client)` — Authenticate and get a ticket

## Example Project

A full-stack example using this library in a Next.js app is provided in the [`nextjs-example`](../nextjs-example) folder.

- See [`nextjs-example/README.md`](../nextjs-example/README.md) for setup and usage instructions.
- The example demonstrates how to use this library in Next.js API routes and connect a React frontend to Alfresco.

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

### Additional SOAP Operations
The library also provides:

- **`queryParents`**: Gets parent nodes using the official SOAP method
- **`get`**: Retrieves individual nodes with proper Predicate structure
- **`query`**: Executes Lucene queries with full WSDL compliance

### Why This Approach Works
- **Official Alfresco API**: Uses methods designed by Alfresco for exactly this purpose
- **No reverse engineering**: No need to guess parent associations or build complex paths
- **Server-optimized**: Alfresco handles all the complex relationship resolution internally
- **Consistent across versions**: WSDL specification ensures compatibility

## Troubleshooting

- **SOAP method errors**: All SOAP methods now strictly follow the WSDL specification. If you encounter method errors, verify your Alfresco server's SOAP API is enabled and accessible.
- **Navigation errors**: The library uses native `queryChildren` for folder navigation. If folders don't load, check that the user has permission to access the folder's children.
- **Node access errors**: If you see "Node not found" errors, verify the nodeRef exists and the user has read permissions.
- **WSDL compliance**: All SOAP calls follow the official Alfresco RepositoryService WSDL. The library automatically formats nodeRefs and parameters correctly.
- **Empty results**: If folders appear empty, check user permissions and that the Alfresco SOAP API is returning data correctly.
- **NodeRef format:** Ensure nodeRefs are in the form `workspace://SpacesStore/UUID`. The library handles parsing and SOAP formatting automatically.
- **Authentication**: Verify your credentials and that the user account has access to the folders you're trying to browse.

## Notes
- This package is **Node.js only**. Do not import it in browser code.
- Use in Next.js API routes, Express, or any Node.js backend.
- All methods return normalized, developer-friendly data structures.
- `getChildren` works reliably for any nodeRef using official Alfresco SOAP methods, so you can browse Sites, User Homes, Data Dictionary, and all subfolders/files.
- **WSDL-compliant**: All SOAP operations strictly follow the Alfresco RepositoryService WSDL specification for maximum compatibility.
- **No custom workarounds**: Uses only official Alfresco API methods as intended by the platform.

## License

MIT

