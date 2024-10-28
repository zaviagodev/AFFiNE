import { Skeleton } from '@affine/component';
import {
  type AttachmentBlockModel,
  matchFlavours,
} from '@blocksuite/affine/blocks';
import {
  type Doc,
  DocsService,
  FrameworkScope,
  useLiveData,
  useService,
} from '@toeverything/infra';
import { type ReactElement, useLayoutEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { AttachmentViewerView } from '../../../../components/attachment-viewer';
import { ViewIcon, ViewTitle } from '../../../../modules/workbench';
import { PageNotFound } from '../../404';
import * as styles from './index.css';

enum State {
  Loading,
  NotFound,
  Found,
}

type AttachmentPageProps = {
  pageId: string;
  attachmentId: string;
};

const useLoadAttachment = (pageId: string, attachmentId: string) => {
  const docsService = useService(DocsService);
  const docRecord = useLiveData(docsService.list.doc$(pageId));

  const [doc, setDoc] = useState<Doc | null>(null);
  const [state, setState] = useState(State.Loading);
  const [model, setModel] = useState<AttachmentBlockModel | null>(null);

  useLayoutEffect(() => {
    if (!docRecord) {
      setState(State.NotFound);
      return;
    }

    const { doc, release } = docsService.open(pageId);
    setDoc(doc);

    const disposables: Disposable[] = [];
    let notFound = true;

    if (doc.blockSuiteDoc.ready) {
      const block = doc.blockSuiteDoc.getBlock(attachmentId);
      if (block) {
        notFound = false;
        setModel(block.model as AttachmentBlockModel);
        setState(State.Found);
      }
    }

    if (notFound) {
      doc.blockSuiteDoc.load();

      const tid = setTimeout(() => setState(State.NotFound), 5 * 10000); // 50s
      const disposable = doc.blockSuiteDoc.slots.blockUpdated
        .filter(({ type, id }) => type === 'add' && id === attachmentId)
        // @ts-expect-error allow
        .filter(({ model }) => matchFlavours(model, ['affine:attachment']))
        // @ts-expect-error allow
        .once(({ model }) => {
          clearTimeout(tid);
          setModel(model as AttachmentBlockModel);
          setState(State.Found);
        });

      disposables.push({
        [Symbol.dispose]: () => clearTimeout(tid),
      });
      disposables.push({
        [Symbol.dispose]: () => disposable.dispose(),
      });
    }

    disposables.push({
      [Symbol.dispose]: () => release(),
    });

    return () => {
      disposables.forEach(d => d[Symbol.dispose]());
    };
  }, [docRecord, docsService, pageId, attachmentId]);

  return { state, doc, model };
};

export const AttachmentPage = ({
  pageId,
  attachmentId,
}: AttachmentPageProps): ReactElement => {
  const { state, doc, model } = useLoadAttachment(pageId, attachmentId);

  if (state === State.NotFound) {
    return <PageNotFound noPermission />;
  }

  if (state === State.Found && doc && model) {
    return (
      <FrameworkScope scope={doc.scope}>
        <ViewTitle title={model.name} />
        <ViewIcon icon={model.type.endsWith('pdf') ? 'pdf' : 'attachment'} />
        <AttachmentViewerView model={model} />
      </FrameworkScope>
    );
  }

  return (
    <div className={styles.attachmentSkeletonStyle}>
      <Skeleton
        className={styles.attachmentSkeletonItemStyle}
        animation="wave"
        height={30}
      />
      <Skeleton
        className={styles.attachmentSkeletonItemStyle}
        animation="wave"
        height={30}
        width="80%"
      />
      <Skeleton
        className={styles.attachmentSkeletonItemStyle}
        animation="wave"
        height={30}
      />
      <Skeleton
        className={styles.attachmentSkeletonItemStyle}
        animation="wave"
        height={30}
        width="70%"
      />
      <Skeleton
        className={styles.attachmentSkeletonItemStyle}
        animation="wave"
        height={30}
      />
    </div>
  );
};

export const Component = () => {
  const { pageId, attachmentId } = useParams();

  if (!pageId || !attachmentId) {
    return <PageNotFound noPermission />;
  }

  return <AttachmentPage pageId={pageId} attachmentId={attachmentId} />;
};
