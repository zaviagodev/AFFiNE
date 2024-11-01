import { AIProvider } from '@affine/core/blocksuite/presets/ai';
import type { OAuthProviderType } from '@affine/graphql';
import { track } from '@affine/track';
import {
  ApplicationFocused,
  ApplicationStarted,
  createEvent,
  OnEvent,
  Service,
} from '@toeverything/infra';
import { distinctUntilChanged, map, skip } from 'rxjs';

import type { UrlService } from '../../url';
import { type AuthAccountInfo, AuthSession } from '../entities/session';
import type { AuthStore } from '../stores/auth';
import type { FetchService } from './fetch';

function toAIUserInfo(account: AuthAccountInfo | null) {
  if (!account) return null;
  return {
    avatarUrl: account.avatar ?? '',
    email: account.email ?? '',
    id: account.id,
    name: account.label,
  };
}

// Emit when account changed
export const AccountChanged = createEvent<AuthAccountInfo | null>(
  'AccountChanged'
);

export const AccountLoggedIn = createEvent<AuthAccountInfo>('AccountLoggedIn');

export const AccountLoggedOut =
  createEvent<AuthAccountInfo>('AccountLoggedOut');

@OnEvent(ApplicationStarted, e => e.onApplicationStart)
@OnEvent(ApplicationFocused, e => e.onApplicationFocused)
export class AuthService extends Service {
  session = this.framework.createEntity(AuthSession);

  constructor(
    private readonly fetchService: FetchService,
    private readonly store: AuthStore,
    private readonly urlService: UrlService
  ) {
    super();

    // TODO(@forehalo): make AIProvider a standalone service passed to AI elements by props
    AIProvider.provide('userInfo', () => {
      return toAIUserInfo(this.session.account$.value);
    });

    this.session.account$
      .pipe(
        map(a => ({
          id: a?.id,
          account: a,
        })),
        distinctUntilChanged((a, b) => a.id === b.id), // only emit when the value changes
        skip(1) // skip the initial value
      )
      .subscribe(({ account }) => {
        AIProvider.slots.userInfo.emit(toAIUserInfo(account));

        if (account === null) {
          this.eventBus.emit(AccountLoggedOut, account);
        } else {
          this.eventBus.emit(AccountLoggedIn, account);
        }
        this.eventBus.emit(AccountChanged, account);
      });
  }

  private onApplicationStart() {
    this.session.revalidate();
  }

  private onApplicationFocused() {
    this.session.revalidate();
  }

  async sendEmailMagicLink(
    email: string,
    verifyToken?: string,
    challenge?: string,
    redirectUrl?: string // url to redirect to after signed-in
  ) {
    track.$.$.auth.signIn({ method: 'magic-link' });
    try {
      const scheme = this.urlService.getClientScheme();
      const magicLinkUrlParams = new URLSearchParams();
      if (redirectUrl) {
        magicLinkUrlParams.set('redirect_uri', redirectUrl);
      }
      if (scheme) {
        magicLinkUrlParams.set('client', scheme);
      }
      await this.fetchService.fetch('/api/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({
          email,
          // we call it [callbackUrl] instead of [redirect_uri]
          // to make it clear the url is used to finish the sign-in process instead of redirect after signed-in
          callbackUrl: `/magic-link?${magicLinkUrlParams.toString()}`,
        }),
        headers: {
          'content-type': 'application/json',
          ...(verifyToken ? this.captchaHeaders(verifyToken, challenge) : {}),
        },
      });
    } catch (e) {
      track.$.$.auth.signInFail({ method: 'magic-link' });
      throw e;
    }
  }

  async signInMagicLink(email: string, token: string) {
    try {
      await this.fetchService.fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token }),
      });

      this.session.revalidate();
      track.$.$.auth.signedIn({ method: 'magic-link' });
    } catch (e) {
      track.$.$.auth.signInFail({ method: 'magic-link' });
      throw e;
    }
  }

  async oauthPreflight(
    provider: OAuthProviderType,
    client: string,
    /** @deprecated*/ redirectUrl?: string
  ) {
    track.$.$.auth.signIn({ method: 'oauth', provider });
    try {
      const res = await this.fetchService.fetch('/api/oauth/preflight', {
        method: 'POST',
        body: JSON.stringify({ provider, redirect_uri: redirectUrl }),
        headers: {
          'content-type': 'application/json',
        },
      });

      let { url } = await res.json();

      // change `state=xxx` to `state={state:xxx,native:true}`
      // so we could know the callback should be redirect to native app
      const oauthUrl = new URL(url);
      oauthUrl.searchParams.set(
        'state',
        JSON.stringify({
          state: oauthUrl.searchParams.get('state'),
          client,
          provider,
        })
      );
      url = oauthUrl.toString();

      return url;
    } catch (e) {
      track.$.$.auth.signInFail({ method: 'oauth', provider });
      throw e;
    }
  }

  async signInOauth(code: string, state: string, provider: string) {
    try {
      const res = await this.fetchService.fetch('/api/oauth/callback', {
        method: 'POST',
        body: JSON.stringify({ code, state }),
        headers: {
          'content-type': 'application/json',
        },
      });

      this.session.revalidate();

      track.$.$.auth.signedIn({ method: 'oauth', provider });
      return res.json();
    } catch (e) {
      track.$.$.auth.signInFail({ method: 'oauth', provider });
      throw e;
    }
  }

  async signInPassword(credential: {
    email: string;
    password: string;
    verifyToken?: string;
    challenge?: string;
  }) {
    track.$.$.auth.signIn({ method: 'password' });
    try {
      await this.fetchService.fetch('/api/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify(credential),
        headers: {
          'content-type': 'application/json',
          ...(credential.verifyToken
            ? this.captchaHeaders(credential.verifyToken, credential.challenge)
            : {}),
        },
      });
      this.session.revalidate();
      track.$.$.auth.signedIn({ method: 'password' });
    } catch (e) {
      track.$.$.auth.signInFail({ method: 'password' });
      throw e;
    }
  }

  async signOut() {
    await this.fetchService.fetch('/api/auth/sign-out');
    this.store.setCachedAuthSession(null);
    this.session.revalidate();
  }

  checkUserByEmail(email: string) {
    return this.store.checkUserByEmail(email);
  }

  captchaHeaders(token: string, challenge?: string) {
    const headers: Record<string, string> = {
      'x-captcha-token': token,
    };

    if (challenge) {
      headers['x-captcha-challenge'] = challenge;
    }

    return headers;
  }
}
