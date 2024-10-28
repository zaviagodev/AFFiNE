import { IconButton } from '@affine/component';
import { useI18n } from '@affine/i18n';
import type { DocMode } from '@blocksuite/affine/blocks';
import {
  CloseIcon,
  ExpandFullIcon,
  InformationIcon,
  OpenInNewIcon,
  SplitViewIcon,
} from '@blocksuite/icons/rc';
import { useService } from '@toeverything/infra';
import { clsx } from 'clsx';
import {
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactElement,
  useCallback,
  useMemo,
} from 'react';

import { DocInfoService } from '../../doc-info';
import { WorkbenchService } from '../../workbench';
import type { DocReferenceInfo } from '../entities/peek-view';
import { PeekViewService } from '../services/peek-view';
import * as styles from './peek-view-controls.css';

type ControlButtonProps = {
  nameKey: string;
  icon: ReactElement;
  name: string;
  onClick: () => void;
};

export const ControlButton = ({
  icon,
  nameKey,
  name,
  onClick,
}: ControlButtonProps) => {
  const handleClick: MouseEventHandler = useCallback(
    e => {
      e.stopPropagation();
      e.preventDefault();
      onClick();
    },
    [onClick]
  );

  return (
    <IconButton
      variant="solid"
      tooltip={name}
      data-testid="peek-view-control"
      data-action-name={nameKey}
      size="20"
      onClick={handleClick}
      icon={icon}
      className={styles.button}
    />
  );
};

type DocPeekViewControlsProps = HTMLAttributes<HTMLDivElement> & {
  mode?: DocMode;
  docRef: DocReferenceInfo;
};

export const DefaultPeekViewControls = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) => {
  const peekView = useService(PeekViewService).peekView;
  const t = useI18n();
  const controls = useMemo(() => {
    return [
      {
        icon: <CloseIcon />,
        nameKey: 'close',
        name: t['com.affine.peek-view-controls.close'](),
        onClick: () => peekView.close(),
      },
    ].filter((opt): opt is ControlButtonProps => Boolean(opt));
  }, [peekView, t]);
  return (
    <div {...rest} className={clsx(styles.root, className)}>
      {controls.map(option => (
        <ControlButton key={option.nameKey} {...option} />
      ))}
    </div>
  );
};

export const DocPeekViewControls = ({
  docRef,
  className,
  ...rest
}: DocPeekViewControlsProps) => {
  const peekView = useService(PeekViewService).peekView;
  const workbench = useService(WorkbenchService).workbench;
  const t = useI18n();
  const docInfoService = useService(DocInfoService);
  const controls = useMemo(() => {
    return [
      {
        icon: <CloseIcon />,
        nameKey: 'close',
        name: t['com.affine.peek-view-controls.close'](),
        onClick: () => peekView.close(),
      },
      {
        icon: <ExpandFullIcon />,
        name: t['com.affine.peek-view-controls.open-doc'](),
        nameKey: 'open',
        onClick: () => {
          workbench.openDoc(docRef);
          peekView.close('none');
        },
      },
      {
        icon: <OpenInNewIcon />,
        nameKey: 'new-tab',
        name: t['com.affine.peek-view-controls.open-doc-in-new-tab'](),
        onClick: () => {
          workbench.openDoc(docRef, { at: 'new-tab' });
          peekView.close('none');
        },
      },
      BUILD_CONFIG.isElectron && {
        icon: <SplitViewIcon />,
        nameKey: 'split-view',
        name: t['com.affine.peek-view-controls.open-doc-in-split-view'](),
        onClick: () => {
          workbench.openDoc(docRef, { at: 'beside' });
          peekView.close('none');
        },
      },
      {
        icon: <InformationIcon />,
        nameKey: 'info',
        name: t['com.affine.peek-view-controls.open-info'](),
        onClick: () => {
          docInfoService.modal.open(
            typeof docRef === 'string' ? docRef : docRef.docId
          );
        },
      },
    ].filter((opt): opt is ControlButtonProps => Boolean(opt));
  }, [t, peekView, workbench, docRef, docInfoService.modal]);
  return (
    <div {...rest} className={clsx(styles.root, className)}>
      {controls.map(option => (
        <ControlButton key={option.nameKey} {...option} />
      ))}
    </div>
  );
};

export const AttachmentPeekViewControls = ({
  docRef,
  className,
  ...rest
}: DocPeekViewControlsProps) => {
  const peekView = useService(PeekViewService).peekView;
  const workbench = useService(WorkbenchService).workbench;
  const t = useI18n();
  const controls = useMemo(() => {
    return [
      {
        icon: <CloseIcon />,
        nameKey: 'close',
        name: t['com.affine.peek-view-controls.close'](),
        onClick: () => peekView.close(),
      },
      {
        icon: <ExpandFullIcon />,
        name: t['com.affine.peek-view-controls.open-attachment'](),
        nameKey: 'open',
        onClick: () => {
          const { docId, blockIds: [blockId] = [] } = docRef;
          if (docId && blockId) {
            workbench.openAttachment(docId, blockId);
          }
          peekView.close('none');
        },
      },
      {
        icon: <OpenInNewIcon />,
        nameKey: 'new-tab',
        name: t['com.affine.peek-view-controls.open-attachment-in-new-tab'](),
        onClick: () => {
          const { docId, blockIds: [blockId] = [] } = docRef;
          if (docId && blockId) {
            workbench.openAttachment(docId, blockId, { at: 'new-tab' });
          }
          peekView.close('none');
        },
      },
      BUILD_CONFIG.isElectron && {
        icon: <SplitViewIcon />,
        nameKey: 'split-view',
        name: t[
          'com.affine.peek-view-controls.open-attachment-in-split-view'
        ](),
        onClick: () => {
          const { docId, blockIds: [blockId] = [] } = docRef;
          if (docId && blockId) {
            workbench.openAttachment(docId, blockId, { at: 'beside' });
          }
          peekView.close('none');
        },
      },
    ].filter((opt): opt is ControlButtonProps => Boolean(opt));
  }, [t, peekView, workbench, docRef]);
  return (
    <div {...rest} className={clsx(styles.root, className)}>
      {controls.map(option => (
        <ControlButton key={option.nameKey} {...option} />
      ))}
    </div>
  );
};
