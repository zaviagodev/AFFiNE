import type { OpConsumer, OpHandler } from '../op';
import {
  DeleteBlobOp,
  GetBlobOp,
  ListBlobsOp,
  ReleaseBlobsOp,
  SetBlobOp,
} from './ops';
import { Storage, type StorageOptions } from './storage';

export interface BlobStorageOptions extends StorageOptions {}

export interface BlobRecord {
  key: string;
  data: Uint8Array;
  mime: string;
  createdAt: Date;
}

export interface ListedBlobRecord {
  key: string;
  mime: string;
  size: number;
  createdAt: Date;
}

export abstract class BlobStorage<
  Options extends BlobStorageOptions = BlobStorageOptions,
> extends Storage<Options> {
  override readonly storageType = 'blob';

  abstract get: OpHandler<GetBlobOp>;
  abstract set: OpHandler<SetBlobOp>;
  abstract delete: OpHandler<DeleteBlobOp>;
  abstract release: OpHandler<ReleaseBlobsOp>;
  abstract list: OpHandler<ListBlobsOp>;

  override register(consumer: OpConsumer): void {
    consumer.register(GetBlobOp, this.get);
    consumer.register(SetBlobOp, this.set);
    consumer.register(DeleteBlobOp, this.delete);
    consumer.register(ReleaseBlobsOp, this.release);
    consumer.register(ListBlobsOp, this.list);
  }
}
