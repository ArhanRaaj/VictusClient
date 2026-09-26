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
    // 1. Exchange OAuth code for Microsoft Live token
    const msTokenData = await this.postForm('https://login.live.com/oauth20_token.srf', {
      client_id: this.clientId,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      scope: this.scope,
    });

    if (!msTokenData.access_token) {
      throw new Error(msTokenData.error_description || 'Failed to acquire Microsoft OAuth token');
    }

    const msAccessToken = msTokenData.access_token;
    const refreshToken = msTokenData.refresh_token;

    // 2. Authenticate with Xbox Live
    const xblData = await this.postJson('https://user.auth.xboxlive.com/user/authenticate', {
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: `d=${msAccessToken}`,
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT',
    });

    if (!xblData.Token || !xblData.DisplayClaims?.xui?.[0]?.uhs) {
      throw new Error('Failed to authenticate with Xbox Live network');
    }

    const xblToken = xblData.Token;
    const userHash = xblData.DisplayClaims.xui[0].uhs;

    // 3. Obtain XSTS Token for Minecraft Services
    const xstsData = await this.postJson('https://xsts.auth.xboxlive.com/xsts/authorize', {
      Properties: {
        SandboxId: 'RETAIL',
        UserTokens: [xblToken],
      },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT',
    });

    if (xstsData.XErr) {
      if (xstsData.XErr === 2148916233) {
        throw new Error('This Microsoft account has no Xbox profile. Please visit xbox.com to setup your gamer tag.');
      } else if (xstsData.XErr === 2148916238) {
        throw new Error('Child account: A parent or guardian must grant permission to access Minecraft.');
      }
      throw new Error(`Xbox XSTS Authorization failed with error code: ${xstsData.XErr}`);
    }

    const xstsToken = xstsData.Token;

    // 4. Authenticate with Minecraft Services
    const mcAuthData = await this.postJson('https://api.minecraftservices.com/authentication/login_with_xbox', {
      identityToken: `XBL3.0 x=${userHash};${xstsToken}`,
    });

    if (!mcAuthData.access_token) {
      throw new Error('Failed to acquire Minecraft access token');
    }

    const mcAccessToken = mcAuthData.access_token;

    // 5. Fetch Minecraft Game Profile
    const profile = await this.getJson('https://api.minecraftservices.com/minecraft/profile', mcAccessToken);

    if (!profile.name || !profile.id) {
      throw new Error('No Minecraft Java Edition profile found. Ensure you own Minecraft and have chosen a username.');
    }

    const skinUrl =
      profile.skins?.find((s: any) => s.state === 'ACTIVE')?.url ||
      `https://textures.minecraft.net/texture/292009a4925b58f02c77d6d330e88d40f6074e798d24e734ff70a02632e5b697`;

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

  private postJson(urlStr: string, payload: any): Promise<any> {
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
