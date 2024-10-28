import { share } from '../../../connection';
import { type OpHandler } from '../../../op';
import {
  BlobStorage,
  type BlobStorageOptions,
  type ListedBlobRecord,
} from '../../../storage';
import type {
  DeleteBlobOp,
  GetBlobOp,
  ListBlobsOp,
  ReleaseBlobsOp,
  SetBlobOp,
} from '../../../storage/ops';
import { BlobIDBConnection } from './db';

export interface IndexedDBBlobStorageOptions extends BlobStorageOptions {
  dbName: string;
}

export class IndexedDBBlobStorage extends BlobStorage<IndexedDBBlobStorageOptions> {
  readonly connection = share(new BlobIDBConnection(this.spaceId));

  get db() {
    return this.connection.inner;
  }

  override get: OpHandler<GetBlobOp> = async ({ key }) => {
    const trx = this.db.transaction('blob', 'readonly');
    const blob = await trx.store.get(key);
    if (!blob) {
      return null;
    }

    return {
      key,
      mime: 'application/octet-stream',
      createdAt: new Date(),
      data: new Uint8Array(blob),
    };
  };

  override set: OpHandler<SetBlobOp> = () => {
    // no more writes
  };

  override delete: OpHandler<DeleteBlobOp> = async ({ key, permanently }) => {
    if (permanently) {
      const trx = this.db.transaction('blob', 'readwrite');
      await trx.store.delete(key);
    }
  };

  override release: OpHandler<ReleaseBlobsOp> = () => {};

  override list: OpHandler<ListBlobsOp> = async () => {
    const trx = this.db.transaction('blob', 'readonly');
    const it = trx.store.iterate();

    const records: ListedBlobRecord[] = [];

    for await (const { key, value } of it) {
      records.push({
        key,
        mime: 'application/octet-stream',
        size: value.byteLength,
        createdAt: new Date(),
      });
    }

    return records;
  };
}
