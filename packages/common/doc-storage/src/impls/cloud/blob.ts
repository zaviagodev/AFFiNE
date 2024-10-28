import {
  deleteBlobMutation,
  gqlFetcherFactory,
  listBlobsQuery,
  releaseDeletedBlobsMutation,
  setBlobMutation,
} from '@affine/graphql';

import { DummyConnection } from '../../connection';
import type { OpHandler } from '../../op';
import { BlobStorage, type BlobStorageOptions } from '../../storage';
import type {
  DeleteBlobOp,
  GetBlobOp,
  ListBlobsOp,
  ReleaseBlobsOp,
  SetBlobOp,
} from '../../storage/ops';

interface CloudBlobStorageOptions extends BlobStorageOptions {
  endpoint: string;
}

export class CloudBlobStorage extends BlobStorage<CloudBlobStorageOptions> {
  private readonly gql = gqlFetcherFactory(this.options.endpoint + '/graphql');
  override connection = new DummyConnection();

  override get: OpHandler<GetBlobOp> = async ({ key }) => {
    const res = await fetch(
      this.options.endpoint +
        '/api/workspaces/' +
        this.spaceId +
        '/blobs/' +
        key,
      { cache: 'default' }
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.arrayBuffer();

    return {
      key,
      data: new Uint8Array(data),
      mime: res.headers.get('content-type') || '',
      size: data.byteLength,
      createdAt: new Date(res.headers.get('last-modified') || Date.now()),
    };
  };

  override set: OpHandler<SetBlobOp> = async blob => {
    await this.gql({
      query: setBlobMutation,
      variables: {
        workspaceId: this.spaceId,
        blob: new File([blob.data], blob.key, { type: blob.mime }),
      },
    });
  };

  override delete: OpHandler<DeleteBlobOp> = async ({ key, permanently }) => {
    await this.gql({
      query: deleteBlobMutation,
      variables: { workspaceId: this.spaceId, key, permanently },
    });
  };

  override release: OpHandler<ReleaseBlobsOp> = async () => {
    await this.gql({
      query: releaseDeletedBlobsMutation,
      variables: { workspaceId: this.spaceId },
    });
  };

  override list: OpHandler<ListBlobsOp> = async () => {
    const res = await this.gql({
      query: listBlobsQuery,
      variables: { workspaceId: this.spaceId },
    });

    return res.workspace.blobs.map(blob => ({
      ...blob,
      createdAt: new Date(blob.createdAt),
    }));
  };
}
