import { useSelectDialog } from '@affine/core/components/page-list/selector';
import { cssVarV2 } from '@toeverything/theme/v2';

import {
  CollectionsSelector,
  type CollectionsSelectorProps,
} from './collection-selector';
import { DocsSelector, type DocsSelectorProps } from './doc-selector';
import { TagsSelector, type TagsSelectorProps } from './tag-selector';

const options: Parameters<typeof useSelectDialog>[2] = {
  modalProps: {
    fullScreen: true,
    width: undefined,
    height: undefined,
    contentOptions: {
      style: {
        background: cssVarV2('layer/background/secondary'),
        padding: 0,
      },
    },
  },
};

export const useSelectDoc = () => {
  return useSelectDialog<string[], DocsSelectorProps>(
    DocsSelector,
    'select-doc-dialog',
    options
  );
};

export const useSelectCollection = () => {
  return useSelectDialog<string[], CollectionsSelectorProps>(
    CollectionsSelector,
    'select-collection-dialog',
    options
  );
};

export const useSelectTag = () => {
  return useSelectDialog<string[], TagsSelectorProps>(
    TagsSelector,
    'select-tag-dialog',
    options
  );
};
