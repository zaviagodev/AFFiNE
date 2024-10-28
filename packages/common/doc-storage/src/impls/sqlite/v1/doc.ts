import { apis } from '@affine/electron-api';

import { DummyConnection, share } from '../../../connection';
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

interface SqliteDocStorageOptions extends DocStorageOptions {
  dbPath: string;
}

export class SqliteDocStorage extends DocStorage<SqliteDocStorageOptions> {
  override connection = share(new DummyConnection());

  get name() {
    return 'sqlite(old)';
  }

  get db() {
    if (!apis) {
      throw new Error('Not in electron context.');
    }

    return apis.db;
  }

  override pushDocUpdate: OpHandler<PushDocUpdateOp> = async ({ docId }) => {
    // no more writes

    return { docId, timestamp: new Date() };
  };

  override deleteDoc: OpHandler<DeleteDocOp> = async ({ docId }) => {
    await this.db.deleteDoc(this.spaceType, this.spaceId, docId);
  };

  protected override getDocSnapshot: OpHandler<GetDocSnapshotOp> = async ({
    docId,
  }) => {
    const bin = await this.db.getDocAsUpdates(
      this.spaceType,
      this.spaceId,
      docId
    );

    return {
      docId,
      bin,
      timestamp: new Date(),
    };
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
