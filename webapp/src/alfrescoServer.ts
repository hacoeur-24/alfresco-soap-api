/**
 * Configuration and helpers for connecting to Alfresco from the frontend.
 * Allows user to set server URL and optionally the root nodeRef.
 * If root nodeRef is not set, provides a function to fetch it dynamically.
 */

export interface AlfrescoConfig {
  serverUrl: string;
  rootNodeRef?: string; // Optional: if not set, will be discovered
}

// Default config (user can override)
export const alfrescoConfig: AlfrescoConfig = {
  serverUrl: '/api', // Default: proxy to backend, or set to full URL
  // rootNodeRef: undefined, // User can set this if known
};

/**
 * Fetch the nodeRef for Company Home by querying the backend.
 * Returns the nodeRef as a string, or throws if not found.
 */
export async function fetchCompanyHomeNodeRef(): Promise<string> {
  // This assumes the backend exposes an endpoint for this query
  const res = await fetch(`${alfrescoConfig.serverUrl}/company-home-noderef`);
  if (!res.ok) throw new Error('Failed to fetch Company Home nodeRef');
  const data = await res.json();
  if (data.nodeRef) return data.nodeRef;
  throw new Error('Company Home nodeRef not found');
}

/**
 * Get the root nodeRef to use for navigation.
 * If set in config, use it. Otherwise, fetch dynamically.
 */
export async function getRootNodeRef(): Promise<string> {
  if (alfrescoConfig.rootNodeRef) return alfrescoConfig.rootNodeRef;
  return fetchCompanyHomeNodeRef();
} 