import { IconButton, MenuItem, MenuSeparator, toast } from '@affine/component';
import { usePageHelper } from '@affine/core/components/blocksuite/block-suite-page-list/utils';
import { IsFavoriteIcon } from '@affine/core/components/pure/icons';
import type { NodeOperation } from '@affine/core/modules/explorer';
import { FavoriteService } from '@affine/core/modules/favorite';
import { TagService } from '@affine/core/modules/tag';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import {
  DeleteIcon,
  FolderIcon,
  PlusIcon,
  SplitViewIcon,
} from '@blocksuite/icons/rc';
import {
  DocsService,
  FeatureFlagService,
  useLiveData,
  useService,
  useServices,
  WorkspaceService,
} from '@toeverything/infra';
import { useCallback, useMemo } from 'react';

import { useSelectDoc } from '../../../selector';
import { TagRenameSubMenu } from './dialog';

export const useExplorerTagNodeOperations = (
  tagId: string,
  {
    openNodeCollapsed,
  }: {
    openNodeCollapsed: () => void;
  }
) => {
  const t = useI18n();
  const openDocSelector = useSelectDoc();
  const { workbenchService, workspaceService, tagService, favoriteService } =
    useServices({
      WorkbenchService,
      WorkspaceService,
      TagService,
      DocsService,
      FavoriteService,
    });

  const favorite = useLiveData(
    favoriteService.favoriteList.favorite$('tag', tagId)
  );
  const tagRecord = useLiveData(tagService.tagList.tagByTagId$(tagId));

  const { createPage } = usePageHelper(
    workspaceService.workspace.docCollection
  );

  const handleNewDoc = useCallback(() => {
    if (tagRecord) {
      const newDoc = createPage();
      tagRecord?.tag(newDoc.id);
      track.$.navigationPanel.tags.createDoc();
      openNodeCollapsed();
    }
  }, [createPage, openNodeCollapsed, tagRecord]);

  const handleMoveToTrash = useCallback(() => {
    tagService.tagList.deleteTag(tagId);
    track.$.navigationPanel.organize.deleteOrganizeItem({ type: 'tag' });
    toast(t['com.affine.tags.delete-tags.toast']());
  }, [t, tagId, tagService.tagList]);

  const handleOpenInSplitView = useCallback(() => {
    workbenchService.workbench.openTag(tagId, {
      at: 'beside',
    });
    track.$.navigationPanel.organize.openInSplitView({ type: 'tag' });
  }, [tagId, workbenchService]);

  const handleToggleFavoriteTag = useCallback(() => {
    favoriteService.favoriteList.toggle('tag', tagId);
    track.$.navigationPanel.organize.toggleFavorite({
      type: 'tag',
    });
  }, [favoriteService, tagId]);

  const handleOpenInNewTab = useCallback(() => {
    workbenchService.workbench.openTag(tagId, {
      at: 'new-tab',
    });
    track.$.navigationPanel.organize.openInNewTab({ type: 'tag' });
  }, [tagId, workbenchService]);

  const handleRename = useCallback(
    (newName: string) => {
      if (tagRecord && tagRecord.value$.value !== newName) {
        tagRecord.rename(newName);
        track.$.navigationPanel.organize.renameOrganizeItem({
          type: 'tag',
        });
      }
    },
    [tagRecord]
  );
  const handleChangeColor = useCallback(
    (color: string) => {
      if (tagRecord && tagRecord.color$.value !== color) {
        tagRecord.changeColor(color);
      }
    },
    [tagRecord]
  );
  const handleChangeNameOrColor = useCallback(
    (name?: string, color?: string) => {
      if (name !== undefined) {
        handleRename(name);
      }
      if (color !== undefined) {
        handleChangeColor(color);
      }
    },
    [handleChangeColor, handleRename]
  );
  const handleOpenDocSelector = useCallback(() => {
    const initialIds = tagRecord?.pageIds$.value;
    openDocSelector(initialIds, { where: 'tag', type: 'doc' })
      .then(selectedIds => {
        const newIds = selectedIds.filter(id => !initialIds?.includes(id));
        const removedIds = initialIds?.filter(id => !selectedIds.includes(id));
        newIds.forEach(id => tagRecord?.tag(id));
        removedIds?.forEach(id => tagRecord?.untag(id));
      })
      .catch(console.error);
  }, [openDocSelector, tagRecord]);

  return useMemo(
    () => ({
      favorite,
      handleNewDoc,
      handleMoveToTrash,
      handleOpenInSplitView,
      handleToggleFavoriteTag,
      handleOpenInNewTab,
      handleRename,
      handleChangeColor,
      handleChangeNameOrColor,
      handleOpenDocSelector,
    }),
    [
      favorite,
      handleChangeColor,
      handleChangeNameOrColor,
      handleMoveToTrash,
      handleNewDoc,
      handleOpenInNewTab,
      handleOpenInSplitView,
      handleRename,
      handleToggleFavoriteTag,
      handleOpenDocSelector,
    ]
  );
};
export const useExplorerTagNodeOperationsMenu = (
  tagId: string,
  option: {
    openNodeCollapsed: () => void;
  }
): NodeOperation[] => {
  const t = useI18n();
  const featureFlagService = useService(FeatureFlagService);
  const enableMultiView = useLiveData(
    featureFlagService.flags.enable_multi_view.$
  );
  const {
    favorite,
    handleNewDoc,
    handleMoveToTrash,
    handleOpenInSplitView,
    handleToggleFavoriteTag,
    handleChangeNameOrColor,
    handleOpenDocSelector,
  } = useExplorerTagNodeOperations(tagId, option);

  return useMemo(
    () => [
      {
        index: 0,
        inline: true,
        view: (
          <IconButton size="16" onClick={handleNewDoc}>
            <PlusIcon />
          </IconButton>
        ),
      },
      {
        index: 10,
        view: (
          <TagRenameSubMenu
            onConfirm={handleChangeNameOrColor}
            tagId={tagId}
            menuProps={{ triggerOptions: { 'data-testid': 'rename-tag' } }}
          />
        ),
      },
      {
        index: 11,
        view: <MenuSeparator />,
      },
      {
        index: 12,
        view: (
          <MenuItem prefixIcon={<FolderIcon />} onClick={handleOpenDocSelector}>
            {t['com.affine.m.explorer.tag.manage-docs']()}
          </MenuItem>
        ),
      },
      ...(BUILD_CONFIG.isElectron && enableMultiView
        ? [
            {
              index: 100,
              view: (
                <MenuItem
                  prefixIcon={<SplitViewIcon />}
                  onClick={handleOpenInSplitView}
                >
                  {t['com.affine.workbench.split-view.page-menu-open']()}
                </MenuItem>
              ),
            },
          ]
        : []),
      {
        index: 199,
        view: (
          <MenuItem
            prefixIcon={<IsFavoriteIcon favorite={!!favorite} />}
            onClick={handleToggleFavoriteTag}
          >
            {favorite
              ? t['com.affine.favoritePageOperation.remove']()
              : t['com.affine.favoritePageOperation.add']()}
          </MenuItem>
        ),
      },
      {
        index: 9999,
        view: <MenuSeparator key="menu-separator" />,
      },
      {
        index: 10000,
        view: (
          <MenuItem
            type={'danger'}
            prefixIcon={<DeleteIcon />}
            onClick={handleMoveToTrash}
          >
            {t['Delete']()}
          </MenuItem>
        ),
      },
    ],
    [
      enableMultiView,
      favorite,
      handleChangeNameOrColor,
      handleMoveToTrash,
      handleNewDoc,
      handleOpenDocSelector,
      handleOpenInSplitView,
      handleToggleFavoriteTag,
      t,
      tagId,
    ]
  );
};
