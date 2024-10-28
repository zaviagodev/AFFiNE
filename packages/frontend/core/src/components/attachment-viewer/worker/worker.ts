import { DebugLogger } from '@affine/debug';
import type { Document } from '@toeverything/pdf-viewer';
import {
  createPDFium,
  PageRenderingflags,
  Runtime,
  Viewer,
} from '@toeverything/pdf-viewer';

import type { MessageData, MessageDataType } from './types';
import { MessageOp, RenderKind } from './types';

const logger = new DebugLogger('affine:worker:pdf');

let inited = false;
let viewer: Viewer | null = null;
let doc: Document | undefined = undefined;

// Caches images with the range.
const cached = new Map<string, ImageData>();
const docInfo = { total: 0, width: 1, height: 1 };
const flags = PageRenderingflags.REVERSE_BYTE_ORDER | PageRenderingflags.ANNOT;
const ranges = {
  [`${RenderKind.Page}:startIndex`]: 0,
  [`${RenderKind.Page}:endIndex`]: 0,
  [`${RenderKind.Thumbnail}:startIndex`]: 0,
  [`${RenderKind.Thumbnail}:endIndex`]: 0,
};

function post<T extends MessageOp>(type: T, data?: MessageDataType[T]) {
  const message = { type, [type]: data };
  self.postMessage(message);
}

function renderToImageData(index: number, scale: number) {
  if (!viewer || !doc) return;

  const page = doc.page(index);

  if (!page) return;

  const width = Math.ceil(docInfo.width * scale);
  const height = Math.ceil(docInfo.height * scale);

  const bitmap = viewer.createBitmap(width, height, 0);
  bitmap.fill(0, 0, width, height);
  page.render(bitmap, 0, 0, width, height, 0, flags);

  const data = new Uint8ClampedArray(bitmap.toBytes());

  bitmap.close();
  page.close();

  return new ImageData(data, width, height);
}

function createJob(index: number, kind: RenderKind, scale: number) {
  return () => runJob(index, kind, scale);
}

async function runJob(index: number, kind: RenderKind, scale: number) {
  const key = `${kind}:${index}`;

  let imageData = cached.size > 0 ? cached.get(key) : undefined;

  if (!imageData) {
    try {
      imageData = renderToImageData(index, scale);
    } catch (err) {
      console.error(err);
    }

    if (!imageData) return;

    cached.set(key, imageData);
  }

  post(MessageOp.Rendered, { index, kind, imageData });
}

function clearOut(kind: RenderKind, startIndex: number, endIndex: number) {
  const oldStartIndex = ranges[`${kind}:startIndex`];
  const oldEndIndex = ranges[`${kind}:endIndex`];
  let i = 0;
  let l = 0;

  if (oldEndIndex < startIndex || oldStartIndex > endIndex) {
    i = oldStartIndex;
    l = oldEndIndex;
  } else {
    const oldMid = Math.ceil((oldStartIndex + oldEndIndex) / 2);
    const mid = Math.ceil((startIndex + endIndex) / 2);
    const diff = Math.abs(mid - oldMid);

    if (mid > oldMid) {
      i = oldStartIndex;
      l = i + diff;
    } else if (mid < oldMid) {
      i = endIndex;
      l = i + diff;
    }
  }

  for (; i < l + 1; i++) {
    cached.delete(`${kind}:${i}`);
  }

  ranges[`${kind}:startIndex`] = startIndex;
  ranges[`${kind}:endIndex`] = endIndex;
}

async function start() {
  inited = true;

  logger.debug('pdf worker pending');
  self.postMessage({ type: MessageOp.Init });

  const pdfium = await createPDFium();
  viewer = new Viewer(new Runtime(pdfium));

  self.postMessage({ type: MessageOp.Inited });
  logger.debug('pdf worker ready');
}

async function process({ data }: MessageEvent<MessageData>) {
  if (!inited) {
    await start();
  }

  if (!viewer) return;

  const { type } = data;

  switch (type) {
    case MessageOp.Open: {
      const buffer = data[type];
      if (!buffer) return;

      doc = viewer.open(new Uint8Array(buffer));

      if (!doc) return;

      const page = doc.page(0);

      if (!page) return;

      Object.assign(docInfo, {
        total: doc.pageCount(),
        height: Math.ceil(page.height()),
        width: Math.ceil(page.width()),
      });
      page.close();
      post(MessageOp.Opened, docInfo);

      break;
    }

    case MessageOp.Render: {
      if (!doc) return;

      const {
        kind,
        scale,
        range: { startIndex, endIndex },
      } = data[type];

      if (startIndex > endIndex || startIndex < 0) return;

      const { total } = docInfo;
      const queue: (() => Promise<void | [void, void]>)[] = [];

      if (startIndex === 0) {
        for (let n = startIndex; n <= endIndex; n++) {
          const b = createJob(n, kind, scale);
          queue.push(b);
        }
      } else if (endIndex + 1 === total) {
        for (let n = endIndex; n >= startIndex; n--) {
          const a = createJob(n, kind, scale);
          queue.push(a);
        }
      } else {
        const mid = Math.floor((startIndex + endIndex) / 2);
        const m = createJob(mid, kind, scale);
        queue.push(m);

        let n = 1;
        const s = Math.max(endIndex - mid, mid - startIndex);
        for (; n <= s; n++) {
          const j = Math.min(mid + n, endIndex);
          const i = Math.max(mid - (j - mid), 0);
          const a = createJob(j, kind, scale);
          const b = createJob(i, kind, scale);
          const ab = () => Promise.all([a(), b()]);
          queue.push(ab);
        }
      }

      queueMicrotask(() => {
        (async () => {
          for (const q of queue) {
            await q();
          }
        })()
          .catch(console.error)
          .finally(() => {
            clearOut(kind, startIndex, endIndex);
          });
      });

      break;
    }
  }
}

self.addEventListener('message', (event: MessageEvent<MessageData>) => {
  process(event).catch(console.error);
});

start().catch(error => {
  inited = false;
  console.log(error);
});
