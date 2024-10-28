import type { ConnectionStatus } from '../connection';
import type { StorageType } from '../storage';
import { Op } from './types';

export class ConnectOp extends Op<void, void> {}
export class DisconnectOp extends Op<void, void> {}
export class SubscribeConnectionStatusOp extends Op<
  void,
  {
    storageType: StorageType;
    status: ConnectionStatus;
    error?: Error;
  }
> {}
export class DestroyOp extends Op<void, void> {}
