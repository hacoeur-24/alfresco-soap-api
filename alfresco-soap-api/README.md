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
- **Robust recursive path resolution**: `getChildren` can traverse all folders and subfolders, making it ideal for migration and full repository traversal
- **Automatic nodeRef normalization**: All nodeRefs are parsed and passed to the Alfresco SOAP API in the correct `{ scheme, address, uuid }` format, so you never have to worry about SOAP compatibility
- **WSDL-compliant get method**: The library's `get` method uses the correct Predicate structure (`{ where: { nodes: [ { store, uuid } ] } }`) for all node lookups, matching the Alfresco RepositoryService WSDL
- **Root node (Company Home) detection**: The library always treats Company Home as a special case: if the nodeRef matches the known Company Home nodeRef (normalized), or is `/app:company_home` or `/app:company_home/*`, it will always use the Lucene path `/app:company_home/*` to fetch children. This guarantees navigation from the repository root always works, regardless of nodeRef format or how Company Home is referenced.

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
- `getCompanyHome(client)` — Get the Company Home node
- `getChildren(client, nodeRef)` — Get children of a node (always returns an array, works for any folder/nodeRef by resolving the full path recursively)
- `authenticate(client)` — Authenticate and get a ticket

## Example Project

A full-stack example using this library in a Next.js app is provided in the [`nextjs-example`](../nextjs-example) folder.

- See [`nextjs-example/README.md`](../nextjs-example/README.md) for setup and usage instructions.
- The example demonstrates how to use this library in Next.js API routes and connect a React frontend to Alfresco.

## Robust Recursive Path Resolution

Alfresco's SOAP API does not provide a direct way to fetch children for any nodeRef. This library implements a robust recursive path resolution algorithm:

- For any nodeRef, the library will recursively fetch the node and its parent chain, building the full Lucene path (e.g., `/app:company_home/cm:Sites/cm:MySite`).
- **Special handling for Company Home/root nodes:** The library always treats Company Home as a special case: if the nodeRef matches the known Company Home nodeRef (normalized), or is `/app:company_home` or `/app:company_home/*`, it will always use the Lucene path `/app:company_home/*` to fetch children. This prevents errors like "Could not resolve parent for nodeRef: ..." when browsing from the repository root, regardless of nodeRef formatting or how Company Home is referenced, and guarantees navigation from the root always works.
- This path is then used in a Lucene query to fetch children, enabling navigation and traversal for all folders, subfolders, and files.
- This approach is industry standard for Alfresco integrations and is essential for migration, export, and deep traversal use cases.
- The implementation includes defensive checks, logging, and a recursion limit to prevent infinite loops and help debug edge cases.
- **NodeRef normalization:** The library automatically parses nodeRefs and passes them to the Alfresco SOAP API in the correct `{ scheme, address, uuid }` format for all navigation and migration operations.
- **WSDL compliance:** The library's `get` method always uses the correct Predicate structure as required by the Alfresco RepositoryService WSDL (see below).

## Troubleshooting

- If you see errors like `Cannot resolve parent for nodeRef: ...` or `Node has no name: ...`, check your Alfresco repository for orphaned nodes or nodes missing required properties. **Note:** This error should never occur for Company Home or root nodes, as the library now detects and handles these cases automatically, even if nodeRef formatting is inconsistent.
- The library logs detailed errors to help you identify problematic nodeRefs and understand why a path could not be resolved.
- If you hit the recursion limit, your repository may have a circular parent reference or be corrupted.
- For migration or export, always check logs for any skipped or errored nodes.
- **NodeRef format:** If you see errors about invalid nodeRef format, ensure you are passing nodeRefs in the form `workspace://SpacesStore/UUID`. The library will handle parsing and SOAP compatibility internally.
- **WSDL compliance:** If you are customizing the library or using advanced features, refer to the Alfresco RepositoryService WSDL. The library's `get` method always uses `{ where: { nodes: [ { store, uuid } ] } }` for node lookups, as required by Alfresco SOAP.

## Notes
- This package is **Node.js only**. Do not import it in browser code.
- Use in Next.js API routes, Express, or any Node.js backend.
- All methods return normalized, developer-friendly data structures.
- `getChildren` now works for any nodeRef, so you can browse Sites, User Homes, Data Dictionary, and all subfolders/files.
- **Path resolution:** The library will recursively resolve the full Lucene path for any nodeRef, enabling robust navigation and migration use cases (e.g., full repository export, folder/file migration, etc.).

## License

MIT

