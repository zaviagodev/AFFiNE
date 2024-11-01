import { assertExists } from '@blocksuite/affine/global/utils';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useEffect } from 'react';

import { OpenInAppService } from '../services';
import { OpenInAppPage } from './open-in-app-page';

/**
 * Web only guard to open the URL in desktop app for different conditions
 */
export const WebOpenInAppGuard = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  assertExists(
    BUILD_CONFIG.isWeb,
    'WebOpenInAppGuard should only be used in web'
  );
  const service = useService(OpenInAppService);
  const shouldOpenInApp = useLiveData(service.showOpenInAppPage$);

  useEffect(() => {
    service?.bootstrap();
  }, [service]);

  const onOpenHere = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      service.hideOpenInAppPage();
    },
    [service]
  );

  if (shouldOpenInApp === undefined) {
    return null;
  }

  return shouldOpenInApp ? (
    <OpenInAppPage openHereClicked={onOpenHere} />
  ) : (
    children
  );
};
