# alfresco-soap-api Next.js Example

This example demonstrates how to use the `alfresco-soap-api` Node.js library in a Next.js app to browse Alfresco Content Services via SOAP.

## Features
- Configure your Alfresco server connection (scheme/address) via environment variables
- The UI shows the top-level folders (e.g., Sites, User Homes, Data Dictionary) from Company Home as navigation buttons in the header
- Clicking a header button shows its subfolders/files in the sidebar, allowing you to browse deeper
- All backend API calls use the npm library and return normalized data

## Setup

1. Install dependencies:
   ```sh
   npm install
   # or
   yarn install
   ```

2. Set environment variables in `.env.local`:
   ```env
   ALFRESCO_URL=http://localhost:8080
   ALFRESCO_USERNAME=admin
   ALFRESCO_PASSWORD=admin
   ALFRESCO_SCHEME=workspace
   ALFRESCO_ADDRESS=SpacesStore
   ```
   - Only the configured store (scheme/address) is used. The UI will not show other stores.

3. Start the app:
   ```sh
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage
- The header displays buttons for each top-level folder under Company Home (e.g., Sites, User Homes, Data Dictionary).
- Click a button to view its contents in the sidebar.
- Click items in the sidebar to navigate deeper into folders/files.
- Use the back button in the sidebar to go up a level.

## Example
```
Header: [ Sites ] [ User Homes ] [ Data Dictionary ]
Sidebar: Shows folders/files inside the selected root (e.g., Sites)
Main area: Shows details for the selected node
```

## Customization
- To change the default store, update `ALFRESCO_SCHEME` and `ALFRESCO_ADDRESS` in your environment variables.
- The backend only uses the configured store and does not show other stores in the UI.

## Library Reference
See the [alfresco-soap-api README](./node_modules/alfresco-soap-api/README.md) for full API documentation. 