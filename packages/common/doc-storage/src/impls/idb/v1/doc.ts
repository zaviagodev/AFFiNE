import { share } from '../../../connection';
import type { OpHandler } from '../../../op';
import {
  type DocRecord,
  DocStorage,
  type DocStorageOptions,
  type GetDocSnapshotOp,
} from '../../../storage';
import type {
  DeleteDocOp,
  GetDocTimestampsOp,
  PushDocUpdateOp,
} from '../../../storage/ops';
import { DocIDBConnection } from './db';

export interface IndexedDBDocStorageOptions extends DocStorageOptions {}

export class IndexedDBDocStorage extends DocStorage<IndexedDBDocStorageOptions> {
  readonly connection = share(new DocIDBConnection());

  get db() {
    return this.connection.inner;
  }

  get name() {
    return 'idb(old)';
  }

  override pushDocUpdate: OpHandler<PushDocUpdateOp> = async update => {
    // no more writes to old db
    return { docId: update.docId, timestamp: new Date() };
  };

  protected getDocSnapshot: OpHandler<GetDocSnapshotOp> = async ({ docId }) => {
    const trx = this.db.transaction('workspace', 'readonly');
    const record = await trx.store.get(docId);

    if (!record) {
      return null;
    }

    return {
      docId,
      bin: await this.mergeUpdates(record.updates.map(update => update.update)),
      timestamp: new Date(record.updates.at(-1)?.timestamp ?? Date.now()),
    };
  };

  override deleteDoc: OpHandler<DeleteDocOp> = async ({ docId }) => {
    const trx = this.db.transaction('workspace', 'readwrite');
    await trx.store.delete(docId);
  };

  override getDocTimestamps: OpHandler<GetDocTimestampsOp> = async () => {
    return {};
  };

  protected override async setDocSnapshot(): Promise<boolean> {
    return false;
  }

  protected override async getDocUpdates(): Promise<DocRecord[]> {
    return [];
  }

  protected override async markUpdatesMerged(): Promise<number> {
    return 0;
  }
}
