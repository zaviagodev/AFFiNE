import { notify } from '@affine/component';
import {
  Menu,
  MenuItem,
  MenuSeparator,
  MenuSub,
} from '@affine/component/ui/menu';
import { PageHistoryModal } from '@affine/core/components/affine/page-history-modal';
import { ShareMenuContent } from '@affine/core/components/affine/share-page-modal/share-menu';
import {
  openHistoryTipsModalAtom,
  openImportModalAtom,
} from '@affine/core/components/atoms';
import { useBlockSuiteMetaHelper } from '@affine/core/components/hooks/affine/use-block-suite-meta-helper';
import { useEnableCloud } from '@affine/core/components/hooks/affine/use-enable-cloud';
import { useExportPage } from '@affine/core/components/hooks/affine/use-export-page';
import { useTrashModalHelper } from '@affine/core/components/hooks/affine/use-trash-modal-helper';
import { useDocMetaHelper } from '@affine/core/components/hooks/use-block-suite-page-meta';
import {
  Export,
  MoveToTrash,
  Snapshot,
} from '@affine/core/components/page-list';
import { IsFavoriteIcon } from '@affine/core/components/pure/icons';
import { useDetailPageHeaderResponsive } from '@affine/core/desktop/pages/workspace/detail-page/use-header-responsive';
import { DocInfoService } from '@affine/core/modules/doc-info';
import { EditorService } from '@affine/core/modules/editor';
import { OpenInAppService } from '@affine/core/modules/open-in-app/services';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { ViewService } from '@affine/core/modules/workbench/services/view';
import { WorkspaceFlavour } from '@affine/env/workspace';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import type { Doc } from '@blocksuite/affine/store';
import {
  DuplicateIcon,
  EdgelessIcon,
  EditIcon,
  FrameIcon,
  HistoryIcon,
  ImportIcon,
  InformationIcon,
  LocalWorkspaceIcon,
  OpenInNewIcon,
  PageIcon,
  SaveIcon,
  ShareIcon,
  SplitViewIcon,
  TocIcon,
} from '@blocksuite/icons/rc';
import {
  FeatureFlagService,
  useLiveData,
  useService,
  useServiceOptional,
  WorkspaceService,
} from '@toeverything/infra';
import { useSetAtom } from 'jotai';
import { useCallback, useState } from 'react';

import { HeaderDropDownButton } from '../../../pure/header-drop-down-button';
import { useFavorite } from '../favorite';

type PageMenuProps = {
  rename?: () => void;
  page: Doc;
  isJournal?: boolean;
  containerWidth: number;
};
// fixme: refactor this file
export const PageHeaderMenuButton = ({
  rename,
  page,
  isJournal,
  containerWidth,
}: PageMenuProps) => {
  const pageId = page?.id;
  const t = useI18n();
  const { hideShare } = useDetailPageHeaderResponsive(containerWidth);
  const confirmEnableCloud = useEnableCloud();

  const workspace = useService(WorkspaceService).workspace;

  const editorService = useService(EditorService);
  const isInTrash = useLiveData(
    editorService.editor.doc.meta$.map(meta => meta.trash)
  );
  const currentMode = useLiveData(editorService.editor.mode$);
  const primaryMode = useLiveData(editorService.editor.doc.primaryMode$);

  const workbench = useService(WorkbenchService).workbench;
  const featureFlagService = useService(FeatureFlagService);
  const enableSnapshotImportExport = useLiveData(
    featureFlagService.flags.enable_snapshot_import_export.$
  );
  const openInAppService = useServiceOptional(OpenInAppService);

  const { favorite, toggleFavorite } = useFavorite(pageId);

  const { duplicate } = useBlockSuiteMetaHelper();
  const { setTrashModal } = useTrashModalHelper();

  const [isEditing, setEditing] = useState(!page.readonly);
  const { setDocReadonly } = useDocMetaHelper();

  const view = useService(ViewService).view;

  const openSidePanel = useCallback(
    (id: string) => {
      workbench.openSidebar();
      view.activeSidebarTab(id);
    },
    [workbench, view]
  );

  const openAllFrames = useCallback(() => {
    openSidePanel('frame');
  }, [openSidePanel]);

  const openOutlinePanel = useCallback(() => {
    openSidePanel('outline');
  }, [openSidePanel]);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const setOpenHistoryTipsModal = useSetAtom(openHistoryTipsModalAtom);
  const setOpenImportModalAtom = useSetAtom(openImportModalAtom);

  const openHistoryModal = useCallback(() => {
    track.$.header.history.open();
    if (workspace.flavour === WorkspaceFlavour.AFFINE_CLOUD) {
      return setHistoryModalOpen(true);
    }
    return setOpenHistoryTipsModal(true);
  }, [setOpenHistoryTipsModal, workspace.flavour]);

  const docInfoModal = useService(DocInfoService).modal;
  const openInfoModal = useCallback(() => {
    track.$.header.pageInfo.open();
    docInfoModal.open(pageId);
  }, [docInfoModal, pageId]);

  const handleOpenInNewTab = useCallback(() => {
    workbench.openDoc(pageId, {
      at: 'new-tab',
    });
  }, [pageId, workbench]);

  const handleOpenInSplitView = useCallback(() => {
    workbench.openDoc(pageId, {
      at: 'tail',
    });
  }, [pageId, workbench]);

  const handleOpenTrashModal = useCallback(() => {
    track.$.header.docOptions.deleteDoc();
    setTrashModal({
      open: true,
      pageIds: [pageId],
      pageTitles: [editorService.editor.doc.meta$.value.title ?? ''],
    });
  }, [editorService, pageId, setTrashModal]);

  const handleRename = useCallback(() => {
    rename?.();
    track.$.header.docOptions.renameDoc();
  }, [rename]);

  const handleSwitchMode = useCallback(() => {
    const mode = primaryMode === 'page' ? 'edgeless' : 'page';
    editorService.editor.setMode(mode);
    editorService.editor.doc.setPrimaryMode(mode);
    track.$.header.docOptions.switchPageMode({
      mode,
    });
    notify.success({
      title:
        primaryMode === 'page'
          ? t['com.affine.toastMessage.defaultMode.edgeless.title']()
          : t['com.affine.toastMessage.defaultMode.page.title'](),
      message:
        primaryMode === 'page'
          ? t['com.affine.toastMessage.defaultMode.edgeless.message']()
          : t['com.affine.toastMessage.defaultMode.page.message'](),
    });
  }, [primaryMode, editorService, t]);

  const handleMenuOpenChange = useCallback((open: boolean) => {
    if (open) {
      track.$.header.docOptions.open();
    }
  }, []);

  const exportHandler = useExportPage();

  const handleDuplicate = useCallback(() => {
    duplicate(pageId);
    track.$.header.docOptions.createDoc({
      control: 'duplicate',
    });
  }, [duplicate, pageId]);

  const handleOpenImportModal = useCallback(() => {
    track.$.header.docOptions.import();
    setOpenImportModalAtom(true);
  }, [setOpenImportModalAtom]);

  const handleShareMenuOpenChange = useCallback((open: boolean) => {
    if (open) {
      track.$.sharePanel.$.open();
    }
  }, []);

  const handleToggleFavorite = useCallback(() => {
    track.$.header.docOptions.toggleFavorite();
    toggleFavorite();
  }, [toggleFavorite]);

  const handleToggleEdit = useCallback(() => {
    setDocReadonly(page.id, !page.readonly);
    setEditing(!isEditing);
  }, [isEditing, page.id, page.readonly, setDocReadonly]);

  const isMobile = environment.isMobile;
  const mobileEditMenuItem = (
    <MenuItem
      prefixIcon={isEditing ? <SaveIcon /> : <EditIcon />}
      onSelect={handleToggleEdit}
    >
      {t[isEditing ? 'Save' : 'Edit']()}
    </MenuItem>
  );

  const showResponsiveMenu = hideShare;
  const ResponsiveMenuItems = (
    <>
      {hideShare ? (
        <MenuSub
          subContentOptions={{
            sideOffset: 12,
            alignOffset: -8,
          }}
          items={
            <div style={{ padding: 4 }}>
              <ShareMenuContent
                workspaceMetadata={workspace.meta}
                currentPage={page}
                onEnableAffineCloud={() =>
                  confirmEnableCloud(workspace, {
                    openPageId: page.id,
                  })
                }
              />
            </div>
          }
          triggerOptions={{
            prefixIcon: <ShareIcon />,
          }}
          subOptions={{
            onOpenChange: handleShareMenuOpenChange,
          }}
        >
          {t['com.affine.share-menu.shareButton']()}
        </MenuSub>
      ) : null}
      <MenuSeparator />
    </>
  );

  const onOpenInDesktop = useCallback(() => {
    openInAppService?.showOpenInAppPage();
  }, [openInAppService]);

  const EditMenu = (
    <>
      {showResponsiveMenu ? ResponsiveMenuItems : null}
      {isMobile && mobileEditMenuItem}
      {!isJournal && (
        <MenuItem
          prefixIcon={<EditIcon />}
          data-testid="editor-option-menu-rename"
          onSelect={handleRename}
        >
          {t['Rename']()}
        </MenuItem>
      )}
      <MenuItem
        prefixIcon={primaryMode === 'page' ? <EdgelessIcon /> : <PageIcon />}
        data-testid="editor-option-menu-edgeless"
        onSelect={handleSwitchMode}
      >
        {primaryMode === 'page'
          ? t['com.affine.editorDefaultMode.edgeless']()
          : t['com.affine.editorDefaultMode.page']()}
      </MenuItem>
      <MenuItem
        data-testid="editor-option-menu-favorite"
        onSelect={handleToggleFavorite}
        prefixIcon={<IsFavoriteIcon favorite={favorite} />}
      >
        {favorite
          ? t['com.affine.favoritePageOperation.remove']()
          : t['com.affine.favoritePageOperation.add']()}
      </MenuItem>
      <MenuSeparator />
      <MenuItem
        prefixIcon={<OpenInNewIcon />}
        data-testid="editor-option-menu-open-in-new-tab"
        onSelect={handleOpenInNewTab}
      >
        {t['com.affine.workbench.tab.page-menu-open']()}
      </MenuItem>
      {BUILD_CONFIG.isElectron && (
        <MenuItem
          prefixIcon={<SplitViewIcon />}
          data-testid="editor-option-menu-open-in-split-new"
          onSelect={handleOpenInSplitView}
        >
          {t['com.affine.workbench.split-view.page-menu-open']()}
        </MenuItem>
      )}

      <MenuSeparator />
      <MenuItem
        prefixIcon={<InformationIcon />}
        data-testid="editor-option-menu-info"
        onSelect={openInfoModal}
      >
        {t['com.affine.page-properties.page-info.view']()}
      </MenuItem>
      {currentMode === 'page' ? (
        <MenuItem
          prefixIcon={<TocIcon />}
          data-testid="editor-option-toc"
          onSelect={openOutlinePanel}
        >
          {t['com.affine.header.option.view-toc']()}
        </MenuItem>
      ) : (
        <MenuItem
          prefixIcon={<FrameIcon />}
          data-testid="editor-option-frame"
          onSelect={openAllFrames}
        >
          {t['com.affine.header.option.view-frame']()}
        </MenuItem>
      )}
      <MenuItem
        prefixIcon={<HistoryIcon />}
        data-testid="editor-option-menu-history"
        onSelect={openHistoryModal}
      >
        {t['com.affine.history.view-history-version']()}
      </MenuItem>
      <MenuSeparator />
      {!isJournal && (
        <MenuItem
          prefixIcon={<DuplicateIcon />}
          data-testid="editor-option-menu-duplicate"
          onSelect={handleDuplicate}
        >
          {t['com.affine.header.option.duplicate']()}
        </MenuItem>
      )}
      <MenuItem
        prefixIcon={<ImportIcon />}
        data-testid="editor-option-menu-import"
        onSelect={handleOpenImportModal}
      >
        {t['Import']()}
      </MenuItem>
      <Export exportHandler={exportHandler} pageMode={currentMode} />
      {enableSnapshotImportExport && <Snapshot />}
      <MenuSeparator />
      <MoveToTrash
        data-testid="editor-option-menu-delete"
        onSelect={handleOpenTrashModal}
      />
      {BUILD_CONFIG.isWeb &&
      workspace.flavour === WorkspaceFlavour.AFFINE_CLOUD ? (
        <MenuItem
          prefixIcon={<LocalWorkspaceIcon />}
          data-testid="editor-option-menu-link"
          onSelect={onOpenInDesktop}
        >
          {t['com.affine.header.option.open-in-desktop']()}
        </MenuItem>
      ) : null}
    </>
  );
  if (isInTrash) {
    return null;
  }
  return (
    <>
      <Menu
        items={EditMenu}
        contentOptions={{
          align: 'center',
        }}
        rootOptions={{
          onOpenChange: handleMenuOpenChange,
        }}
      >
        <HeaderDropDownButton />
      </Menu>
      {workspace.flavour === WorkspaceFlavour.AFFINE_CLOUD ? (
        <PageHistoryModal
          docCollection={workspace.docCollection}
          open={historyModalOpen}
          pageId={pageId}
          onOpenChange={setHistoryModalOpen}
        />
      ) : null}
    </>
  );
};
