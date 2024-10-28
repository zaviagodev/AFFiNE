import EventEmitter2 from 'eventemitter2';

import type {
  Op,
  OpInput,
  OpMessage,
  OpMessageHandlers,
  OpNextMessage,
  OpOutput,
  OpReturnMessage,
  OpSubscribeMessage,
  Subscription,
} from './types';
import { AutoOpHandler } from './types';

export type OpHandler<OpType extends Op<any, any>> = (
  payload: OpInput<OpType>,
  consumer: OpConsumer
) => Promise<OpOutput<OpType>> | OpOutput<OpType>;

export type OpSubscribableHandler<OpType extends Op<any, any>> = (
  payload: OpInput<OpType>,
  callback: (payload: OpOutput<OpType>) => void,
  consumer: OpConsumer
) => () => void;

export class OpConsumer extends AutoOpHandler {
  private readonly eventBus = new EventEmitter2();

  private readonly registeredOpHandlers = new Map<
    string,
    OpHandler<Op<any, any>>
  >();
  private readonly registeredSubscribeOpHandlers = new Map<
    string,
    OpSubscribableHandler<Op<any, any>>
  >();
  private readonly processing = new Map<string, Subscription | undefined>();

  override get handlers() {
    return {
      op: this.handleOpMessage,
      'op:subscribe': this.handleSubscribeOpMessage,
      'op:cancel': this.handleCancelOpMessage,
    };
  }

  private readonly handleOpMessage: OpMessageHandlers['op'] = async msg => {
    this.processing.set(msg.id, undefined);

    try {
      this.eventBus.emit(`before:${msg.name}`, msg.payload);
      const ret = await this.call(msg);
      this.eventBus.emit(`after:${msg.name}`, msg.payload, ret);
      this.port.postMessage({
        type: 'op:return',
        id: msg.id,
        return: ret,
      } satisfies OpReturnMessage<any>);
    } catch (e) {
      if (!this.processing.has(msg.id)) {
        return;
      }
      this.port.postMessage({
        type: 'op:return',
        id: msg.id,
        error: e as any,
      } satisfies OpReturnMessage<any>);
    } finally {
      this.processing.delete(msg.id);
    }
  };

  private readonly handleSubscribeOpMessage: OpMessageHandlers['op:subscribe'] =
    msg => {
      const subscription = this.subscribe(msg, payload => {
        this.port.postMessage({
          type: 'op:next',
          id: msg.id,
          return: payload,
        } satisfies OpNextMessage<any>);
      });

      this.processing.set(msg.id, subscription);
    };

  private readonly handleCancelOpMessage: OpMessageHandlers['op:cancel'] =
    msg => {
      const sub = this.processing.get(msg.id);
      if (sub) {
        sub.unsubscribe();
      }
      this.processing.delete(msg.id);
    };

  register<T extends Op<any, any>>(
    op: { new (...args: any[]): T },
    handler: OpHandler<T>
  ) {
    this.registeredOpHandlers.set(op.name, handler);
  }

  registerSubscribable<T extends Op<any, any>>(
    op: { new (...args: any[]): T },
    handler: OpSubscribableHandler<T>
  ) {
    this.registeredSubscribeOpHandlers.set(op.name, handler);
  }

  before<T extends Op<any, any>>(
    op: { new (...args: any[]): T },
    handler: (input: OpInput<T>) => void
  ) {
    this.eventBus.on(`before:${op.name}`, handler);
  }

  after<T extends Op<any, any>>(
    op: { new (...args: any[]): T },
    handler: (input: OpInput<T>, output: OpOutput<T>) => void
  ) {
    this.eventBus.on(`after:${op.name}`, handler);
  }

  /**
   * @internal
   */
  async call(op: OpMessage) {
    const handler = this.registeredOpHandlers.get(op.name);
    if (!handler) {
      throw new Error(`Handler for operation [${op}] is not registered.`);
    }

    return handler(op.payload, this);
  }

  /**
   * @internal
   */
  subscribe(
    op: OpSubscribeMessage,
    callback: (payload: any) => void
  ): Subscription {
    const handler = this.registeredSubscribeOpHandlers.get(op.name);
    if (!handler) {
      throw new Error(`Handler for operation [${op}] is not registered.`);
    }

    const unsubscribe = handler(op.payload, callback, this);

    return {
      unsubscribe,
    };
  }

  destroy() {
    this.registeredOpHandlers.clear();
    this.registeredSubscribeOpHandlers.clear();
    this.processing.clear();
  }
}
