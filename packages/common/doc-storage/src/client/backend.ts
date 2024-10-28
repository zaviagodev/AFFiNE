import EventEmitter2 from 'eventemitter2';

import {
  ConnectOp,
  DestroyOp,
  DisconnectOp,
  OpConsumer,
  type OpSubscribableHandler,
  SubscribeConnectionStatusOp,
} from '../op';
import type { Storage, StorageType } from '../storage';

export class PeerStorageBackend extends OpConsumer {
  private readonly storages: Map<StorageType, Storage> = new Map();
  private readonly replacedStorages: Set<Storage> = new Set();
  private readonly event = new EventEmitter2();
  private readonly storageListeners: WeakMap<Storage, () => void> = new Map();

  constructor(port: MessagePort) {
    super(port);
    this.register(ConnectOp, this.connect);
    this.register(DisconnectOp, this.disconnect);
    this.register(DestroyOp, this.destroy);
    this.registerSubscribable(
      SubscribeConnectionStatusOp,
      this.onStatusChanged
    );
    this.listen();
  }

  addBackendStorage<T extends new (...args: any) => Storage>(
    Impl: T,
    ...opts: ConstructorParameters<T>
  ) {
    const storage = new Impl(...opts);
    const registered = this.storages.get(storage.storageType);
    if (registered) {
      this.replacedStorages.add(registered);
      this.storageListeners.get(registered)?.();
    }
    this.storageListeners.set(
      storage,
      storage.connection.onStatusChanged((status, error) => {
        this.event.emit('statusChanged', {
          storageType: storage.storageType,
          status,
          error,
        });
      })
    );
    this.storages.set(storage.storageType, storage);
  }

  connect = async () => {
    await Promise.allSettled(
      Array.from(this.storages.values()).map(async storage => {
        await storage.connect();
      })
    );

    await Promise.allSettled(
      Array.from(this.replacedStorages).map(async storage => {
        await storage.disconnect();
        this.replacedStorages.delete(storage);
      })
    );
  };

  disconnect = async () => {
    await Promise.allSettled(
      Object.values(this.storages).map(async storage => {
        await storage.disconnect();
      })
    );
    await Promise.allSettled(
      Array.from(this.replacedStorages).map(async storage => {
        await storage.disconnect();
        this.replacedStorages.delete(storage);
      })
    );
  };

  override destroy = async () => {
    this.close();
    super.destroy();
    await this.disconnect();
    this.storages.clear();
    this.replacedStorages.clear();
    this.event.removeAllListeners();
  };

  onStatusChanged: OpSubscribableHandler<SubscribeConnectionStatusOp> = (
    _,
    callback
  ) => {
    this.event.on('statusChanged', callback);

    return () => {
      this.event.off('statusChanged', callback);
    };
  };
}
