import { Button, Checkbox } from '@affine/component';
import { useNavigateHelper } from '@affine/core/components/hooks/use-navigate-helper';
import {
  OpenInAppService,
  OpenLinkMode,
} from '@affine/core/modules/open-in-app';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { DownloadIcon, LocalWorkspaceIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import { useCallback, useState } from 'react';

import * as styles from './open-in-app-card.css';

export const OpenInAppCard = ({ className }: { className?: string }) => {
  const openInAppService = useService(OpenInAppService);
  const show = useLiveData(openInAppService.showOpenInAppBanner$);
  const navigateHelper = useNavigateHelper();
  const t = useI18n();

  const [remember, setRemember] = useState(false);

  const onOpen = useCallback(() => {
    navigateHelper.jumpToOpenInApp(window.location.href, true);
    if (remember) {
      openInAppService.setOpenLinkMode(OpenLinkMode.OPEN_IN_DESKTOP_APP);
    }
  }, [openInAppService, remember, navigateHelper]);

  const onDismiss = useCallback(() => {
    openInAppService.dismissBanner(
      remember ? OpenLinkMode.OPEN_IN_WEB : undefined
    );
  }, [openInAppService, remember]);

  const onToggleRemember = useCallback(() => {
    setRemember(v => !v);
  }, []);

  const handleDownload = useCallback(() => {
    track.$.navigationPanel.bottomButtons.downloadApp();
    const url = `https://affine.pro/download?channel=stable`;
    open(url, '_blank');
  }, []);

  if (!show) {
    return null;
  }

  return (
    <div className={clsx(styles.root, className)}>
      <div className={styles.pane}>
        <div className={styles.primaryRow}>
          <LocalWorkspaceIcon className={styles.icon} />
          <div>{t.t('com.affine.open-in-app.card.title')}</div>
        </div>
        <div className={styles.row}>
          <div className={styles.icon}>{/* placeholder */}</div>
          <div className={styles.buttonGroup}>
            <Button
              variant="primary"
              size="custom"
              className={styles.button}
              onClick={onOpen}
            >
              {t.t('com.affine.open-in-app.card.button.open')}
            </Button>
            <Button
              variant="secondary"
              size="custom"
              className={styles.button}
              onClick={onDismiss}
            >
              {t.t('com.affine.open-in-app.card.button.dismiss')}
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.pane}>
        <div className={styles.clickableRow} onClick={onToggleRemember}>
          <Checkbox className={styles.icon} checked={remember} />
          <div>{t.t('com.affine.open-in-app.card.remember')}</div>
        </div>
      </div>

      <div className={styles.pane}>
        <div className={styles.clickableRow} onClick={handleDownload}>
          <DownloadIcon className={styles.icon} />
          <div>{t.t('com.affine.open-in-app.card.download')}</div>
        </div>
      </div>
    </div>
  );
};
