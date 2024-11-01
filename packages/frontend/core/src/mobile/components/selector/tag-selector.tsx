import type { BaseSelectorDialogProps } from '@affine/core/components/page-list/selector';
import { TagService } from '@affine/core/modules/tag';
import { useLiveData, useService } from '@toeverything/infra';
import { useMemo } from 'react';

import { GenericSelector, type GenericSelectorProps } from './generic-selector';

export interface TagsSelectorProps
  extends BaseSelectorDialogProps<string[]>,
    Pick<GenericSelectorProps, 'where' | 'type'> {}

const TagIcon = ({ tagId }: { tagId: string }) => {
  const tagService = useService(TagService);
  const tag = useLiveData(tagService.tagList.tagByTagId$(tagId));
  const color = useLiveData(tag?.color$);

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="4" fill={color} />
    </svg>
  );
};

const TagLabel = ({ tagId }: { tagId: string }) => {
  const tagService = useService(TagService);
  const tag = useLiveData(tagService.tagList.tagByTagId$(tagId));
  const name = useLiveData(tag?.value$);

  return name;
};

export const TagsSelector = ({
  init = [],
  onCancel,
  onConfirm,
  ...otherProps
}: TagsSelectorProps) => {
  const tagService = useService(TagService);
  const tags = useLiveData(tagService.tagList.tags$);

  const list = useMemo(() => {
    return tags.map(tag => ({
      id: tag.id,
      icon: <TagIcon tagId={tag.id} />,
      label: <TagLabel tagId={tag.id} />,
    }));
  }, [tags]);

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
