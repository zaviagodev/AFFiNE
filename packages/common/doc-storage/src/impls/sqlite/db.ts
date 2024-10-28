import { DocStorage as NativeDocStorage } from '@affine/native';

import { Connection } from '../../connection';

export class NativeDBConnection extends Connection<NativeDocStorage> {
  constructor(private readonly dbPath: string) {
    super();
  }

  override get shareId(): string {
    return `sqlite:${this.dbPath}`;
  }

  override async doConnect() {
    const conn = new NativeDocStorage(this.dbPath);
    await conn.init();
    return conn;
  }

  override async doDisconnect(conn: NativeDocStorage) {
    await conn.close();
  }
}
