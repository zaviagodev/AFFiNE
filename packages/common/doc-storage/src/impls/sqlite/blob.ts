import { share } from '../../connection';
import type { OpHandler } from '../../op';
import { BlobStorage, type BlobStorageOptions } from '../../storage';
import type {
  DeleteBlobOp,
  GetBlobOp,
  ListBlobsOp,
  ReleaseBlobsOp,
  SetBlobOp,
} from '../../storage/ops';
import { NativeDBConnection } from './db';

interface SqliteBlobStorageOptions extends BlobStorageOptions {
  dbPath: string;
}

export class SqliteBlobStorage extends BlobStorage<SqliteBlobStorageOptions> {
  override connection = share(new NativeDBConnection(this.options.dbPath));

  get db() {
    return this.connection.inner;
  }

  override get: OpHandler<GetBlobOp> = async ({ key }) => {
    return this.db.getBlob(key);
  };

  override set: OpHandler<SetBlobOp> = async blob => {
    await this.db.setBlob(blob);
  };

  override delete: OpHandler<DeleteBlobOp> = async ({ key, permanently }) => {
    await this.db.deleteBlob(key, permanently);
  };

  override release: OpHandler<ReleaseBlobsOp> = async () => {
    await this.db.releaseBlobs();
  };

  override list: OpHandler<ListBlobsOp> = async () => {
    return this.db.listBlobs();
  };
}
