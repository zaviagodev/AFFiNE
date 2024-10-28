import { diffUpdate, encodeStateVectorFromUpdate, mergeUpdates } from 'yjs';

import {
  Op,
  type OpConsumer,
  type OpHandler,
  type OpSubscribableHandler,
} from '../op';
import type { Lock } from './lock';
import { SingletonLocker } from './lock';
import {
  DeleteDocOp,
  GetDocDiffOp,
  GetDocOp,
  GetDocTimestampsOp,
  PushDocUpdateOp,
  SubscribeDocUpdateOp,
} from './ops';
import { Storage, type StorageOptions } from './storage';

export interface DocClock {
  docId: string;
  timestamp: Date;
}

export type DocClocks = Record<string, Date>;
export interface DocRecord extends DocClock {
  bin: Uint8Array;
  editor?: string;
}

export interface DocDiff extends DocClock {
  missing: Uint8Array;
  state: Uint8Array;
}

export interface DocUpdate {
  docId: string;
  bin: Uint8Array;
  editor?: string;
}

export interface Editor {
  name: string;
  avatarUrl: string | null;
}

export interface DocStorageOptions extends StorageOptions {
  mergeUpdates?: (updates: Uint8Array[]) => Promise<Uint8Array> | Uint8Array;
}

// internal op
export class GetDocSnapshotOp extends Op<{ docId: string }, DocRecord | null> {}

export abstract class DocStorage<
  Opts extends DocStorageOptions = DocStorageOptions,
> extends Storage<Opts> {
  override readonly storageType = 'doc';
  private readonly locker = new SingletonLocker();

  abstract get name(): string;

  /**
   * Tell a binary is empty yjs binary or not.
   *
   * NOTE:
   *   `[0, 0]` is empty yjs update binary
   *   `[0]` is empty yjs state vector binary
   */
  isEmptyBin(bin: Uint8Array): boolean {
    return (
      bin.length === 0 ||
      // 0x0 for state vector
      (bin.length === 1 && bin[0] === 0) ||
      // 0x00 for update
      (bin.length === 2 && bin[0] === 0 && bin[1] === 0)
    );
  }

  // REGION: open apis by Op system
  /**
   * Get a doc record with latest binary.
   */
  getDoc: OpHandler<GetDocOp> = async ({ docId }, consumer) => {
    await using _lock = await this.lockDocForUpdate(docId);

    const snapshot = await this.getDocSnapshot({ docId }, consumer);
    const updates = await this.getDocUpdates(docId);

    if (updates.length) {
      const { timestamp, bin, editor } = await this.squash(
        snapshot ? [snapshot, ...updates] : updates
      );

      const newSnapshot = {
        spaceId: this.spaceId,
        docId,
        bin,
        timestamp,
        editor,
      };

      await this.setDocSnapshot(newSnapshot, snapshot);

      // always mark updates as merged unless throws
      await this.markUpdatesMerged(docId, updates);

      return newSnapshot;
    }

    return snapshot;
  };

  /**
   * Get a yjs binary diff with the given state vector.
   */
  getDocDiff: OpHandler<GetDocDiffOp> = async ({ docId, state }, ctx) => {
    const doc = await this.getDoc({ docId }, ctx);

    if (!doc) {
      return null;
    }

    return {
      docId,
      missing: state ? diffUpdate(doc.bin, state) : doc.bin,
      state: encodeStateVectorFromUpdate(doc.bin),
      timestamp: doc.timestamp,
    };
  };

  /**
   * Push updates into storage
   */
  abstract pushDocUpdate: OpHandler<PushDocUpdateOp>;

  /**
   * Get all docs timestamps info. especially for useful in sync process.
   */
  abstract getDocTimestamps: OpHandler<GetDocTimestampsOp>;

  /**
   * Delete a specific doc data with all snapshots and updates
   */
  abstract deleteDoc: OpHandler<DeleteDocOp>;

  /**
   * Subscribe on doc updates emitted from storage itself.
   *
   * NOTE:
   *
   *   There is not always update emitted from storage itself.
   *
   *   For example, in Sqlite storage, the update will only come from user's updating on docs,
   *   in other words, the update will never somehow auto generated in storage internally.
   *
   *   But for Cloud storage, there will be updates broadcasted from other clients,
   *   so the storage will emit updates to notify the client to integrate them.
   */
  subscribeDocUpdate: OpSubscribableHandler<SubscribeDocUpdateOp> = (
    _,
    _callback
  ) => {
    return () => {};
  };

  override register(consumer: OpConsumer): void {
    consumer.register(GetDocOp, this.getDoc);
    consumer.register(GetDocDiffOp, this.getDocDiff);
    consumer.register(PushDocUpdateOp, this.pushDocUpdate);
    consumer.register(GetDocTimestampsOp, this.getDocTimestamps);
    consumer.register(DeleteDocOp, this.deleteDoc);
    consumer.register(GetDocSnapshotOp, this.getDocSnapshot);
    consumer.registerSubscribable(
      SubscribeDocUpdateOp,
      this.subscribeDocUpdate
    );
  }

  // ENDREGION

  // REGION: api for internal usage
  /**
   * Get a doc snapshot from storage
   */
  protected abstract getDocSnapshot: OpHandler<GetDocSnapshotOp>;
  /**
   * Set the doc snapshot into storage
   *
   * @safety
   * be careful when implementing this method.
   *
   * It might be called with outdated snapshot when running in multi-thread environment.
   *
   * A common solution is update the snapshot record is DB only when the coming one's timestamp is newer.
   *
   * @example
   * ```ts
   * await using _lock = await this.lockDocForUpdate(docId);
   * // set snapshot
   *
   * ```
   */
  protected abstract setDocSnapshot(
    snapshot: DocRecord,
    prevSnapshot: DocRecord | null
  ): Promise<boolean>;

  /**
   * Get all updates of a doc that haven't been merged into snapshot.
   *
   * Updates queue design exists for a performace concern:
   * A huge amount of write time will be saved if we don't merge updates into snapshot immediately.
   * Updates will be merged into snapshot when the latest doc is requested.
   */
  protected abstract getDocUpdates(docId: string): Promise<DocRecord[]>;

  /**
   * Mark updates as merged into snapshot.
   */
  protected abstract markUpdatesMerged(
    docId: string,
    updates: DocRecord[]
  ): Promise<number>;

  /**
   * Merge doc updates into a single update.
   */
  protected async squash(updates: DocRecord[]): Promise<DocRecord> {
    const lastUpdate = updates.at(-1);
    if (!lastUpdate) {
      throw new Error('No updates to be squashed.');
    }

    // fast return
    if (updates.length === 1) {
      return lastUpdate;
    }

    const finalUpdate = await this.mergeUpdates(updates.map(u => u.bin));

    return {
      docId: lastUpdate.docId,
      bin: finalUpdate,
      timestamp: lastUpdate.timestamp,
      editor: lastUpdate.editor,
    };
  }

  protected mergeUpdates(updates: Uint8Array[]) {
    const merge = this.options?.mergeUpdates ?? mergeUpdates;

    return merge(updates.filter(this.isEmptyBin));
  }

  protected async lockDocForUpdate(docId: string): Promise<Lock> {
    return this.locker.lock(`workspace:${this.spaceId}:update`, docId);
  }
}
