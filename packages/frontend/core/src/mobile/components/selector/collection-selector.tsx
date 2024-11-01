import type { BaseSelectorDialogProps } from '@affine/core/components/page-list/selector';
import { CollectionService } from '@affine/core/modules/collection';
import { ViewLayersIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useMemo } from 'react';

import type { DocsSelectorProps } from './doc-selector';
import { GenericSelector, type GenericSelectorProps } from './generic-selector';

export interface CollectionsSelectorProps
  extends BaseSelectorDialogProps<string[]>,
    Pick<GenericSelectorProps, 'where' | 'type'> {}

export const CollectionsSelector = ({
  init = [],
  onCancel,
  onConfirm,
  ...otherProps
}: DocsSelectorProps) => {
  const collectionService = useService(CollectionService);
  const collections = useLiveData(collectionService.collections$);

  const list = useMemo(() => {
    return collections.map(collection => ({
      id: collection.id,
      icon: <ViewLayersIcon />,
      label: collection.name,
    }));
  }, [collections]);

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
