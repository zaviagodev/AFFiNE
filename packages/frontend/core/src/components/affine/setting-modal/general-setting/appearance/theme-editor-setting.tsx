import { Button } from '@affine/component';
import { SettingRow } from '@affine/component/setting-components';
import { DesktopApiService } from '@affine/core/modules/desktop-api/service';
import { ThemeEditorService } from '@affine/core/modules/theme-editor';
import { UrlService } from '@affine/core/modules/url';
import { DeleteIcon } from '@blocksuite/icons/rc';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import { cssVar } from '@toeverything/theme';
import { useCallback } from 'react';

export const ThemeEditorSetting = () => {
  const themeEditor = useService(ThemeEditorService);
  const modified = useLiveData(themeEditor.modified$);
  const urlService = useService(UrlService);
  const desktopApi = useServiceOptional(DesktopApiService);

  const open = useCallback(() => {
    if (desktopApi) {
      desktopApi.handler.ui.openThemeEditor().catch(console.error);
    } else if (BUILD_CONFIG.isMobileWeb || BUILD_CONFIG.isWeb) {
      urlService.openPopupWindow(location.origin + '/theme-editor');
    }
  }, [desktopApi, urlService]);

  return (
    <SettingRow
      name="Customize Theme"
      desc="Edit all AFFiNE theme variables here"
    >
      <div style={{ display: 'flex', gap: 16 }}>
        {modified ? (
          <Button
            style={{
              color: cssVar('errorColor'),
              borderColor: cssVar('errorColor'),
            }}
            prefixStyle={{
              color: cssVar('errorColor'),
            }}
            onClick={() => themeEditor.reset()}
            variant="secondary"
            prefix={<DeleteIcon />}
          >
            Reset all
          </Button>
        ) : null}
        <Button onClick={open}>Open Theme Editor</Button>
      </div>
    </SettingRow>
  );
};
