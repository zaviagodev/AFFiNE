import type { DocsService } from '@toeverything/infra';
import { OnEvent, Service, WorkspaceInitialized } from '@toeverything/infra';

import { EditorSettingService } from '../../editor-setting';
import type { WorkbenchService } from '../../workbench';
import type { DesktopApiService } from './desktop-api';

// setup desktop events for workspace scope
@OnEvent(WorkspaceInitialized, e => e.setupApplicationMenuEvents)
export class WorkspaceDesktopApiService extends Service {
  constructor(
    private readonly desktopApi: DesktopApiService,
    private readonly docsService: DocsService,
    private readonly workbenchService: WorkbenchService
  ) {
    super();
  }

  async setupApplicationMenuEvents() {
    this.desktopApi.events.applicationMenu.onNewPageAction(() => {
      const editorSetting =
        this.framework.get(EditorSettingService).editorSetting;

      const docProps = {
        note: editorSetting.get('affine:note'),
      };
      this.desktopApi.handler.ui
        .isActiveTab()
        .then(isActive => {
          if (!isActive) {
            return;
          }
          const page = this.docsService.createDoc({ docProps });
          this.workbenchService.workbench.openDoc(page.id);
        })
        .catch(err => {
          console.error(err);
        });
    });
  }
}
