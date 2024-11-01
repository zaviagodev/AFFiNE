import {
  createReactComponentFromLit,
  useConfirmModal,
  useLitPortalFactory,
} from '@affine/component';
import { ServerConfigService } from '@affine/core/modules/cloud';
import type {
  DatabaseRow,
  DatabaseValueCell,
} from '@affine/core/modules/doc-info/types';
import { EditorService } from '@affine/core/modules/editor';
import { EditorSettingService } from '@affine/core/modules/editor-setting';
import { JournalService } from '@affine/core/modules/journal';
import { toURLSearchParams } from '@affine/core/modules/navigation';
import { PeekViewService } from '@affine/core/modules/peek-view/services/peek-view';
import track from '@affine/track';
import type { DocMode } from '@blocksuite/affine/blocks';
import {
  DocTitle,
  EdgelessEditor,
  PageEditor,
} from '@blocksuite/affine/presets';
import type { Doc } from '@blocksuite/affine/store';
import {
  type DocCustomPropertyInfo,
  DocService,
  DocsService,
  FeatureFlagService,
  useFramework,
  useLiveData,
  useService,
  useServices,
  WorkspaceService,
} from '@toeverything/infra';
import React, {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import {
  AffinePageReference,
  AffineSharedPageReference,
} from '../../affine/reference-link';
import {
  type DefaultOpenProperty,
  DocPropertiesTable,
} from '../../doc-properties';
import { BiDirectionalLinkPanel } from './bi-directional-link-panel';
import { BlocksuiteEditorJournalDocTitle } from './journal-doc-title';
import {
  patchDocModeService,
  patchEdgelessClipboard,
  patchEmbedLinkedDocBlockConfig,
  patchForSharedPage,
  patchNotificationService,
  patchParseDocUrlExtension,
  patchPeekViewService,
  patchQuickSearchService,
  patchReferenceRenderer,
  type ReferenceReactRenderer,
} from './specs/custom/spec-patchers';
import { createEdgelessModeSpecs } from './specs/edgeless';
import { createPageModeSpecs } from './specs/page';
import * as styles from './styles.css';

const adapted = {
  DocEditor: createReactComponentFromLit({
    react: React,
    elementClass: PageEditor,
  }),
  DocTitle: createReactComponentFromLit({
    react: React,
    elementClass: DocTitle,
  }),
  EdgelessEditor: createReactComponentFromLit({
    react: React,
    elementClass: EdgelessEditor,
  }),
};

interface BlocksuiteEditorProps {
  page: Doc;
  shared?: boolean;
  defaultOpenProperty?: DefaultOpenProperty;
}

const usePatchSpecs = (shared: boolean, mode: DocMode) => {
  const [reactToLit, portals] = useLitPortalFactory();
  const {
    peekViewService,
    docService,
    docsService,
    editorService,
    workspaceService,
    featureFlagService,
    serverConfigService,
  } = useServices({
    PeekViewService,
    DocService,
    DocsService,
    WorkspaceService,
    EditorService,
    FeatureFlagService,
    ServerConfigService,
  });
  const framework = useFramework();
  const serverFeatures = useLiveData(
    serverConfigService.serverConfig.features$
  );
  const referenceRenderer: ReferenceReactRenderer = useMemo(() => {
    return function customReference(reference) {
      const data = reference.delta.attributes?.reference;
      if (!data) return <span />;

      const pageId = data.pageId;
      if (!pageId) return <span />;

      const params = toURLSearchParams(data.params);

      if (workspaceService.workspace.openOptions.isSharedMode) {
        return (
          <AffineSharedPageReference
            docCollection={workspaceService.workspace.docCollection}
            pageId={pageId}
            params={params}
          />
        );
      }

      return <AffinePageReference pageId={pageId} params={params} />;
    };
  }, [workspaceService]);

  const specs = useMemo(() => {
    const enableAI =
      serverFeatures?.copilot && featureFlagService.flags.enable_ai.value;
    return mode === 'edgeless'
      ? createEdgelessModeSpecs(framework, !!enableAI)
      : createPageModeSpecs(framework, !!enableAI);
  }, [
    serverFeatures?.copilot,
    featureFlagService.flags.enable_ai.value,
    mode,
    framework,
  ]);

  const confirmModal = useConfirmModal();
  const patchedSpecs = useMemo(() => {
    let patched = specs.concat(
      patchReferenceRenderer(reactToLit, referenceRenderer)
    );
    patched = patched.concat(patchNotificationService(confirmModal));
    patched = patched.concat(patchPeekViewService(peekViewService));
    patched = patched.concat(patchEdgelessClipboard());
    patched = patched.concat(patchParseDocUrlExtension(framework));
    patched = patched.concat(patchQuickSearchService(framework));
    patched = patched.concat(patchEmbedLinkedDocBlockConfig(framework));
    if (shared) {
      patched = patched.concat(patchForSharedPage());
    }
    patched = patched.concat(
      patchDocModeService(docService, docsService, editorService)
    );
    return patched;
  }, [
    confirmModal,
    docService,
    docsService,
    editorService,
    framework,
    peekViewService,
    reactToLit,
    referenceRenderer,
    shared,
    specs,
  ]);

  return [
    patchedSpecs,
    useMemo(
      () => (
        <>
          {portals.map(p => (
            <Fragment key={p.id}>{p.portal}</Fragment>
          ))}
        </>
      ),
      [portals]
    ),
  ] as const;
};

export const BlocksuiteDocEditor = forwardRef<
  PageEditor,
  BlocksuiteEditorProps & {
    onClickBlank?: () => void;
    titleRef?: React.Ref<DocTitle>;
  }
>(function BlocksuiteDocEditor(
  {
    page,
    shared,
    onClickBlank,
    titleRef: externalTitleRef,
    defaultOpenProperty,
  },
  ref
) {
  const titleRef = useRef<DocTitle | null>(null);
  const docRef = useRef<PageEditor | null>(null);
  const journalService = useService(JournalService);
  const isJournal = !!useLiveData(journalService.journalDate$(page.id));

  const editorSettingService = useService(EditorSettingService);

  const onDocRef = useCallback(
    (el: PageEditor) => {
      docRef.current = el;
      if (ref) {
        if (typeof ref === 'function') {
          ref(el);
        } else {
          ref.current = el;
        }
      }
    },
    [ref]
  );

  const onTitleRef = useCallback(
    (el: DocTitle) => {
      titleRef.current = el;
      if (externalTitleRef) {
        if (typeof externalTitleRef === 'function') {
          externalTitleRef(el);
        } else {
          (externalTitleRef as any).current = el;
        }
      }
    },
    [externalTitleRef]
  );

  const [specs, portals] = usePatchSpecs(!!shared, 'page');

  const displayBiDirectionalLink = useLiveData(
    editorSettingService.editorSetting.settings$.selector(
      s => s.displayBiDirectionalLink
    )
  );

  const onPropertyChange = useCallback((property: DocCustomPropertyInfo) => {
    track.doc.inlineDocInfo.property.editProperty({
      type: property.type,
    });
  }, []);

  const onPropertyAdded = useCallback((property: DocCustomPropertyInfo) => {
    track.doc.inlineDocInfo.property.addProperty({
      type: property.type,
      module: 'at menu',
    });
  }, []);

  const onDatabasePropertyChange = useCallback(
    (_row: DatabaseRow, cell: DatabaseValueCell) => {
      track.doc.inlineDocInfo.databaseProperty.editProperty({
        type: cell.property.type$.value,
      });
    },
    []
  );

  return (
    <>
      <div className={styles.affineDocViewport} style={{ height: '100%' }}>
        {!isJournal ? (
          <adapted.DocTitle doc={page} ref={onTitleRef} />
        ) : (
          <BlocksuiteEditorJournalDocTitle page={page} />
        )}
        {!shared ? (
          <DocPropertiesTable
            onDatabasePropertyChange={onDatabasePropertyChange}
            onPropertyChange={onPropertyChange}
            onPropertyAdded={onPropertyAdded}
            defaultOpenProperty={defaultOpenProperty}
          />
        ) : null}
        <adapted.DocEditor
          className={styles.docContainer}
          ref={onDocRef}
          doc={page}
          specs={specs}
          hasViewport={false}
        />
        <div
          className={styles.docEditorGap}
          data-testid="page-editor-blank"
          onClick={onClickBlank}
        ></div>
        {!shared && displayBiDirectionalLink ? (
          <BiDirectionalLinkPanel />
        ) : null}
      </div>
      {portals}
    </>
  );
});
export const BlocksuiteEdgelessEditor = forwardRef<
  EdgelessEditor,
  BlocksuiteEditorProps
>(function BlocksuiteEdgelessEditor({ page, shared }, ref) {
  const [specs, portals] = usePatchSpecs(!!shared, 'edgeless');
  const editorRef = useRef<EdgelessEditor | null>(null);

  const onDocRef = useCallback(
    (el: EdgelessEditor) => {
      editorRef.current = el;
      if (ref) {
        if (typeof ref === 'function') {
          ref(el);
        } else {
          ref.current = el;
        }
      }
    },
    [ref]
  );

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateComplete
        .then(() => {
          // make sure editor can get keyboard events on showing up
          editorRef.current?.querySelector('affine-edgeless-root')?.click();
        })
        .catch(console.error);
    }
  }, []);

  return (
    <>
      <adapted.EdgelessEditor ref={onDocRef} doc={page} specs={specs} />
      {portals}
    </>
  );
});
