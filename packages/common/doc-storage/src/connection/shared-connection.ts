import type { Connection } from './connection';

const CONNECTIONS: Map<string, Connection<any>> = new Map();
export function share<T extends Connection<any>>(conn: T): T {
  if (!conn.shareId) {
    throw new Error(
      `Connection ${conn.constructor.name} is not shareable.\nIf you want to make it shareable, please override [shareId].`
    );
  }

  const existing = CONNECTIONS.get(conn.shareId);

  if (existing) {
    existing.ref();
    return existing as T;
  }

  CONNECTIONS.set(conn.shareId, conn);
  conn.ref();

  return conn;
}
