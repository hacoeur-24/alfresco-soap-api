# alfresco-soap-api

A api project for consuming Alfresco SOAP APIs with Node.js, Express, and a React frontend.

## Features
- TypeScript SDK for Alfresco SOAP (AuthenticationService, RepositoryService)
- Express backend with `/stores` API
- React frontend to display Alfresco stores

## Getting Started

### 1. Clone and Install Dependencies
```sh
npm install
cd webapp && npm install
```

### 2. Create `.env` at Project Root
```
ALFRESCO_URL=http://<host>:<port>
ALFRESCO_USER=admin
ALFRESCO_PASS=admin
```

### 3. Run the Backend
```sh
npm run dev
```

The backend will authenticate with Alfresco and expose `GET /stores`.

### 4. Run the Frontend
```sh
npm run client:dev
```

The React app will be available at [http://localhost:5173](http://localhost:5173) and will fetch `/stores` from the backend.

### 5. Test the API
- Open [http://localhost:5173](http://localhost:5173) in your browser.
- Click "Reload Stores" to fetch and display Alfresco stores.
- You can also test the backend directly: [http://localhost:3001/stores](http://localhost:3001/stores)

## Scripts
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "ts-node src/server.ts",
    "client:dev": "cd webapp && npm run dev",
    "client:build": "cd webapp && npm run build"
  }
}
```

## Project Structure
```
alfresco-soap-api/
├── src/
│   ├── common/SoapService.ts
│   ├── services/AuthenticationService.ts
│   ├── services/RepositoryService.ts
│   ├── models/NodeRef.ts, StoreRef.ts
│   └── server.ts
├── webapp/ (React frontend)
├── .env
├── package.json, tsconfig.json
└── README.md
```

---

**Note:**
- Ensure your Alfresco server is running and accessible from the backend.
- The backend logs in on startup and uses the ticket for SOAP requests.

