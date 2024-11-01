import type { BaseSelectorDialogProps } from '@affine/core/components/page-list/selector';
import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { useI18n } from '@affine/i18n';
import { DocsService, useLiveData, useService } from '@toeverything/infra';
import { useMemo } from 'react';

import { GenericSelector, type GenericSelectorProps } from './generic-selector';

export interface DocsSelectorProps
  extends BaseSelectorDialogProps<string[]>,
    Pick<GenericSelectorProps, 'where' | 'type'> {}

const DocIcon = ({ docId }: { docId: string }) => {
  const docDisplayMetaService = useService(DocDisplayMetaService);
  const Icon = useLiveData(docDisplayMetaService.icon$(docId));

  return <Icon />;
};

const DocLabel = ({ docId }: { docId: string }) => {
  const t = useI18n();
  const docDisplayMetaService = useService(DocDisplayMetaService);
  const label = useLiveData(docDisplayMetaService.title$(docId));

  return typeof label === 'string' ? label : t[label.i18nKey]();
};

export const DocsSelector = ({
  init = [],
  onCancel,
  onConfirm,
  ...otherProps
}: DocsSelectorProps) => {
  const docsService = useService(DocsService);
  const docRecords = useLiveData(docsService.list.docs$);

  const list = useMemo(() => {
    return (
      docRecords
        ?.filter(record => !record.trash$.value) // not reactive
        ?.map(record => ({
          id: record.id,
          icon: <DocIcon docId={record.id} />,
          label: <DocLabel docId={record.id} />,
        })) ?? []
    );
  }, [docRecords]);

  return (
    <GenericSelector
      onBack={onCancel}
      onConfirm={onConfirm}
      initial={init}
      data={list}
      {...otherProps}
    />
  );
};
