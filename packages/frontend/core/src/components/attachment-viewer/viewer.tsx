import { IconButton, observeResize, Scrollable } from '@affine/component';
import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';
import { CollapseIcon, ExpandIcon } from '@blocksuite/icons/rc';
import clsx from 'clsx';
import { debounce } from 'lodash-es';
import type { ReactElement } from 'react';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { VirtuosoHandle, VirtuosoProps } from 'react-virtuoso';
import { Virtuoso } from 'react-virtuoso';

import * as styles from './styles.css';
import { getAttachmentBlob, renderItem } from './utils';
import type { DocInfo, MessageData, MessageDataType } from './worker/types';
import { MessageOp, RenderKind, State } from './worker/types';

type ItemProps = VirtuosoProps<null, undefined>;

const Page = React.memo(
  ({
    width,
    height,
    className,
  }: {
    index: number;
    width: number;
    height: number;
    className: string;
  }) => {
    return (
      <div
        className={className}
        style={{ width: `${width}px`, height: `${height}px` }}
      ></div>
    );
  }
);

Page.displayName = 'viewer-page';

const THUMBNAIL_WIDTH = 94;

const Thumbnail = React.memo(
  ({
    index,
    width,
    height,
    className,
    onSelect,
  }: {
    index: number;
    width: number;
    height: number;
    className: string;
    onSelect: (index: number) => void;
  }) => {
    return (
      <div
        className={className}
        style={{ width: `${width}px`, height: `${height}px` }}
        onClick={() => onSelect(index)}
      ></div>
    );
  }
);

Thumbnail.displayName = 'viewer-thumbnail';

const Scroller = React.forwardRef<HTMLDivElement, ItemProps>(
  ({ ...props }, ref) => {
    return (
      <Scrollable.Root>
        <Scrollable.Viewport ref={ref} {...props} />
        <Scrollable.Scrollbar />
      </Scrollable.Root>
    );
  }
);

Scroller.displayName = 'viewer-scroller';

const Item = React.forwardRef<HTMLDivElement, ItemProps>(
  ({ ...props }, ref) => {
    return <div ref={ref} {...props} />;
  }
);

Item.displayName = 'viewer-item';

interface ViewerProps {
  model: AttachmentBlockModel;
}

export const Viewer = ({ model }: ViewerProps): ReactElement => {
  const [state, setState] = useState(State.Connecting);
  const [viewportInfo, setViewportInfo] = useState({
    dpi: window.devicePixelRatio,
    width: 1,
    height: 1,
  });
  const [docInfo, setDocInfo] = useState<DocInfo>({
    total: 0,
    width: 1,
    height: 1,
  });
  const [cursor, setCursor] = useState(0);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const scrollerHandleRef = useRef<VirtuosoHandle | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const [mainVisibleRange, setMainVisibleRange] = useState({
    startIndex: 0,
    endIndex: 0,
  });

  const [collapsed, setCollapsed] = useState(true);
  const thumbnailsScrollerHandleRef = useRef<VirtuosoHandle | null>(null);
  const thumbnailsScrollerRef = useRef<HTMLElement | null>(null);
  const [thumbnailsVisibleRange, setThumbnailsVisibleRange] = useState({
    startIndex: 0,
    endIndex: 0,
  });

  const post = useCallback(
    <T extends MessageOp>(
      type: T,
      data?: MessageDataType[T],
      transfers?: Transferable[]
    ) => {
      const message = { type, [type]: data };
      if (transfers?.length) {
        workerRef.current?.postMessage(message, transfers);
        return;
      }
      workerRef.current?.postMessage(message);
    },
    [workerRef]
  );

  const render = useCallback(
    (id: number, kind: RenderKind, imageData: ImageData) => {
      renderItem(
        (kind === RenderKind.Page ? scrollerRef : thumbnailsScrollerRef)
          .current,
        id,
        imageData
      );
    },
    [scrollerRef, thumbnailsScrollerRef]
  );

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const { total } = docInfo;
    if (!total) return;

    const { scrollTop, scrollHeight } = el;
    const itemHeight = scrollHeight / total;
    const n = scrollTop / itemHeight;
    const t = n / total;
    const index = Math.floor(n + t);
    const cursor = Math.min(index, total - 1);

    setCursor(cursor);
  }, [scrollerRef, docInfo]);

  const onSelect = useCallback(
    (index: number) => {
      scrollerHandleRef.current?.scrollToIndex({
        index,
        align: 'start',
        behavior: 'smooth',
      });
    },
    [scrollerHandleRef]
  );

  const updateMainVisibleRange = useMemo(
    () => debounce(setMainVisibleRange, 233, { trailing: true }),
    [setMainVisibleRange]
  );

  const updateThumbnailsVisibleRange = useMemo(
    () => debounce(setThumbnailsVisibleRange, 233, { trailing: true }),
    [setThumbnailsVisibleRange]
  );

  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;

    return observeResize(el, entry => {
      const rect = entry.contentRect;
      setViewportInfo(info => ({
        ...info,
        width: rect.width,
        height: rect.height,
      }));
    });
  }, [viewerRef]);

  useEffect(() => {
    post(MessageOp.Render, {
      range: mainVisibleRange,
      kind: RenderKind.Page,
      scale: 1 * viewportInfo.dpi,
    });
  }, [viewportInfo, mainVisibleRange, post]);

  useEffect(() => {
    if (collapsed) return;

    post(MessageOp.Render, {
      range: thumbnailsVisibleRange,
      kind: RenderKind.Thumbnail,
      scale: (THUMBNAIL_WIDTH / docInfo.width) * viewportInfo.dpi,
    });
  }, [collapsed, docInfo, viewportInfo, thumbnailsVisibleRange, post]);

  useLayoutEffect(() => {
    workerRef.current = new Worker(
      /* webpackChunkName: "pdf.worker" */ new URL(
        './worker/worker.ts',
        import.meta.url
      )
    );

    async function process({ data }: MessageEvent<MessageData>) {
      const { type } = data;

      switch (type) {
        case MessageOp.Init: {
          setState(State.Connecting);
          break;
        }

        case MessageOp.Inited: {
          setState(State.Connected);
          break;
        }

        case MessageOp.Opened: {
          const info = data[type];
          setDocInfo(o => ({ ...o, ...info }));
          setState(State.Opened);
          break;
        }

        case MessageOp.Rendered: {
          const { index, kind, imageData } = data[type];
          render(index, kind, imageData);
          break;
        }
      }
    }

    workerRef.current.addEventListener('message', event => {
      process(event).catch(console.error);
    });

    return () => {
      workerRef.current?.terminate();
    };
  }, [model, post, render]);

  useEffect(() => {
    if (!model.sourceId) return;
    if (state !== State.Connected) return;

    getAttachmentBlob(model)
      .then(blob => {
        if (!blob) return;
        return blob.arrayBuffer();
      })
      .then(buffer => {
        if (!buffer) return;
        setState(State.Opening);
        post(MessageOp.Open, buffer, [buffer]);
      })
      .catch(console.error);
  }, [state, post, model, docInfo]);

  const pageContent = useCallback(
    (index: number) => {
      return (
        <Page
          key={index}
          index={index}
          className={styles.viewerPage}
          width={docInfo.width}
          height={docInfo.height}
        />
      );
    },
    [docInfo]
  );

  const thumbnailContent = useCallback(
    (index: number) => {
      return (
        <Thumbnail
          key={index}
          index={index}
          className={clsx([
            styles.thumbnailsPage,
            { selected: index === cursor },
          ])}
          width={THUMBNAIL_WIDTH}
          height={Math.ceil((docInfo.height / docInfo.width) * THUMBNAIL_WIDTH)}
          onSelect={onSelect}
        />
      );
    },
    [cursor, docInfo, onSelect]
  );

  const mainComponents = useMemo(() => {
    return {
      Header: () => <div style={{ width: '100%', height: '20px' }} />,
      Footer: () => <div style={{ width: '100%', height: '20px' }} />,
      Item: (props: ItemProps) => (
        <Item className={styles.mainItemWrapper} {...props} />
      ),
      Scroller,
    };
  }, []);

  const thumbnailsComponents = useMemo(() => {
    return {
      Item: (props: ItemProps) => (
        <Item className={styles.thumbnailsItemWrapper} {...props} />
      ),
      Scroller,
    };
  }, []);

  const increaseViewportBy = useMemo(() => {
    const size = Math.min(5, docInfo.total);
    const itemHeight = docInfo.height + 20;
    const height = Math.ceil(size * itemHeight);
    return {
      top: height,
      bottom: height,
    };
  }, [docInfo]);

  const mainStyle = useMemo(() => {
    const { height: vh } = viewportInfo;
    const { total: t, height: h, width: w } = docInfo;
    const height = Math.min(
      vh - 60 - 24 - 24 - 2 - 8,
      t * THUMBNAIL_WIDTH * (h / w) + (t - 1) * 12
    );
    return {
      height: `${height}px`,
    };
  }, [docInfo, viewportInfo]);

  return (
    <div
      data-testid="attachment-viewer"
      className={clsx([
        styles.body,
        {
          gridding: true,
          scrollable: true,
        },
      ])}
      ref={viewerRef}
    >
      <Virtuoso<null, ItemProps['context']>
        onScroll={onScroll}
        ref={scrollerHandleRef}
        scrollerRef={scroller => {
          if (scrollerRef.current) return;
          scrollerRef.current = scroller as HTMLElement;
        }}
        className={styles.virtuoso}
        rangeChanged={updateMainVisibleRange}
        increaseViewportBy={increaseViewportBy}
        totalCount={docInfo.total}
        itemContent={pageContent}
        components={mainComponents}
      />
      <div className={clsx(['thumbnails', styles.thumbnails])}>
        <div className={clsx([styles.thumbnailsPages, { collapsed }])}>
          <Virtuoso<null, ItemProps['context']>
            style={mainStyle}
            ref={thumbnailsScrollerHandleRef}
            scrollerRef={scroller => {
              if (thumbnailsScrollerRef.current) return;
              thumbnailsScrollerRef.current = scroller as HTMLElement;
            }}
            rangeChanged={updateThumbnailsVisibleRange}
            className={styles.virtuoso}
            totalCount={docInfo.total}
            itemContent={thumbnailContent}
            components={thumbnailsComponents}
          />
        </div>
        <div className={clsx(['indicator', styles.thumbnailsIndicator])}>
          <div>
            <span className="page-count">
              {docInfo.total > 0 ? cursor + 1 : 0}
            </span>
            /<span className="page-total">{docInfo.total}</span>
          </div>
          <IconButton
            icon={collapsed ? <CollapseIcon /> : <ExpandIcon />}
            onClick={() => setCollapsed(!collapsed)}
          />
        </div>
      </div>
    </div>
  );
};
