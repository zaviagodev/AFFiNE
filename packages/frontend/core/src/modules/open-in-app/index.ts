import {
  type Framework,
  GlobalState,
  WorkspacesService,
} from '@toeverything/infra';

import { OpenInAppService } from './services';

export * from './services';
export * from './utils';

export const configureOpenInApp = (framework: Framework) => {
  framework.service(OpenInAppService, [GlobalState, WorkspacesService]);
};
