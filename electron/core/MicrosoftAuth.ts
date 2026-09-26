import { BrowserWindow } from 'electron';
import https from 'https';

export interface MicrosoftAccount {
  id: string;
  username: string;
  uuid: string;
  type: 'microsoft';
  skinUrl: string;
  avatarUrl: string;
  lastUsed: string;
  isActive: boolean;
  status: 'active';
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export class MicrosoftAuthManager {
  private clientId = '00000000402b5328'; // Standard Mojang/Xbox Live Client ID for Desktop
  private redirectUri = 'https://login.live.com/oauth20_desktop.srf';
  private scope = 'service::user.auth.xboxlive.com::MBI_SSL';

  /**
   * Opens the real Microsoft interactive sign-in popup window
   * and completes the full Xbox Live -> XSTS -> Minecraft Services chain
   */
  public async loginInteractive(parentWindow?: BrowserWindow | null): Promise<{
    success: boolean;
    account?: MicrosoftAccount;
    error?: string;
  }> {
    return new Promise((resolve) => {
      let isResolved = false;

      const authWindow = new BrowserWindow({
        width: 520,
        height: 680,
        title: 'Sign in with Microsoft - VictusClient',
        modal: true,
        parent: parentWindow || undefined,
        show: false,
        autoHideMenuBar: true,
        backgroundColor: '#0f1016',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      const authUrl = `https://login.live.com/oauth20_authorize.srf?client_id=${this.clientId}&response_type=code&scope=${encodeURIComponent(
        this.scope
      )}&redirect_uri=${encodeURIComponent(this.redirectUri)}&prompt=select_account`;

      authWindow.loadURL(authUrl);

      authWindow.once('ready-to-show', () => {
        authWindow.show();
      });

      const checkUrl = async (urlStr: string) => {
        if (!urlStr.startsWith(this.redirectUri)) return;

        try {
          const parsed = new URL(urlStr);
          const code = parsed.searchParams.get('code');
          const error = parsed.searchParams.get('error_description') || parsed.searchParams.get('error');

          if (code && !isResolved) {
            isResolved = true;
            authWindow.destroy();

            // Proceed through the token exchange chain
            try {
              const account = await this.exchangeCodeForMinecraft(code);
              resolve({ success: true, account });
            } catch (err: any) {
              console.error('[MicrosoftAuth] Exchange error:', err);
              resolve({ success: false, error: err.message || 'Failed to authenticate with Minecraft services' });
            }
          } else if (error && !isResolved) {
            isResolved = true;
            authWindow.destroy();
            resolve({ success: false, error });
          }
        } catch (e: any) {
          if (!isResolved) {
            isResolved = true;
            authWindow.destroy();
            resolve({ success: false, error: e.message });
          }
        }
      };

      authWindow.webContents.on('will-redirect', (_, url) => {
        checkUrl(url);
      });

      authWindow.webContents.on('will-navigate', (_, url) => {
        checkUrl(url);
      });

      authWindow.on('closed', () => {
        if (!isResolved) {
          isResolved = true;
          resolve({ success: false, error: 'Sign in was cancelled.' });
        }
      });
    });
  }

  /**
   * Exchanges authorization code through Microsoft -> XBL -> XSTS -> Minecraft Services
   */
  private async exchangeCodeForMinecraft(code: string): Promise<MicrosoftAccount> {
    console.log('[MicrosoftAuth] 1. Exchanging code for MSA access token...');
    // 1. Exchange OAuth code for Microsoft Live token
    const msTokenData = await this.postForm('https://login.live.com/oauth20_token.srf', {
      client_id: this.clientId,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      scope: this.scope,
    });

    if (!msTokenData || !msTokenData.access_token) {
      throw new Error(msTokenData?.error_description || 'Failed to acquire Microsoft OAuth token');
    }

    const msAccessToken = msTokenData.access_token;
    const refreshToken = msTokenData.refresh_token;

    console.log('[MicrosoftAuth] 2. Authenticating with Xbox Live (user.auth.xboxlive.com)...');
    // 2. Authenticate with Xbox Live - try with d= prefix first
    let xblData = await this.callXboxAuthenticate(msAccessToken, true);

    // If needed, try without d= prefix
    if (!xblData?.Token && (!xblData?.XErr || xblData.XErr === 400)) {
      console.log('[MicrosoftAuth] Retrying Xbox Live auth without d= prefix...');
      xblData = await this.callXboxAuthenticate(msAccessToken, false);
    }

    if (xblData?.XErr) {
      this.handleXboxError(xblData.XErr);
    }

    if (!xblData?.Token || !xblData?.DisplayClaims?.xui?.[0]?.uhs) {
      throw new Error(
        xblData?.Message ||
          'Failed to authenticate with Xbox Live network. Please ensure your Microsoft account has an Xbox profile created at xbox.com.'
      );
    }

    const xblToken = xblData.Token;
    const userHash = xblData.DisplayClaims.xui[0].uhs;

    console.log('[MicrosoftAuth] 3. Authorizing XSTS for Minecraft (xsts.auth.xboxlive.com)...');
    // 3. Obtain XSTS Token for Minecraft Services
    const xstsData = await this.postJson(
      'https://xsts.auth.xboxlive.com/xsts/authorize',
      {
        Properties: {
          SandboxId: 'RETAIL',
          UserTokens: [xblToken],
        },
        RelyingParty: 'rp://api.minecraftservices.com/',
        TokenType: 'JWT',
      },
      {
        'x-xbl-contract-version': '1',
      }
    );

    if (xstsData?.XErr) {
      this.handleXboxError(xstsData.XErr);
    }

    if (!xstsData?.Token) {
      throw new Error(xstsData?.Message || 'Xbox XSTS authorization failed.');
    }

    const xstsToken = xstsData.Token;

    console.log('[MicrosoftAuth] 4. Authenticating with Minecraft Services (api.minecraftservices.com)...');
    // 4. Authenticate with Minecraft Services
    const mcAuthData = await this.postJson('https://api.minecraftservices.com/authentication/login_with_xbox', {
      identityToken: `XBL3.0 x=${userHash};${xstsToken}`,
    });

    if (!mcAuthData?.access_token) {
      throw new Error(mcAuthData?.errorMessage || 'Failed to acquire Minecraft access token.');
    }

    const mcAccessToken = mcAuthData.access_token;

    console.log('[MicrosoftAuth] 5. Fetching Minecraft Game Profile...');
    // 5. Fetch Minecraft Game Profile
    const profile = await this.getJson('https://api.minecraftservices.com/minecraft/profile', mcAccessToken);

    if (!profile?.name || !profile?.id) {
      throw new Error(
        'No Minecraft Java Edition profile found on this account. Ensure you own Minecraft Java Edition and have set up your player name.'
      );
    }

    const skinUrl =
      profile.skins?.find((s: any) => s.state === 'ACTIVE')?.url ||
      `https://textures.minecraft.net/texture/292009a4925b58f02c77d6d330e88d40f6074e798d24e734ff70a02632e5b697`;

    console.log(`[MicrosoftAuth] Login Success! Welcome @${profile.name}`);

    return {
      id: `acc-ms-${profile.id}`,
      username: profile.name,
      uuid: profile.id,
      type: 'microsoft',
      skinUrl,
      avatarUrl: `https://mc-heads.net/avatar/${encodeURIComponent(profile.name)}/128`,
      lastUsed: 'Just now',
      isActive: true,
      status: 'active',
      accessToken: mcAccessToken,
      refreshToken,
      expiresAt: Date.now() + (mcAuthData.expires_in || 86400) * 1000,
    };
  }

  private async callXboxAuthenticate(accessToken: string, withPrefix: boolean): Promise<any> {
    const ticket = withPrefix ? (accessToken.startsWith('d=') ? accessToken : `d=${accessToken}`) : accessToken;

    return this.postJson(
      'https://user.auth.xboxlive.com/user/authenticate',
      {
        Properties: {
          AuthMethod: 'RPS',
          SiteName: 'user.auth.xboxlive.com',
          RpsTicket: ticket,
        },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT',
      },
      {
        'x-xbl-contract-version': '1',
      }
    );
  }

  private handleXboxError(errCode: number) {
    if (errCode === 2148916233) {
      throw new Error(
        'This Microsoft account has no Xbox profile. Please visit https://xbox.com, sign in once to create your free Xbox gamer profile, then try again.'
      );
    }
    if (errCode === 2148916238) {
      throw new Error(
        'Child account: A parent or guardian in your Microsoft Family must grant permission to access Xbox Live and Minecraft.'
      );
    }
    if (errCode === 2148916235) {
      throw new Error('Xbox Live is currently unavailable in your account region.');
    }
    if (errCode === 2148916236 || errCode === 2148916237) {
      throw new Error('Adult account verification required by Microsoft before accessing multiplayer.');
    }
    throw new Error(`Xbox network error code: ${errCode}`);
  }

  // --- HTTP Helpers ---

  private postForm(urlStr: string, params: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
      const body = new URLSearchParams(params).toString();
      const url = new URL(urlStr);

      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(data);
            }
          });
        }
      );

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  private postJson(urlStr: string, payload: any, customHeaders: Record<string, string> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify(payload);
      const url = new URL(urlStr);

      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Content-Length': Buffer.byteLength(body),
            ...customHeaders,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(data);
            }
          });
        }
      );

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  private getJson(urlStr: string, bearerToken: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr);

      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            Accept: 'application/json',
          },
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(data);
            }
          });
        }
      );

      req.on('error', reject);
      req.end();
    });
  }
}
