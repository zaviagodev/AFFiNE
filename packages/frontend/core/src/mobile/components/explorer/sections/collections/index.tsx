import { createEmptyCollection } from '@affine/core/components/page-list/use-collection-manager';
import { CollectionService } from '@affine/core/modules/collection';
import { ExplorerService } from '@affine/core/modules/explorer';
import { ExplorerTreeRoot } from '@affine/core/modules/explorer/views/tree';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { useLiveData, useServices } from '@toeverything/infra';
import { nanoid } from 'nanoid';
import { useCallback, useState } from 'react';

import { AddItemPlaceholder } from '../../layouts/add-item-placeholder';
import { CollapsibleSection } from '../../layouts/collapsible-section';
import { ExplorerCollectionNode } from '../../nodes/collection';
import { CollectionRenameDialog } from '../../nodes/collection/dialog';

export const ExplorerCollections = () => {
  const t = useI18n();
  const { collectionService, workbenchService, explorerService } = useServices({
    CollectionService,
    WorkbenchService,
    ExplorerService,
  });
  const explorerSection = explorerService.sections.collections;
  const collections = useLiveData(collectionService.collections$);
  const [showCreateCollectionModal, setShowCreateCollectionModal] =
    useState(false);

  const handleCreateCollection = useCallback(
    (name: string) => {
      setShowCreateCollectionModal(false);
      const id = nanoid();
      collectionService.addCollection(createEmptyCollection(id, { name }));
      track.$.navigationPanel.organize.createOrganizeItem({
        type: 'collection',
      });
      workbenchService.workbench.openCollection(id);
      explorerSection.setCollapsed(false);
    },
    [collectionService, explorerSection, workbenchService.workbench]
  );

  return (
    <CollapsibleSection
      name="collections"
      testId="explorer-collections"
      title={t['com.affine.rootAppSidebar.collections']()}
    >
      <ExplorerTreeRoot>
        {collections.map(collection => (
          <ExplorerCollectionNode
            key={collection.id}
            collectionId={collection.id}
          />
        ))}
        <AddItemPlaceholder
          data-testid="explorer-bar-add-collection-button"
          label={t['com.affine.rootAppSidebar.collection.new']()}
          onClick={() => setShowCreateCollectionModal(true)}
        />
        <CollectionRenameDialog
          title={t['com.affine.m.explorer.collection.new-dialog-title']()}
          open={showCreateCollectionModal}
          onOpenChange={setShowCreateCollectionModal}
          onConfirm={handleCreateCollection}
        />
      </ExplorerTreeRoot>
    </CollapsibleSection>
  );
};
