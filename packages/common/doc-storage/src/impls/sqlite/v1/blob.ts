import { apis } from '@affine/electron-api';

import { DummyConnection, share } from '../../../connection';
import type { OpHandler } from '../../../op';
import { BlobStorage, type BlobStorageOptions } from '../../../storage';
import type {
  DeleteBlobOp,
  GetBlobOp,
  ListBlobsOp,
  ReleaseBlobsOp,
  SetBlobOp,
} from '../../../storage/ops';

interface SqliteBlobStorageOptions extends BlobStorageOptions {
  dbPath: string;
}

export class SqliteBlobStorage extends BlobStorage<SqliteBlobStorageOptions> {
  override connection = share(new DummyConnection());

  get db() {
    if (!apis) {
      throw new Error('Not in electron context.');
    }

    return apis.db;
  }

  override get: OpHandler<GetBlobOp> = async ({ key }) => {
    const data: Uint8Array | null = await this.db.getBlob(
      this.spaceType,
      this.spaceId,
      key
    );

    if (!data) {
      return null;
    }

    return {
      key,
      data,
      mime: '',
      createdAt: new Date(),
    };
  };

  override set: OpHandler<SetBlobOp> = () => {
    // no more writes
  };

  override delete: OpHandler<DeleteBlobOp> = async ({ key, permanently }) => {
    if (permanently) {
      await this.db.deleteBlob(this.spaceType, this.spaceId, key);
    }
  };

  override release: OpHandler<ReleaseBlobsOp> = () => {};

  override list: OpHandler<ListBlobsOp> = async () => {
    const keys = await this.db.getBlobKeys(this.spaceType, this.spaceId);

    return keys.map(key => ({
      key,
      mime: '',
      size: 0,
      createdAt: new Date(),
    }));
  };
}
