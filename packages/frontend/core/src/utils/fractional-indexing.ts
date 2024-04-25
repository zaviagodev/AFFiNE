import { generateKeyBetween } from 'fractional-indexing';

export interface SortableProvider<T, K extends string | number> {
  getItems(): T[];
  getItemId(item: T): K;
  getItemOrder(item: T): string;
  setItemOrder(item: T, order: string): void;
}

// Using fractional-indexing managing orders of items in a list
export function createFractionalIndexingSortableHelper<
  T,
  K extends string | number,
>(provider: SortableProvider<T, K>) {
  function getOrderedItems() {
    return provider.getItems().sort((a, b) => {
      const oa = provider.getItemOrder(a);
      const ob = provider.getItemOrder(b);
      return oa > ob ? 1 : oa < ob ? -1 : 0;
    });
  }

  function getLargestOrder() {
    const lastItem = getOrderedItems().at(-1);
    return lastItem ? provider.getItemOrder(lastItem) : null;
  }

  function getSmallestOrder() {
    const firstItem = getOrderedItems().at(0);
    return firstItem ? provider.getItemOrder(firstItem) : null;
  }

  /**
   * Get a new order at the end of the list
   */
  function getNewItemOrder() {
    return generateKeyBetween(getLargestOrder(), null);
  }

  /**
   * Move item from one position to another
   *
   * in the most common sorting case, moving over will visually place the dragging item to the target position
   * the original item in the target position will either move up or down, depending on the direction of the drag
   *
   * @param fromId
   * @param toId
   */
  function move(fromId: K, toId: K) {
    const items = getOrderedItems();
    const from = items.findIndex(i => provider.getItemId(i) === fromId);
    const to = items.findIndex(i => provider.getItemId(i) === toId);
    const fromItem = items[from];
    const toItem = items[to];
    const toNextItem = items[from < to ? to + 1 : to - 1];
    const toOrder = toItem ? provider.getItemOrder(toItem) : null;
    const toNextOrder = toNextItem ? provider.getItemOrder(toNextItem) : null;
    const args: [string | null, string | null] =
      from < to ? [toOrder, toNextOrder] : [toNextOrder, toOrder];
    provider.setItemOrder(fromItem, generateKeyBetween(...args));
  }

  /**
   * Cases example:
   * Imagine we have the following items,  | a | b | c |
   * 1. insertBefore('b', undefined). before is not provided, which means insert b after c
   * | a | c |
   *         ▴
   *         b
   * result: | a | c | b |
   *
   * 2. insertBefore('b', 'a'). insert b before a
   * | a | c |
   * ▴
   * b
   *
   * result: | b | a | c |
   */
  function insertBefore(
    id: string | number,
    beforeId: string | number | undefined
  ) {
    const items = getOrderedItems();
    // assert id is in the list
    const item = items.find(i => provider.getItemId(i) === id);
    if (!item) return;

    const beforeItemIndex = items.findIndex(
      i => provider.getItemId(i) === beforeId
    );
    const beforeItem = beforeItemIndex !== -1 ? items[beforeItemIndex] : null;
    const beforeItemPrev = beforeItem ? items[beforeItemIndex - 1] : null;

    const beforeOrder = beforeItem ? provider.getItemOrder(beforeItem) : null;
    const beforePrevOrder = beforeItemPrev
      ? provider.getItemOrder(beforeItemPrev)
      : null;

    provider.setItemOrder(
      item,
      generateKeyBetween(beforePrevOrder, beforeOrder)
    );
  }

  return {
    getOrderedItems,
    getLargestOrder,
    getSmallestOrder,
    getNewItemOrder,
    move,
    insertBefore,
  };
}
