# Alfresco SOAP API Client

[![npm version](https://img.shields.io/npm/v/alfresco-soap-api.svg)](https://www.npmjs.com/package/alfresco-soap-api)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern TypeScript client for Alfresco SOAP API with simplified convenience methods and service proxies. Create powerful Alfresco integrations with minimal setup.

## 🚀 Features

- **Simple API**: Direct methods on `AlfrescoClient` for all common operations
- **Service Proxies**: Easy access via `client.repository`, `client.content`, `client.auth`
- **Smart Defaults**: Optional configuration with sensible defaults
- **Unified Endpoints**: Create single API endpoints handling multiple operations
- **TypeScript**: Full type safety and IntelliSense support
- **Automatic Auth**: All methods handle authentication automatically

## 📦 Installation

```bash
npm install alfresco-soap-api
```

## ⚡ Quick Start

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

## 📁 Project Structure

This repository contains:

### 🔧 Core Library
- **[`alfresco-soap-api/`](./alfresco-soap-api/)** - The main TypeScript library source code
  - Full TypeScript client implementation
  - Service classes for Repository, Content, and Authentication
  - Type definitions and models
  - Build configuration and package files

### 🌐 Example Application  
- **[`nextjs-example/`](./nextjs-example/)** - Complete Next.js application demonstrating library usage
  - Modern React-based file browser interface
  - Unified API endpoint pattern (`/api/alfresco`)
  - File viewing and downloading capabilities
  - See the [Next.js Example README](./nextjs-example/README.md) for setup instructions

## 📚 Documentation

### 📖 Complete API Documentation
For full API reference, configuration options, and usage patterns, visit:
**[📦 NPM Package Documentation](https://www.npmjs.com/package/alfresco-soap-api)**

### 🎯 Key Methods
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

### 🔗 Service Proxies
```typescript
// Repository service proxy
await client.repository.getStores()
await client.repository.query(store, query, includeMetaData)
await client.repository.get(nodeRef)

// Content service proxy  
await client.content.read(nodeRef, property)
await client.content.write(nodeRef, content, property, format)
await client.content.getDownloadUrl(nodeRef)

// Authentication service proxy
await client.auth.login(username, password)
await client.auth.logout(ticket)
```

## 🚀 Getting Started

### 1. Try the Example
The fastest way to see the library in action:

```bash
cd nextjs-example
npm install
cp .env.example .env.local  # Configure your Alfresco server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the file browser interface.

### 2. Use in Your Project
Install the package and start building:

```bash
npm install alfresco-soap-api
```

See the [NPM documentation](https://www.npmjs.com/package/alfresco-soap-api) for detailed usage patterns.

## 🔧 Development

### Building the Library
```bash
cd alfresco-soap-api
npm install
npm run build
```

### Running Tests
```bash
cd alfresco-soap-api
npm test
```

### Local Development with Example
To use the local library version in the example:

```bash
cd nextjs-example
npm install
# The example is already configured to use the local library
npm run dev
```

## 🌟 Use Cases

- **Content Management Systems**: Browse and manage Alfresco repositories
- **Document Processing**: Automated content workflows
- **File Browsers**: Web-based interfaces for Alfresco content
- **Integration Services**: Connect applications to Alfresco
- **Migration Tools**: Data extraction and transformation
- **Reporting Systems**: Content analytics and metadata processing

## 📄 Requirements

- **Node.js**: 14.x or higher
- **TypeScript**: 4.x or higher (for development)
- **Alfresco**: Compatible with Alfresco Community/Enterprise editions

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./alfresco-soap-api/LICENSE) file for details.

## 🔗 Links

- **[📦 NPM Package](https://www.npmjs.com/package/alfresco-soap-api)** - Install and view detailed documentation
- **[🌐 Next.js Example](./nextjs-example/)** - Complete working example application
- **[🔧 Library Source](./alfresco-soap-api/)** - Core library implementation
- **[📖 API Documentation](https://www.npmjs.com/package/alfresco-soap-api)** - Full method reference and usage patterns

## 📊 Stats

- **Latest Version**: 2.0.0
- **Weekly Downloads**: 1,400+
- **TypeScript**: Full type safety included
- **Bundle Size**: 82.7 kB unpacked
