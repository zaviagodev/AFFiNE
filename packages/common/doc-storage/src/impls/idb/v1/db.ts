import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

import { Connection } from '../../../connection';

export interface DocDBSchema extends DBSchema {
  workspace: {
    key: string;
    value: {
      id: string;
      updates: {
        timestamp: number;
        update: Uint8Array;
      }[];
    };
  };
}

export class DocIDBConnection extends Connection<IDBPDatabase<DocDBSchema>> {
  override get shareId() {
    return 'idb(old):affine-local';
  }

  override async doConnect() {
    return openDB<DocDBSchema>('affine-local', 1, {
      upgrade: db => {
        db.createObjectStore('workspace', { keyPath: 'id' });
      },
    });
  }

  override async doDisconnect(conn: IDBPDatabase<DocDBSchema>) {
    conn.close();
  }
}

export interface BlobDBSchema extends DBSchema {
  blob: {
    key: string;
    value: ArrayBuffer;
  };
}

export class BlobIDBConnection extends Connection<IDBPDatabase<BlobDBSchema>> {
  constructor(private readonly workspaceId: string) {
    super();
  }

  override get shareId() {
    return `idb(old-blob):${this.workspaceId}`;
  }

  override async doConnect() {
    return openDB<BlobDBSchema>(`${this.workspaceId}_blob`, 1, {
      upgrade: db => {
        db.createObjectStore('blob');
      },
    });
  }

  override async doDisconnect(conn: IDBPDatabase<BlobDBSchema>) {
    conn.close();
  }
}
