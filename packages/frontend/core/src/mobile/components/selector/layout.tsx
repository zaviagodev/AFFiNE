import {
  Button,
  Checkbox,
  SafeArea,
  Scrollable,
  useThemeColorMeta,
} from '@affine/component';
import { useI18n } from '@affine/i18n';
import { ArrowRightSmallIcon } from '@blocksuite/icons/rc';
import { cssVarV2 } from '@toeverything/theme/v2';
import {
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { PageHeader } from '../page-header';
import * as styles from './layout.css';

export interface SelectorLayoutProps {
  title: ReactNode;
  onBack?: () => void;
  onConfirm?: (ids: string[]) => void;
  confirmText?: string;
  initial: string[];
  data: Array<{ id: string; icon: ReactNode; label: ReactNode }>;
  totalRenderer?: (props: { total: number }) => ReactNode;
  changedRenderer?: (props: { added: number; removed: number }) => ReactNode;
}

export const SelectorLayout = ({
  initial: originalInitial,
  data,
  title,
  onBack,
  confirmText,
  onConfirm,
  totalRenderer: TotalRenderer,
  changedRenderer: ChangedRenderer,
}: SelectorLayoutProps) => {
  const t = useI18n();
  useThemeColorMeta(cssVarV2('layer/background/secondary'));
  const listRef = useRef<HTMLUListElement>(null);
  const quickScrollRef = useRef<HTMLDivElement>(null);

  // make sure "initial ids" exist in list
  const [initial] = useState(
    originalInitial.filter(id => data.some(el => el.id === id))
  );
  const [selected, setSelected] = useState(initial);

  const added = useMemo(
    () => selected.filter(id => !initial.includes(id)),
    [initial, selected]
  );
  const removed = useMemo(
    () => initial.filter(id => !selected.includes(id)),
    [initial, selected]
  );
  const disableConfirm = added.length === 0 && removed.length === 0;

  const handleToggleSelected = useCallback((id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(v => v !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  // touch & move to select
  useEffect(() => {
    const quickSelect = quickScrollRef.current;
    if (!quickSelect) return;

    const reverseThresholdPx = 10;

    const onTouchStart = (e: TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();

      let prevIndex: number | null = null;
      let prevY: number | null = null;
      let prevDir: 'down' | 'up' | null = null;
      let reverseAt: number | null = null;

      const check = (e: ReactTouchEvent<HTMLDivElement> | TouchEvent) => {
        const list = listRef.current;
        if (!list) return;
        const { clientY } = e.touches[0];
        if (clientY === prevY) return;

        const rect = list.getBoundingClientRect();
        const index = Math.floor(
          ((clientY - rect.top) / rect.height) * data.length
        );

        const newDir = prevY === null ? null : clientY > prevY ? 'down' : 'up';
        const dirChanged = prevDir && newDir && newDir !== prevDir;
        const indexChanged = index !== prevIndex;

        if (dirChanged) {
          reverseAt = clientY;
        }
        const reverseAndMoved =
          reverseAt && Math.abs(clientY - reverseAt) > reverseThresholdPx;
        if (reverseAndMoved) {
          reverseAt = null;
        }

        if (
          index >= 0 &&
          index < data.length &&
          (reverseAndMoved || indexChanged)
        ) {
          handleToggleSelected(data[index].id);
        }

        // update prev
        prevIndex = index;
        prevY = clientY;
        prevDir = newDir;
      };
      check(e);

      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        check(e);
      };
      const onTouchEnd = () => {
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
      };

      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd);
    };

    quickSelect.addEventListener('touchstart', onTouchStart, {
      passive: false,
    });

    return () => {
      quickSelect.removeEventListener('touchstart', onTouchStart);
    };
  }, [data, handleToggleSelected]);

  return (
    <div className={styles.root}>
      <PageHeader back backAction={onBack}>
        <span className={styles.headerTitle}>{title}</span>
      </PageHeader>
      <Scrollable.Root className={styles.scrollArea}>
        <Scrollable.Scrollbar />
        <Scrollable.Viewport>
          <ul className={styles.list} ref={listRef}>
            {data.map(({ id, icon, label }) => {
              return (
                <li
                  key={id}
                  className={styles.listItem}
                  onClick={() => handleToggleSelected(id)}
                >
                  <div className={styles.listItemCheckbox}>
                    <Checkbox
                      checked={selected.includes(id)}
                      onChange={() => handleToggleSelected(id)}
                    />
                  </div>
                  <div className={styles.listItemIcon}>{icon}</div>
                  <div className={styles.listItemLabel}>{label}</div>
                  <div className={styles.listItemArrow}>
                    <ArrowRightSmallIcon />
                  </div>
                </li>
              );
            })}
            <div className={styles.quickSelect} ref={quickScrollRef} />
          </ul>
        </Scrollable.Viewport>
      </Scrollable.Root>
      <SafeArea bottom className={styles.footer}>
        <div className={styles.info}>
          {ChangedRenderer && !disableConfirm ? (
            <div className={styles.changedInfo}>
              <ChangedRenderer added={added.length} removed={removed.length} />
            </div>
          ) : null}
          {TotalRenderer ? (
            <div className={styles.totalInfo}>
              <TotalRenderer total={initial.length} />
            </div>
          ) : null}
        </div>
        <div className={styles.actions}>
          <Button
            disabled={disableConfirm}
            variant="primary"
            className={styles.actionButton}
            onClick={() => onConfirm?.(selected)}
          >
            {confirmText ?? t['com.affine.m.selector.confirm-default']()}
          </Button>
        </div>
      </SafeArea>
    </div>
  );
};
