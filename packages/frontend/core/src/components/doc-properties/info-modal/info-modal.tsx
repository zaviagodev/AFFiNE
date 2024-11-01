import {
  Button,
  Divider,
  type InlineEditHandle,
  Menu,
  Modal,
  PropertyCollapsibleContent,
  PropertyCollapsibleSection,
  Scrollable,
} from '@affine/component';
import {
  DocDatabaseBacklinkInfo,
  DocInfoService,
} from '@affine/core/modules/doc-info';
import type {
  DatabaseRow,
  DatabaseValueCell,
} from '@affine/core/modules/doc-info/types';
import { DocsSearchService } from '@affine/core/modules/docs-search';
import { useI18n } from '@affine/i18n';
import track from '@affine/track';
import { PlusIcon } from '@blocksuite/icons/rc';
import type { Doc, DocCustomPropertyInfo } from '@toeverything/infra';
import {
  DocsService,
  FrameworkScope,
  LiveData,
  useLiveData,
  useService,
  useServices,
} from '@toeverything/infra';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BlocksuiteHeaderTitle } from '../../blocksuite/block-suite-header/title';
import { CreatePropertyMenuItems } from '../menu/create-doc-property';
import { DocPropertyRow } from '../table';
import * as styles from './info-modal.css';
import { LinksRow } from './links-row';

export const InfoModal = () => {
  const modal = useService(DocInfoService).modal;
  const docId = useLiveData(modal.docId$);
  const docsService = useService(DocsService);

  const [doc, setDoc] = useState<Doc | null>(null);
  useEffect(() => {
    if (!docId) return;
    const docRef = docsService.open(docId);
    setDoc(docRef.doc);
    return () => {
      docRef.release();
      setDoc(null);
    };
  }, [docId, docsService]);

  if (!doc || !docId) return null;

  return (
    <FrameworkScope scope={doc.scope}>
      <InfoModalOpened docId={docId} />
    </FrameworkScope>
  );
};

const InfoModalOpened = ({ docId }: { docId: string }) => {
  const modal = useService(DocInfoService).modal;

  const titleInputHandleRef = useRef<InlineEditHandle>(null);
  const handleClose = useCallback(() => {
    modal.close();
  }, [modal]);

  return (
    <Modal
      contentOptions={{
        className: styles.container,
      }}
      open
      onOpenChange={v => modal.onOpenChange(v)}
      withoutCloseButton
    >
      <Scrollable.Root>
        <Scrollable.Viewport
          className={styles.viewport}
          data-testid="info-modal"
        >
          <div className={styles.titleContainer} data-testid="info-modal-title">
            <BlocksuiteHeaderTitle
              docId={docId}
              className={styles.titleStyle}
              inputHandleRef={titleInputHandleRef}
            />
          </div>
          <InfoTable docId={docId} onClose={handleClose} />
        </Scrollable.Viewport>
        <Scrollable.Scrollbar className={styles.scrollBar} />
      </Scrollable.Root>
    </Modal>
  );
};

export const InfoTable = ({
  onClose,
  docId,
}: {
  docId: string;
  onClose: () => void;
}) => {
  const t = useI18n();
  const { docsSearchService, docsService } = useServices({
    DocsSearchService,
    DocsService,
  });
  const [newPropertyId, setNewPropertyId] = useState<string | null>(null);
  const properties = useLiveData(docsService.propertyList.sortedProperties$);
  const links = useLiveData(
    useMemo(
      () => LiveData.from(docsSearchService.watchRefsFrom(docId), null),
      [docId, docsSearchService]
    )
  );
  const backlinks = useLiveData(
    useMemo(
      () => LiveData.from(docsSearchService.watchRefsTo(docId), null),
      [docId, docsSearchService]
    )
  );

  const onBacklinkPropertyChange = useCallback(
    (_row: DatabaseRow, cell: DatabaseValueCell, _value: unknown) => {
      track.$.docInfoPanel.databaseProperty.editProperty({
        type: cell.property.type$.value,
      });
    },
    []
  );

  const onPropertyAdded = useCallback((property: DocCustomPropertyInfo) => {
    setNewPropertyId(property.id);
    track.$.docInfoPanel.property.addProperty({
      type: property.type,
      module: 'at menu',
    });
  }, []);

  return (
    <>
      {backlinks && backlinks.length > 0 ? (
        <>
          <LinksRow
            references={backlinks}
            onClick={onClose}
            label={t['com.affine.page-properties.backlinks']()}
          />
          <Divider size="thinner" />
        </>
      ) : null}
      {links && links.length > 0 ? (
        <>
          <LinksRow
            references={links}
            onClick={onClose}
            label={t['com.affine.page-properties.outgoing-links']()}
          />
          <Divider size="thinner" />
        </>
      ) : null}
      <PropertyCollapsibleSection
        title={t.t('com.affine.workspace.properties')}
      >
        <PropertyCollapsibleContent
          className={styles.tableBodyRoot}
          collapseButtonText={({ hide, isCollapsed }) =>
            isCollapsed
              ? hide === 1
                ? t['com.affine.page-properties.more-property.one']({
                    count: hide.toString(),
                  })
                : t['com.affine.page-properties.more-property.more']({
                    count: hide.toString(),
                  })
              : hide === 1
                ? t['com.affine.page-properties.hide-property.one']({
                    count: hide.toString(),
                  })
                : t['com.affine.page-properties.hide-property.more']({
                    count: hide.toString(),
                  })
          }
        >
          {properties.map(property => (
            <DocPropertyRow
              key={property.id}
              propertyInfo={property}
              defaultOpenEditMenu={newPropertyId === property.id}
            />
          ))}
          <Menu
            items={<CreatePropertyMenuItems onCreated={onPropertyAdded} />}
            contentOptions={{
              onClick(e) {
                e.stopPropagation();
              },
            }}
          >
            <Button
              variant="plain"
              prefix={<PlusIcon />}
              className={styles.addPropertyButton}
            >
              {t['com.affine.page-properties.add-property']()}
            </Button>
          </Menu>
        </PropertyCollapsibleContent>
      </PropertyCollapsibleSection>
      <Divider size="thinner" />
      <DocDatabaseBacklinkInfo onChange={onBacklinkPropertyChange} />
    </>
  );
};
