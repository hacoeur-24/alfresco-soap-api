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
- **Enhanced parent detection**: Intelligent parent association discovery across multiple SOAP response fields and association types
- **Automatic nodeRef normalization**: All nodeRefs are parsed and passed to the Alfresco SOAP API in the correct `{ scheme, address, uuid }` format, so you never have to worry about SOAP compatibility
- **WSDL-compliant get method**: The library's `get` method uses the correct Predicate structure and attempts to include metadata for complete node information
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
- `getChildren(client, nodeRef)` — Get children of a node (always returns an array of properly formatted node objects, uses recursive path resolution with enhanced parent detection)
- `authenticate(client)` — Authenticate and get a ticket

## Example Project

A full-stack example using this library in a Next.js app is provided in the [`nextjs-example`](../nextjs-example) folder.

- See [`nextjs-example/README.md`](../nextjs-example/README.md) for setup and usage instructions.
- The example demonstrates how to use this library in Next.js API routes and connect a React frontend to Alfresco.

## Robust Path Resolution with Enhanced Parent Detection

This library implements a **comprehensive approach** to folder navigation that works across all Alfresco installations:

### Company Home Special Handling
- **Direct Lucene queries**: Company Home children are fetched using `PATH:"/app:company_home/*"` for guaranteed reliability
- **No parent resolution needed**: Bypasses any parent association issues for the root node
- **Universal compatibility**: Works regardless of nodeRef format or Alfresco version

### Enhanced Parent Association Discovery
For all other folders, the library uses intelligent parent detection:

- **Metadata inclusion**: Requests node data with `includeMetadata: true` to get complete association information
- **Multiple association types**: Looks for parent relationships in:
  - Direct parent fields (`node.parent`, `node.parentNodeRef`)
  - Association arrays (`node.associations` with `cm:contains` type)
  - Child associations (`node.childAssociations` for reverse lookup)
  - Primary parent references (`node.primaryParent`)
- **Robust fallback**: If metadata fails, falls back to basic node data
- **Debug logging**: Detailed logging shows exactly what association data is available

### Path Resolution Strategy
- **Recursive building**: Constructs full Lucene paths (e.g., `/app:company_home/st:sites/cm:MySite`)
- **Generic approach**: No hardcoded nodeRefs - works with any Alfresco repository structure
- **Association-aware**: Uses proper Alfresco association types (`cm:contains`, etc.)
- **Error handling**: Clear error messages and debug information for troubleshooting

## Troubleshooting

- **Parent resolution errors**: If you see "Cannot resolve parent" errors, check the debug logs for detailed information about what association data is available. The library now checks multiple association types and fields.
- **Enhanced debugging**: The library logs detailed information about node associations to help identify why parent resolution might fail in specific cases.
- If you see errors like `Cannot resolve parent for nodeRef: ...` or `Node has no name: ...`, check your Alfresco repository for orphaned nodes or nodes missing required properties. **Note:** This should be rare with the enhanced parent detection system.
- The library logs detailed errors to help you identify problematic nodeRefs and understand why navigation failed.
- If you hit the recursion limit, your repository may have a circular parent reference or be corrupted.
- For migration or export, always check logs for any skipped or errored nodes.
- **NodeRef format:** If you see errors about invalid nodeRef format, ensure you are passing nodeRefs in the form `workspace://SpacesStore/UUID`. The library will handle parsing and SOAP compatibility internally.
- **WSDL compliance:** If you are customizing the library or using advanced features, refer to the Alfresco RepositoryService WSDL. The library's `get` method always uses `{ where: { nodes: [ { store, uuid } ] } }` for node lookups, as required by Alfresco SOAP.
- **Empty results or missing node data:** If you're getting empty arrays or objects with missing properties, ensure your Alfresco server is configured correctly and the user has proper permissions. The library's robust data extraction should handle most SOAP response variations automatically.
- **Association data**: If parent resolution fails, check that your user account has permissions to read node associations and that the Alfresco SOAP API is configured to return metadata.

## Notes
- This package is **Node.js only**. Do not import it in browser code.
- Use in Next.js API routes, Express, or any Node.js backend.
- All methods return normalized, developer-friendly data structures.
- `getChildren` now works for any nodeRef with enhanced parent association detection, so you can browse Sites, User Homes, Data Dictionary, and all subfolders/files across any Alfresco installation.
- **Generic approach**: No hardcoded nodeRefs or paths - the library dynamically discovers folder structures using proper Alfresco associations.

## License

MIT

