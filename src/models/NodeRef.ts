export type NodeRef = string;

export function parseNodeRef(nodeRef: string): { store: string; id: string } {
  const [store, id] = nodeRef.split('://');
  return { store, id };
}

export function makeNodeRef(store: string, id: string): NodeRef {
  return `${store}://${id}`;
} 