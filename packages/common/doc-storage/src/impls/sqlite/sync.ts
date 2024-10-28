import { share } from '../../connection';
import type { OpHandler } from '../../op';
import {
  type DocClocks,
  SyncStorage,
  type SyncStorageOptions,
} from '../../storage';
import type {
  ClearPeerClocksOp,
  GetPeerClocksOp,
  GetPeerPushedClocksOp,
  SetPeerClockOp,
  SetPeerPushedClockOp,
} from '../../storage/ops';
import { NativeDBConnection } from './db';

export interface SqliteSyncStorageOptions extends SyncStorageOptions {
  dbPath: string;
}

export class SqliteDBSyncStorage extends SyncStorage<SqliteSyncStorageOptions> {
  override connection = share(new NativeDBConnection(this.options.dbPath));

  get db() {
    return this.connection.inner;
  }

  override getPeerClocks: OpHandler<GetPeerClocksOp> = async ({ peer }) => {
    const records = await this.db.getPeerClocks(peer);
    return records.reduce((clocks, { docId, timestamp }) => {
      clocks[docId] = timestamp;
      return clocks;
    }, {} as DocClocks);
  };

  override setPeerClock: OpHandler<SetPeerClockOp> = async ({
    peer,
    docId,
    timestamp,
  }) => {
    await this.db.setPeerClock(peer, docId, timestamp);
  };

  override getPeerPushedClocks: OpHandler<GetPeerPushedClocksOp> = async ({
    peer,
  }) => {
    const records = await this.db.getPeerPushedClocks(peer);
    return records.reduce((clocks, { docId, timestamp }) => {
      clocks[docId] = timestamp;
      return clocks;
    }, {} as DocClocks);
  };

  override setPeerPushedClock: OpHandler<SetPeerPushedClockOp> = async ({
    peer,
    docId,
    timestamp,
  }) => {
    await this.db.setPeerPushedClock(peer, docId, timestamp);
  };

  override clearClocks: OpHandler<ClearPeerClocksOp> = async () => {
    await this.db.clearClocks();
  };
}
