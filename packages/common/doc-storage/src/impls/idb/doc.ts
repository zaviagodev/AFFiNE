import { share } from '../../connection';
import type { OpHandler } from '../../op';
import {
  type DocClocks,
  type DocRecord,
  DocStorage,
  type DocStorageOptions,
  type GetDocSnapshotOp,
} from '../../storage';
import type {
  DeleteDocOp,
  GetDocTimestampsOp,
  PushDocUpdateOp,
} from '../../storage/ops';
import { IDBConnection } from './db';

export interface IndexedDBDocStorageOptions extends DocStorageOptions {
  dbName: string;
}

export class IndexedDBDocStorage extends DocStorage<IndexedDBDocStorageOptions> {
  readonly connection = share(new IDBConnection(this.options.dbName));

  get db() {
    return this.connection.inner;
  }

  get name() {
    return 'idb';
  }

  override pushDocUpdate: OpHandler<PushDocUpdateOp> = async update => {
    const trx = this.db.transaction(['updates', 'clocks'], 'readwrite');
    const timestamp = new Date();
    await trx.objectStore('updates').add({
      ...update,
      createdAt: timestamp,
    });

    await trx.objectStore('clocks').put({ docId: update.docId, timestamp });

    return { docId: update.docId, timestamp };
  };

  protected getDocSnapshot: OpHandler<GetDocSnapshotOp> = async ({ docId }) => {
    const trx = this.db.transaction('snapshots', 'readonly');
    const record = await trx.store.get(docId);

    if (!record) {
      return null;
    }

    return {
      docId,
      bin: record.bin,
      timestamp: record.updatedAt,
    };
  };

  override deleteDoc: OpHandler<DeleteDocOp> = async ({ docId }) => {
    const trx = this.db.transaction(
      ['snapshots', 'updates', 'clocks'],
      'readwrite'
    );

    const idx = trx.objectStore('updates').index('docId');
    const iter = idx.iterate(IDBKeyRange.only(docId));

    for await (const { value } of iter) {
      await trx.objectStore('updates').delete([value.docId, value.createdAt]);
    }

    await trx.objectStore('snapshots').delete(docId);
    await trx.objectStore('clocks').delete(docId);
  };

  override getDocTimestamps: OpHandler<GetDocTimestampsOp> = async ({
    after = 0,
  }) => {
    const trx = this.db.transaction('clocks', 'readonly');

    const clocks = await trx.store.getAll();

    return clocks.reduce((ret, cur) => {
      if (cur.timestamp > after) {
        ret[cur.docId] = cur.timestamp;
      }
      return ret;
    }, {} as DocClocks);
  };

  protected override async setDocSnapshot(
    snapshot: DocRecord
  ): Promise<boolean> {
    const trx = this.db.transaction('snapshots', 'readwrite');
    const record = await trx.store.get(snapshot.docId);

    if (record && record.updatedAt < snapshot.timestamp) {
      await trx.store.put({
        docId: snapshot.docId,
        bin: snapshot.bin,
        createdAt: record?.createdAt ?? snapshot.timestamp,
        updatedAt: snapshot.timestamp,
      });
    }

    trx.commit();
    return true;
  }

  protected override async getDocUpdates(docId: string): Promise<DocRecord[]> {
    const trx = this.db.transaction('updates', 'readonly');
    const updates = await trx.store.index('docId').getAll(docId);

    return updates.map(update => ({
      docId,
      bin: update.bin,
      timestamp: update.createdAt,
    }));
  }

  protected override async markUpdatesMerged(
    docId: string,
    updates: DocRecord[]
  ): Promise<number> {
    const trx = this.db.transaction('updates', 'readwrite');

    await Promise.all(
      updates.map(update => trx.store.delete([docId, update.timestamp]))
    );

    trx.commit();
    return updates.length;
  }
}
