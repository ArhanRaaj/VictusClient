import http from 'http';
import https from 'https';
import { shell, BrowserWindow, session } from 'electron';

export interface VictusCloudProfile {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  total_cp: number;
  cp_level: number;
  cp_tier: string;
  referral_code?: string;
}

export interface VictusFreeServer {
  id: number;
  identifier: string;
  uuid: string;
  name: string;
  description?: string;
  serverType: string;
  status: 'online' | 'offline' | 'starting' | 'stopping' | 'unknown';
  nodeId: number;
  playersOnline: number;
  maxPlayers: number;
  ip: string;
  port: number;
  fullAddress: string;
  ramMb: number;
  cpuPercent: number;
  panelUrl: string;
}

interface NodeConfig {
  uuid: string;
  token: string;
  fqdn: string;
  port: number;
}

export class VictusCloudManager {
  private pteroBase = 'https://control.victuscloud.com';
  private pteroApiKey = 'ptla_u8ZKPwrltjqTlOF5oUaGzTjCWvlKrTAmS47tZmmcgx1';
  private pteroSsoSecret = 'cce364a84eb937e608e556683464a6be09a13c8ff62ebe3af0821c05b215adf0';
  private supabaseUrl = 'https://db.victuscloud.com';
  private supabaseAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdWl5d2R1amlucmtrcG9icHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODYyNDMsImV4cCI6MjA3OTM2MjI0M30.Vghl_PKcGwqudXq-fnk-6IuX16NM-PHtngU4aL9cxcc';
  private supabaseServiceKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdWl5d2R1amlucmtrcG9icHF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc4NjI0MywiZXhwIjoyMDc5MzYyMjQzfQ.fTuoqYlvB_n5bxmvUfi5nAoD6ZS9DD1HaWvpW0cETnQ';

  private nodeConfigCache = new Map<number, NodeConfig>();
  private activeAuthWindow: BrowserWindow | null = null;
  private authPollTimer: NodeJS.Timeout | null = null;

  constructor() {}

  // -------------------------------------------------------------
  // Native Electron Modal Auth Window (Victus Cloud Web & OAuth)
  // -------------------------------------------------------------
  public startWebAuth(
    parentWindow?: BrowserWindow | null,
    initialMode: 'login' | 'signup' = 'login'
  ): Promise<{ success: boolean; profile?: VictusCloudProfile; accessToken?: string; error?: string }> {
    return new Promise((resolve) => {
      this.cancelWebAuth();

      let isResolved = false;

      const finish = (result: {
        success: boolean;
        profile?: VictusCloudProfile;
        accessToken?: string;
        error?: string;
      }) => {
        if (!isResolved) {
          isResolved = true;
          if (this.authPollTimer) {
            clearInterval(this.authPollTimer);
            this.authPollTimer = null;
          }
          if (this.activeAuthWindow && !this.activeAuthWindow.isDestroyed()) {
            try {
              this.activeAuthWindow.destroy();
            } catch {}
          }
          this.activeAuthWindow = null;
          resolve(result);
        }
      };

      const targetPath = initialMode === 'signup' ? '/signup' : '/login';
      const targetUrl = `https://victuscloud.com${targetPath}`;

      const authWin = new BrowserWindow({
        width: 520,
        height: 720,
        minWidth: 440,
        minHeight: 600,
        title: initialMode === 'signup' ? 'Victus Cloud - Create Account' : 'Victus Cloud - Sign In',
        parent: parentWindow && !parentWindow.isDestroyed() ? parentWindow : undefined,
        modal: !!(parentWindow && !parentWindow.isDestroyed()),
        show: false,
        autoHideMenuBar: true,
        backgroundColor: '#0a0a0f',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      this.activeAuthWindow = authWin;

      // Chrome User-Agent prevents Google OAuth "403 disallowed_useragent"
      const chromeUa =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
      authWin.webContents.setUserAgent(chromeUa);

      authWin.loadURL(targetUrl);

      authWin.once('ready-to-show', () => {
        if (!isResolved && !authWin.isDestroyed()) {
          authWin.show();
        }
      });

      authWin.on('closed', () => {
        finish({ success: false, error: 'Login window was closed.' });
      });

      const handleTokenExtracted = async (accessToken: string, userObj?: any) => {
        if (isResolved) return;
        try {
          let email = userObj?.email || '';
          let userId = userObj?.id || '';

          if (!email || !userId) {
            const payload = this.decodeJwt(accessToken);
            if (payload) {
              email = email || payload.email || '';
              userId = userId || payload.sub || '';
            }
          }

          if (email || userId) {
            const profile = await this.getUserProfile(email || userId);
            finish({
              success: true,
              accessToken,
              profile: profile || {
                id: userId || 'unknown',
                email: email || '',
                username: email ? email.split('@')[0] : 'VictusUser',
                total_cp: 0,
                cp_level: 1,
                cp_tier: 'Starter',
              },
            });
          } else {
            finish({ success: false, error: 'Could not extract user details from session.' });
          }
        } catch (err: any) {
          finish({ success: false, error: err.message || 'Failed to sync Victus Cloud profile.' });
        }
      };

      const checkForAuth = async () => {
        if (isResolved || authWin.isDestroyed()) return;

        try {
          // 1. Inspect window.localStorage
          const stored = await authWin.webContents.executeJavaScript(`
            (() => {
              try {
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i);
                  if (k && (k.includes('auth-token') || k.includes('supabase.auth') || k.startsWith('sb-'))) {
                    const raw = localStorage.getItem(k);
                    if (raw && raw.includes('access_token')) {
                      const parsed = JSON.parse(raw);
                      if (parsed && parsed.access_token) {
                        return {
                          accessToken: parsed.access_token,
                          refreshToken: parsed.refresh_token,
                          user: parsed.user || null
                        };
                      }
                    }
                  }
                }
              } catch(e) {}
              return null;
            })()
          `);

          if (stored && stored.accessToken) {
            await handleTokenExtracted(stored.accessToken, stored.user);
            return;
          }

          // 2. Inspect session cookies
          const cookies = await authWin.webContents.session.cookies.get({ domain: 'victuscloud.com' });
          for (const c of cookies) {
            if (c.name.includes('auth-token')) {
              try {
                const decoded = decodeURIComponent(c.value);
                if (decoded.includes('access_token')) {
                  const parsed = JSON.parse(decoded);
                  if (parsed && parsed.access_token) {
                    await handleTokenExtracted(parsed.access_token, parsed.user);
                    return;
                  }
                }
              } catch {}
            }
          }

          // 3. Inspect current URL (hash or query token)
          const curUrl = authWin.webContents.getURL();
          if (curUrl) {
            try {
              const u = new URL(curUrl);
              const hashParams = new URLSearchParams(u.hash.substring(1));
              const queryParams = u.searchParams;
              const tokenFromUrl = hashParams.get('access_token') || queryParams.get('access_token');
              if (tokenFromUrl) {
                await handleTokenExtracted(tokenFromUrl);
                return;
              }
            } catch {}
          }
        } catch {}
      };

      authWin.webContents.on('did-finish-load', () => {
        checkForAuth();
      });

      authWin.webContents.on('did-navigate', () => {
        checkForAuth();
      });

      authWin.webContents.on('did-navigate-in-page', () => {
        checkForAuth();
      });

      // Regular check interval
      this.authPollTimer = setInterval(() => {
        checkForAuth();
      }, 800);
    });
  }

  public cancelWebAuth(): void {
    if (this.authPollTimer) {
      clearInterval(this.authPollTimer);
      this.authPollTimer = null;
    }
    if (this.activeAuthWindow && !this.activeAuthWindow.isDestroyed()) {
      try {
        this.activeAuthWindow.destroy();
      } catch {}
      this.activeAuthWindow = null;
    }
  }

  public async clearSession(): Promise<void> {
    try {
      if (session?.defaultSession) {
        await session.defaultSession.clearStorageData({
          origin: 'https://victuscloud.com',
          storages: ['cookies', 'localstorage'],
        });
      }
    } catch (err) {
      console.warn('[VictusCloudManager] Failed to clear session data:', err);
    }
  }

  // -------------------------------------------------------------
  // Direct Credentials Authentication
  // -------------------------------------------------------------
  public async loginWithCredentials(
    email: string,
    password: string
  ): Promise<{ success: boolean; profile?: VictusCloudProfile; accessToken?: string; error?: string }> {
    try {
      const resp = await this.httpsRequest(
        `${this.supabaseUrl}/auth/v1/token?grant_type=password`,
        'POST',
        {
          apikey: this.supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        { email: email.trim(), password }
      );

      if (resp.status !== 200 || !resp.data?.access_token) {
        return {
          success: false,
          error: resp.data?.error_description || resp.data?.msg || 'Invalid email or password.',
        };
      }

      const accessToken = resp.data.access_token;
      const user = resp.data.user;
      const profile = await this.getUserProfile(user.id || email);

      return {
        success: true,
        accessToken,
        profile: profile || {
          id: user.id,
          email: user.email,
          username: user.email.split('@')[0],
          total_cp: 0,
          cp_level: 1,
          cp_tier: 'Starter',
        },
      };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error connecting to Victus Cloud.' };
    }
  }

  // -------------------------------------------------------------
  // Supabase Profile & Coins
  // -------------------------------------------------------------
  public async getUserProfile(idOrEmail: string): Promise<VictusCloudProfile | null> {
    try {
      const isEmail = idOrEmail.includes('@');
      const param = isEmail
        ? `email=eq.${encodeURIComponent(idOrEmail.trim())}`
        : `id=eq.${encodeURIComponent(idOrEmail.trim())}`;

      const res = await this.httpsRequest(
        `${this.supabaseUrl}/rest/v1/profiles?${param}&select=*`,
        'GET',
        {
          apikey: this.supabaseServiceKey,
          Authorization: `Bearer ${this.supabaseServiceKey}`,
          Accept: 'application/json',
        }
      );

      if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
        const row = res.data[0];
        return {
          id: row.id,
          email: row.email,
          username: row.username || row.email?.split('@')[0] || 'VictusHero',
          avatar_url: row.avatar_url || row.discord_avatar_url || row.google_avatar_url,
          total_cp: typeof row.total_cp === 'number' ? row.total_cp : 0,
          cp_level: row.cp_level || 1,
          cp_tier: row.cp_tier || 'Starter',
          referral_code: row.referral_code,
        };
      }
      return null;
    } catch (e) {
      console.warn('[VictusCloudManager] Error fetching profile:', e);
      return null;
    }
  }

  // -------------------------------------------------------------
  // Pterodactyl Panel: User Free Servers
  // -------------------------------------------------------------
  public async getServersForUser(email: string): Promise<VictusFreeServer[]> {
    try {
      const cleanEmail = email.trim();
      const userRes = await this.httpsRequest(
        `${this.pteroBase}/api/application/users?filter[email]=${encodeURIComponent(cleanEmail)}&include=servers`,
        'GET',
        {
          Authorization: `Bearer ${this.pteroApiKey}`,
          Accept: 'application/json',
        }
      );

      const pUser = userRes.data?.data?.[0];
      if (!pUser) {
        return [];
      }

      const rawServers = pUser.attributes?.relationships?.servers?.data || [];
      const result: VictusFreeServer[] = [];

      for (const item of rawServers) {
        const srvId = item.attributes.id;
        const detailsRes = await this.httpsRequest(
          `${this.pteroBase}/api/application/servers/${srvId}?include=allocations`,
          'GET',
          {
            Authorization: `Bearer ${this.pteroApiKey}`,
            Accept: 'application/json',
          }
        );

        const attr = detailsRes.data?.attributes || item.attributes;
        const allocations = attr.relationships?.allocations?.data || [];
        const primaryAlloc = allocations[0]?.attributes;

        const serverUuid = attr.uuid;
        const nodeId = attr.node;
        const ip = primaryAlloc?.alias || primaryAlloc?.ip || '0.0.0.0';
        const port = primaryAlloc?.port || 25565;
        const fullAddress = `${ip}:${port}`;

        // Fetch live state from Wings
        let liveStatus: 'online' | 'offline' | 'starting' | 'stopping' | 'unknown' = 'unknown';
        let cpuPercent = 0;
        let wingsUptime = 0;

        try {
          const wingsState = await this.getWingsServerState(nodeId, serverUuid);
          if (wingsState) {
            if (wingsState.state === 'running') liveStatus = 'online';
            else if (wingsState.state === 'starting') liveStatus = 'starting';
            else if (wingsState.state === 'stopping') liveStatus = 'stopping';
            else if (wingsState.state === 'offline') liveStatus = 'offline';

            cpuPercent = Math.round(wingsState.utilization?.cpu_absolute || 0);
            wingsUptime = wingsState.utilization?.uptime || 0;
          }
        } catch {}

        // Fetch live player count via Minecraft Server Ping
        let playersOnline = 0;
        let maxPlayers = 20;

        if (liveStatus !== 'offline') {
          const pingData = await this.checkMinecraftPing(ip, port);
          if (pingData) {
            if (pingData.online) {
              liveStatus = 'online';
              playersOnline = pingData.players?.online || 0;
              maxPlayers = pingData.players?.max || 20;
            }
          }
        }

        result.push({
          id: attr.id,
          identifier: attr.identifier,
          uuid: attr.uuid,
          name: attr.name,
          description: attr.description,
          serverType: attr.server_type || 'free',
          status: liveStatus === 'unknown' ? (attr.suspended ? 'offline' : 'online') : liveStatus,
          nodeId: attr.node,
          playersOnline,
          maxPlayers,
          ip,
          port,
          fullAddress,
          ramMb: attr.limits?.memory || 2048,
          cpuPercent,
          panelUrl: `${this.pteroBase}/server/${attr.identifier}`,
        });
      }

      return result;
    } catch (e) {
      console.warn('[VictusCloudManager] Error getting user servers:', e);
      return [];
    }
  }

  // -------------------------------------------------------------
  // Wings Node Power Actions (Start, Stop, Restart)
  // -------------------------------------------------------------
  public async powerAction(
    serverUuid: string,
    nodeId: number,
    action: 'start' | 'stop' | 'restart'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const nodeConfig = await this.resolveNodeConfig(nodeId);
      if (!nodeConfig) {
        return { success: false, error: `Node configuration for node ${nodeId} not found.` };
      }

      const res = await this.httpsRequest(
        `https://${nodeConfig.fqdn}:${nodeConfig.port}/api/servers/${serverUuid}/power`,
        'POST',
        {
          Authorization: `Bearer ${nodeConfig.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        { action }
      );

      if (res.status === 204 || res.status === 200 || res.status === 202) {
        return { success: true };
      }

      return {
        success: false,
        error: res.data?.error || `Failed to ${action} server (HTTP ${res.status}).`,
      };
    } catch (e: any) {
      return { success: false, error: e.message || `Wings connection failed for ${action}.` };
    }
  }

  // -------------------------------------------------------------
  // SSO Redirect Generator
  // -------------------------------------------------------------
  public async getSSOUrl(
    serverIdentifier: string,
    accessToken?: string
  ): Promise<{ success: boolean; url: string }> {
    const targetUrl = `${this.pteroBase}/server/${serverIdentifier}`;

    if (accessToken) {
      try {
        const ssoRes = await this.httpsRequest(
          `${this.supabaseUrl}/functions/v1/pterodactyl-sso`,
          'POST',
          {
            Authorization: `Bearer ${accessToken}`,
            apikey: this.supabaseAnonKey,
            'Content-Type': 'application/json',
          },
          { redirect: targetUrl }
        );

        if (ssoRes.status === 200 && ssoRes.data?.redirect_url) {
          return { success: true, url: ssoRes.data.redirect_url };
        }
      } catch (e) {
        console.warn('[VictusCloudManager] SSO invoke fallback:', e);
      }
    }

    return { success: true, url: targetUrl };
  }

  // -------------------------------------------------------------
  // Helper: Open Free Server Creation Page
  // -------------------------------------------------------------
  public openCreateServerPage(): void {
    if (shell && typeof shell.openExternal === 'function') {
      shell.openExternal('https://victuscloud.com/free?createServer=1').catch(console.error);
    }
  }

  // -------------------------------------------------------------
  // Internal Helpers: Node Config, Wings, Ping & JWT
  // -------------------------------------------------------------
  private async resolveNodeConfig(nodeId: number): Promise<NodeConfig | null> {
    if (this.nodeConfigCache.has(nodeId)) {
      return this.nodeConfigCache.get(nodeId)!;
    }

    try {
      const res = await this.httpsRequest(
        `${this.pteroBase}/api/application/nodes/${nodeId}/configuration`,
        'GET',
        {
          Authorization: `Bearer ${this.pteroApiKey}`,
          Accept: 'application/json',
        }
      );

      if (res.status === 200 && res.data?.token) {
        // Look up node FQDN
        const nodeInfo = await this.httpsRequest(
          `${this.pteroBase}/api/application/nodes/${nodeId}`,
          'GET',
          {
            Authorization: `Bearer ${this.pteroApiKey}`,
            Accept: 'application/json',
          }
        );

        const fqdn = nodeInfo.data?.attributes?.fqdn || 'de1.victuscloud.com';
        const port = nodeInfo.data?.attributes?.daemon_listen || 8080;

        const config: NodeConfig = {
          uuid: res.data.uuid,
          token: res.data.token,
          fqdn,
          port,
        };
        this.nodeConfigCache.set(nodeId, config);
        return config;
      }
      return null;
    } catch (e) {
      console.warn(`[VictusCloudManager] Error resolving node ${nodeId} config:`, e);
      return null;
    }
  }

  private async getWingsServerState(nodeId: number, serverUuid: string): Promise<any | null> {
    const config = await this.resolveNodeConfig(nodeId);
    if (!config) return null;

    const res = await this.httpsRequest(
      `https://${config.fqdn}:${config.port}/api/servers/${serverUuid}`,
      'GET',
      {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
      }
    );

    return res.status === 200 ? res.data : null;
  }

  private async checkMinecraftPing(
    host: string,
    port: number
  ): Promise<{ online: boolean; players?: { online: number; max: number } } | null> {
    try {
      const res = await this.httpsRequest(
        `https://api.mcsrvstat.us/3/${encodeURIComponent(host)}:${port}`,
        'GET',
        { 'User-Agent': 'VictusClient/1.0.9 (support@victusclient.com)' }
      );
      if (res.status === 200 && res.data) {
        return {
          online: !!res.data.online,
          players: res.data.players || { online: 0, max: 20 },
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private decodeJwt(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = Buffer.from(base64, 'base64').toString('utf8');
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private httpsRequest(
    targetUrl: string,
    method: 'GET' | 'POST' = 'GET',
    headers: Record<string, string> = {},
    bodyData?: any
  ): Promise<{ status: number; data: any }> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(targetUrl);
      const req = https.request(
        parsed,
        {
          method,
          headers: {
            ...headers,
          },
          timeout: 7000,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode || 0, data: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode || 0, data });
            }
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });

      if (bodyData) {
        req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
      }
      req.end();
    });
  }
}
