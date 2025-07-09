# 🌐 Alfresco SOAP API - Next.js Example

A modern, responsive web application that demonstrates how to build a complete **Alfresco Content Services file browser** using the `alfresco-soap-api` library with Next.js and React.

## 📸 What You'll See

This example creates a **3-panel file browser interface**:
- **Header**: Navigation buttons for top-level folders (Sites, User Homes, Data Dictionary, etc.)
- **Sidebar**: Hierarchical folder navigation with back button and file listings
- **Main Area**: Detailed information about selected files/folders with download capabilities

![Interface Overview](https://img.shields.io/badge/Interface-3_Panel_Design-blue)

## ✨ Key Features

### 🎯 **User Experience**
- **Intuitive Navigation**: Click header buttons → browse sidebar → view details
- **File Operations**: View and download any file directly in your browser
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Error Handling**: Friendly error messages with dismissible modals
- **Loading States**: Clear loading indicators during API operations

### 🔧 **Technical Highlights**
- **Unified API**: Single `/api/alfresco` endpoint handles all operations
- **TypeScript**: Full type safety throughout the application
- **Modern React**: Uses React 19 with hooks and functional components
- **Icons**: Beautiful file type icons using React Icons (FaFile, FaFolder, etc.)
- **No External CSS Frameworks**: Clean, custom styling with inline styles

### 📋 **Supported Operations**
- Browse Company Home and all child folders
- Navigate through folder hierarchies
- View file and folder metadata
- Download files with proper authentication
- Display files in browser (PDFs, images, etc.)
- Search functionality ready for extension

## 🚀 Quick Start

### 1. **Prerequisites**
- Node.js 14+ installed
- Access to an Alfresco Content Services instance
- Alfresco admin credentials

### 2. **Installation**
```bash
# Clone or download this example
cd nextjs-example

# Install dependencies
npm install
```

### 3. **Configuration**
Create a `.env.local` file in the project root:

```env
# Required: Your Alfresco server details
ALFRESCO_URL=http://your-alfresco-server:8080
ALFRESCO_USERNAME=admin
ALFRESCO_PASSWORD=admin

# Optional: Store configuration (defaults shown)
ALFRESCO_SCHEME=workspace
ALFRESCO_ADDRESS=SpacesStore
```

**🔒 Security Note**: Never commit `.env.local` to version control. The `.env` file in this example is for demonstration only.

### 4. **Run the Application**
```bash
# Start development server
npm run dev

# Or build for production
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎮 How to Use

### **First Steps**
1. **Start the app** - You'll see the header loading Company Home folders
2. **Choose a root folder** - Click any button in the header (e.g., "Sites")
3. **Browse content** - Use the sidebar to navigate through folders
4. **View details** - Click any item to see its details in the main area
5. **Download files** - Click the download button on any file

### **Navigation Patterns**
```
Header: [Sites] [User Homes] [Data Dictionary] [Reload]
         ↓
Sidebar: → Browse into "Sites"
         → See all site folders
         → Click to go deeper
         ← Back button to go up
         ↓
Main Area: → Selected item details
           → File metadata
           → Download/view options
```

### **File Operations**
- **👁️ View File**: Click the "Open" button to view files in a new tab
- **💾 Download File**: Click the "Download" button to save files locally
- **📁 Browse Folders**: Click folder names to navigate deeper
- **🔙 Go Back**: Use the "←" button in the sidebar to go up levels

## 🏗️ Project Structure

### **📂 Application Architecture**
```
nextjs-example/
├── app/
│   ├── api/alfresco/route.ts      # 🔗 Unified API endpoint
│   ├── components/
│   │   ├── Header.tsx             # 🎯 Top navigation bar
│   │   ├── Sidebar.tsx            # 📂 Folder browser
│   │   ├── MainContent.tsx        # 📄 Content details
│   │   ├── ErrorModal.tsx         # ❌ Error display
│   │   └── CollapsibleCard.tsx    # 🗂️ Expandable sections
│   ├── page.tsx                   # 🏠 Main application
│   ├── layout.tsx                 # 🎨 App layout
│   └── globals.css                # 🎭 Global styles
├── package.json                   # 📦 Dependencies
└── tsconfig.json                  # ⚙️ TypeScript config
```

### **🔄 API Endpoint Design**
The example uses a **single API route** with action-based routing:

```typescript
// All operations go through /api/alfresco with different actions:

GET /api/alfresco?action=company-home
GET /api/alfresco?action=children&nodeRef=<nodeRef>
GET /api/alfresco?action=content&nodeRef=<nodeRef>&download=true
GET /api/alfresco?action=stores
```

**Why this approach?**
- ✅ Simplified API management
- ✅ Consistent error handling  
- ✅ Single client configuration
- ✅ Easy to extend with new actions

### **🎨 Component Responsibilities**

#### **Header.tsx**
- Displays Company Home's top-level folders as navigation buttons
- Handles root folder selection
- Provides reload functionality
- Shows active/selected state

#### **Sidebar.tsx**  
- Hierarchical folder navigation
- Displays files and folders with appropriate icons
- Handles navigation stack (breadcrumb-like functionality)
- Back button for going up folder levels

#### **MainContent.tsx**
- Shows detailed information for selected files/folders
- Displays metadata and properties
- Provides file operation buttons (view/download)
- Groups content into collapsible sections

#### **ErrorModal.tsx**
- Displays user-friendly error messages
- Modal overlay with dismiss functionality
- Consistent error styling

#### **CollapsibleCard.tsx**
- Reusable component for organizing content sections
- Smooth expand/collapse animations
- Consistent styling throughout the app

## 🔧 Customization & Extension

### **🎨 Styling**
The app uses a consistent color palette defined in each component:
```typescript
const COLORS = {
  mainBg: '#3AAFA9',      // Teal background
  sidebar: '#2B7A78',     // Dark teal
  sidebarBg: '#DEF2F1',   // Light teal
  nav: '#17252A',         // Dark navy
  white: '#FEFFFF',       // Clean white
  text: '#17252A',        // Dark text
};
```

### **📁 Adding New File Types**
To support additional file types, update the icon mapping in `Sidebar.tsx` and `MainContent.tsx`:

```typescript
// Add new file extensions
case 'dwg':
  return <FaFileCode style={{ color: '#ff9800' }} />;
case 'sketch':
  return <FaFileImage style={{ color: '#e91e63' }} />;
```

### **🔍 Adding Search Functionality**
The API already supports search. To add a search UI:

1. Add search input to Header component
2. Create new API action: `GET /api/alfresco?action=search&query=<term>`
3. Update the unified API route with search handling

### **🗂️ Multi-Store Support**
To browse multiple Alfresco stores:

1. Use the existing `stores` action to get available stores
2. Add store selector to Header component
3. Pass store parameters to API calls

## 🔍 Troubleshooting

### **Common Issues**

#### **❌ "Failed to fetch Company Home"**
- **Check**: Alfresco server URL in `.env.local`
- **Verify**: Server is running and accessible
- **Test**: Try accessing `http://your-server:8080/alfresco` in browser

#### **❌ "Authentication failed"**
- **Check**: Username and password in `.env.local`
- **Verify**: Credentials work in Alfresco web interface
- **Note**: Some Alfresco instances require specific user permissions

#### **❌ "CORS errors" in browser console**
- **Solution**: This is server-side only - no CORS issues
- **Check**: You're not trying to use the library in client-side code

#### **❌ "Download links not working"**
- **Check**: File permissions in Alfresco
- **Verify**: Alfresco is configured for external access
- **Note**: URLs include authentication tokens automatically

### **🔧 Development Tips**

#### **Debugging API Calls**
```typescript
// Enable detailed logging in the API route
console.log('Action:', action);
console.log('NodeRef:', nodeRef);
console.log('Client config:', { url, username });
```

#### **Testing Different Content Types**
```typescript
// Add this to your .env.local for testing
ALFRESCO_URL=https://demo.alfresco.com  # Public demo instance
ALFRESCO_USERNAME=demo
ALFRESCO_PASSWORD=demo
```

#### **Performance Optimization**
- API routes cache Alfresco client instances
- Consider implementing client-side caching for folder structures
- Large folders might need pagination (not implemented in this example)

## 📚 Learning Resources

### **Understanding the Code**
1. **Start with**: `app/page.tsx` - Main application logic
2. **Then explore**: `app/api/alfresco/route.ts` - API integration
3. **UI Components**: Each component in `app/components/` handles specific functionality
4. **Styling**: Inline styles with consistent color scheme

### **Next Steps**
- **Extend functionality**: Add file upload, folder creation, search
- **Improve UX**: Add drag & drop, keyboard navigation, bulk operations
- **Enterprise features**: User management, permissions, workflows

### **Related Documentation**
- **[alfresco-soap-api NPM Package](https://www.npmjs.com/package/alfresco-soap-api)** - Complete API reference
- **[Alfresco REST API](https://docs.alfresco.com/content-services/latest/develop/rest-api-guide/)** - Alternative API approach
- **[Next.js Documentation](https://nextjs.org/docs)** - Framework features and best practices

## 🚀 Deployment

### **Production Build**
```bash
npm run build
npm start
```

### **Environment Variables for Production**
```env
ALFRESCO_URL=https://your-production-alfresco.com
ALFRESCO_USERNAME=service-account
ALFRESCO_PASSWORD=secure-password
NODE_ENV=production
```

### **Deployment Platforms**
- **Vercel**: Perfect for Next.js (may need serverless function timeout adjustments)
- **Docker**: Standard containerization works well
- **Traditional servers**: Standard Node.js deployment

## 📄 License

This example is provided under the same license as the main library. Feel free to use it as a starting point for your own Alfresco integrations!

---

**Need help?** Check the [main library documentation](../alfresco-soap-api/) or open an issue on GitHub. 