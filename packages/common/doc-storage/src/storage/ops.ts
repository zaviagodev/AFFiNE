import { Op } from '../op';
import type { BlobRecord, ListedBlobRecord } from './blob';
import type { DocClock, DocClocks, DocDiff, DocRecord, DocUpdate } from './doc';
import type { HistoryFilter, ListedHistory } from './history';

// Doc Operations
export class GetDocOp extends Op<{ docId: string }, DocRecord | null> {}
export class GetDocDiffOp extends Op<
  { docId: string; state?: Uint8Array },
  DocDiff | null
> {}
export class PushDocUpdateOp extends Op<DocUpdate, DocClock> {}
export class GetDocTimestampsOp extends Op<{ after?: Date }, DocClocks> {}
export class DeleteDocOp extends Op<{ docId: string }, void> {}
export class SubscribeDocUpdateOp extends Op<void, DocRecord> {}

// History Operations
export class ListHistoryOp extends Op<
  { docId: string; filter?: HistoryFilter },
  ListedHistory[]
> {}
export class GetHistoryOp extends Op<DocClock, DocRecord | null> {}
export class CreateHistoryOp extends Op<{ docId: string }, void> {}
export class DeleteHistoryOp extends Op<DocClock, void> {}
export class RollbackDocOp extends Op<DocClock & { editor?: string }, void> {}

// Blob Operations
export class GetBlobOp extends Op<{ key: string }, BlobRecord | null> {}
export class SetBlobOp extends Op<BlobRecord, void> {}
export class DeleteBlobOp extends Op<
  { key: string; permanently: boolean },
  void
> {}
export class ReleaseBlobsOp extends Op<void, void> {}
export class ListBlobsOp extends Op<void, ListedBlobRecord[]> {}

// Sync Operations
export class GetPeerClocksOp extends Op<{ peer: string }, DocClocks> {}
export class SetPeerClockOp extends Op<{ peer: string } & DocClock, void> {}
export class GetPeerPushedClocksOp extends Op<{ peer: string }, DocClocks> {}
export class SetPeerPushedClockOp extends Op<
  { peer: string } & DocClock,
  void
> {}
export class ClearPeerClocksOp extends Op<void, void> {}
