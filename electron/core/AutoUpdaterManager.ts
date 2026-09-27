import { app, shell } from 'electron';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import AdmZip from 'adm-zip';

export interface UpdateInfo {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  downloadUrl?: string;
  assetSize?: number;
  commitSha?: string;
}

export interface DownloadProgress {
  percent: number;
  transferredBytes: number;
  totalBytes: number;
}

export class AutoUpdaterManager {
  private repoOwner = 'ArhanRaaj';
  private repoName = 'VictusClient';
  private currentVersion: string;
  private downloadedUpdatePath: string | null = null;
  private isDownloading = false;

  constructor() {
    this.currentVersion = app?.isPackaged ? app.getVersion() : (app?.getVersion?.() || '1.0.8');
  }

  public getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * Check GitHub Releases API for newer version
   */
  public async checkForUpdates(): Promise<UpdateInfo> {
    try {
      const release = await this.fetchLatestRelease();

      if (!release) {
        // Fallback: check latest commit on main branch
        return await this.checkLatestCommit();
      }

      const latestTag = (release.tag_name || '').replace(/^v/i, '');
      const isNewer = this.compareSemver(latestTag, this.currentVersion) > 0;

      // Prioritize lightweight installer first, then any executable, then zip
      let asset = release.assets?.find(
        (a: any) => a.name.toLowerCase() === 'victusclient-setup.exe'
      );
      if (!asset) {
        asset = release.assets?.find(
          (a: any) => a.name.endsWith('.exe') && !a.name.includes('blockmap')
        );
      }
      if (!asset) {
        asset = release.assets?.find((a: any) => a.name.endsWith('.msi'));
      }
      if (!asset) {
        asset = release.assets?.find((a: any) => a.name.endsWith('.zip'));
      }

      const releaseNotesFormatted = this.formatReleaseNotes(release.body, latestTag);

      return {
        updateAvailable: isNewer,
        currentVersion: this.currentVersion,
        latestVersion: latestTag || this.currentVersion,
        releaseName: release.name || `Victus Client v${latestTag}`,
        releaseNotes: releaseNotesFormatted,
        publishedAt: release.published_at || new Date().toISOString(),
        downloadUrl: asset ? asset.browser_download_url : undefined,
        assetSize: asset ? asset.size : undefined,
      };
    } catch (err: any) {
      console.warn('[AutoUpdater] Error checking updates:', err.message);
      return {
        updateAvailable: false,
        currentVersion: this.currentVersion,
        latestVersion: this.currentVersion,
        releaseName: 'Current Version',
        releaseNotes: 'You are running the latest version.',
        publishedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Check latest commit on main branch as a fallback or fast update mechanism
   */
  private async checkLatestCommit(): Promise<UpdateInfo> {
    try {
      const commit = await this.fetchLatestCommit();
      if (!commit) {
        return {
          updateAvailable: false,
          currentVersion: this.currentVersion,
          latestVersion: this.currentVersion,
          releaseName: 'Victus Client',
          releaseNotes: 'Up to date with GitHub main.',
          publishedAt: new Date().toISOString(),
        };
      }

      const shortSha = commit.sha.substring(0, 7);
      const commitMsg = commit.commit?.message || 'Latest GitHub sync';
      const commitDate = commit.commit?.author?.date || new Date().toISOString();

      return {
        updateAvailable: false, // Default to true only when release assets exist or version bump
        currentVersion: this.currentVersion,
        latestVersion: `${this.currentVersion}-${shortSha}`,
        releaseName: `Victus Build (${shortSha})`,
        releaseNotes: commitMsg,
        publishedAt: commitDate,
        commitSha: commit.sha,
      };
    } catch {
      return {
        updateAvailable: false,
        currentVersion: this.currentVersion,
        latestVersion: this.currentVersion,
        releaseName: 'Victus Client',
        releaseNotes: 'Up to date.',
        publishedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Download the update asset in background with stream progress
   */
  public async downloadUpdate(
    downloadUrl: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    if (this.isDownloading) {
      return { success: false, error: 'Download already in progress' };
    }

    this.isDownloading = true;

    try {
      const updatesDir = path.join(app.getPath('userData'), 'updates');
      if (!fs.existsSync(updatesDir)) {
        fs.mkdirSync(updatesDir, { recursive: true });
      }

      const fileName = path.basename(new URL(downloadUrl).pathname) || 'VictusClient-Update.exe';
      const targetPath = path.join(updatesDir, fileName);

      // Follow redirects and download
      await this.downloadFileWithRedirects(downloadUrl, targetPath, onProgress);

      this.downloadedUpdatePath = targetPath;
      this.isDownloading = false;

      return { success: true, filePath: targetPath };
    } catch (err: any) {
      this.isDownloading = false;
      return { success: false, error: err.message };
    }
  }

  /**
   * Relaunch and execute downloaded update
   */
  public restartAndInstall(): { success: boolean; error?: string } {
    if (!this.downloadedUpdatePath || !fs.existsSync(this.downloadedUpdatePath)) {
      console.warn('[AutoUpdater] No downloaded update found to install');
      return { success: false, error: 'Update file is not ready or missing on disk.' };
    }

    try {
      const updatePath = this.downloadedUpdatePath;
      const lower = updatePath.toLowerCase();

      if (process.platform === 'win32') {
        if (lower.endsWith('.exe')) {
          // Launch Windows installer executable after a 1-second delay so this process terminates cleanly
          try {
            const child = spawn(
              'cmd.exe',
              ['/c', `timeout /t 1 /nobreak >nul & start "" "${updatePath}"`],
              {
                detached: true,
                shell: true,
                stdio: 'ignore',
              }
            );
            child.unref();
          } catch {
            shell.openPath(updatePath);
          }

          app.exit(0);
          return { success: true };
        } else if (lower.endsWith('.zip')) {
          // If update package is a zip (such as app-asar.zip)
          const updatesDir = path.dirname(updatePath);
          const zip = new AdmZip(updatePath);
          const zipEntries = zip.getEntries();
          const asarEntry = zipEntries.find((e) => e.entryName.toLowerCase().endsWith('app.asar'));

          if (asarEntry) {
            const stagedAsar = path.join(updatesDir, 'app.asar');
            zip.extractEntryTo(asarEntry, updatesDir, false, true);

            // Path to running application resources
            const resourcesDir = process.resourcesPath;
            const targetAsar = path.join(resourcesDir, 'app.asar');
            const execPath = process.execPath;

            // Generate reliable batch updater script
            const batPath = path.join(updatesDir, 'apply-update.bat');
            const batContent = `@echo off\r\ntimeout /t 1 /nobreak >nul\r\ncopy /y "${stagedAsar}" "${targetAsar}" >nul 2>&1\r\nstart "" "${execPath}"\r\nexit\r\n`;
            fs.writeFileSync(batPath, batContent);

            const child = spawn('cmd.exe', ['/c', batPath], {
              detached: true,
              shell: true,
              stdio: 'ignore',
            });
            child.unref();

            setTimeout(() => {
              app.quit();
            }, 600);
            return { success: true };
          } else {
            // Fallback: extract to updates directory and open
            zip.extractAllTo(updatesDir, true);
            shell.openPath(updatesDir);
            return { success: true };
          }
        } else {
          shell.openPath(updatePath);
          setTimeout(() => app.quit(), 800);
          return { success: true };
        }
      } else {
        // macOS / Linux
        spawn('open', [updatePath], { detached: true, stdio: 'ignore' }).unref();
        setTimeout(() => app.quit(), 800);
        return { success: true };
      }
    } catch (err: any) {
      console.error('[AutoUpdater] Failed to launch installer:', err);
      return { success: false, error: err.message };
    }
  }

  private formatReleaseNotes(rawBody: string | undefined, tag: string): string {
    const defaultNotes = [
      '### ✨ What\'s New in VictusClient v' + tag,
      '- **Minecraft 26.4 (Snapshot 1) Support**: Full native support for Minecraft 26.4 (26.4-snapshot-1) with official Mojang client runtime and Fabric compatibility.',
      '- **Mods & Content Manager**: Browse, filter, and install Fabric/Forge mods, shaders, and resource packs directly inside the launcher.',
      '- **Strict Instance Version Lock**: Content downloads automatically match and lock to the active instance Minecraft version & loader.',
      '- **Instant Directory Access**: 1-click button to open instance mods/shaders folder in Windows Explorer.',
      '',
      '### 🛠️ Fixes & Improvements',
      '- **Launch Stability Patch**: Fixed process termination issues during initial Minecraft startup.',
      '- **Auto-Updater Overhaul**: Added full-screen update dashboard with patch breakdown and instant in-place restart.',
      '- **Restart & Apply Fixed**: Resolved update installer launch failure on Windows.',
      '- **Refined Obsidian Theme**: Removed harsh color gradients across the UI in favor of a sleek, dark matte aesthetic.',
      '- **Compact Installer**: Under 10MB standalone Windows installer footprint.',
    ].join('\n');

    if (!rawBody || rawBody.trim().length === 0 || rawBody.includes('Automated release build')) {
      return defaultNotes;
    }

    return defaultNotes + '\n\n### 📦 Release Details\n' + rawBody.trim();
  }

  private async fetchLatestRelease(): Promise<any> {
    const apiResult = await new Promise<any>((resolve) => {
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${this.repoOwner}/${this.repoName}/releases/latest`,
        headers: {
          'User-Agent': 'VictusClient-AutoUpdater',
          Accept: 'application/vnd.github.v3+json',
        },
      };

      https
        .get(options, (res) => {
          if (res.statusCode !== 200) {
            resolve(null);
            return;
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(null);
            }
          });
        })
        .on('error', () => resolve(null));
    });

    if (apiResult && apiResult.tag_name) {
      return apiResult;
    }

    // Rate-limit immune fallback: Check HTTP 302 redirect on github.com/releases/latest
    return await this.fetchLatestReleaseWebFallback();
  }

  private fetchLatestReleaseWebFallback(): Promise<any> {
    return new Promise((resolve) => {
      const options = {
        hostname: 'github.com',
        path: `/${this.repoOwner}/${this.repoName}/releases/latest`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      };

      https
        .get(options, (res) => {
          const loc = res.headers.location;
          if ((res.statusCode === 302 || res.statusCode === 301) && loc) {
            const tag = loc.split('/').pop() || '';
            if (tag) {
              resolve({
                tag_name: tag,
                name: `VictusClient ${tag}`,
                body: '',
                published_at: new Date().toISOString(),
                assets: [
                  {
                    name: 'VictusClient-Setup.exe',
                    browser_download_url: `https://github.com/${this.repoOwner}/${this.repoName}/releases/download/${tag}/VictusClient-Setup.exe`,
                    size: 10276864,
                  },
                  {
                    name: 'app-asar.zip',
                    browser_download_url: `https://github.com/${this.repoOwner}/${this.repoName}/releases/download/${tag}/app-asar.zip`,
                    size: 9993688,
                  },
                ],
              });
              return;
            }
          }
          resolve(null);
        })
        .on('error', () => resolve(null));
    });
  }

  private fetchLatestCommit(): Promise<any> {
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${this.repoOwner}/${this.repoName}/commits/main`,
        headers: {
          'User-Agent': 'VictusClient-AutoUpdater',
          Accept: 'application/vnd.github.v3+json',
        },
      };

      https
        .get(options, (res) => {
          if (res.statusCode !== 200) {
            resolve(null);
            return;
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(null);
            }
          });
        })
        .on('error', () => resolve(null));
    });
  }

  private downloadFileWithRedirects(
    url: string,
    dest: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = (currentUrl: string, maxRedirects = 5) => {
        if (maxRedirects <= 0) {
          reject(new Error('Too many redirects while downloading update'));
          return;
        }

        const parsedUrl = new URL(currentUrl);
        const options = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          headers: {
            'User-Agent': 'VictusClient-AutoUpdater',
          },
        };

        https
          .get(options, (res) => {
            // Handle redirects (301, 302, 303, 307, 308)
            if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode)) {
              const redirectUrl = res.headers.location;
              if (redirectUrl) {
                request(redirectUrl, maxRedirects - 1);
                return;
              }
            }

            if (res.statusCode !== 200) {
              reject(new Error(`Failed to download: HTTP ${res.statusCode}`));
              return;
            }

            const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
            let transferredBytes = 0;

            const fileStream = fs.createWriteStream(dest);

            res.on('data', (chunk) => {
              transferredBytes += chunk.length;
              if (onProgress && totalBytes > 0) {
                const percent = Math.min(100, Math.round((transferredBytes / totalBytes) * 100));
                onProgress({ percent, transferredBytes, totalBytes });
              }
            });

            res.pipe(fileStream);

            fileStream.on('finish', () => {
              fileStream.close();
              resolve();
            });

            fileStream.on('error', (err) => {
              fs.unlink(dest, () => {});
              reject(err);
            });
          })
          .on('error', (err) => {
            reject(err);
          });
      };

      request(url);
    });
  }

  /**
   * Simple SemVer comparator (returns > 0 if v1 > v2)
   */
  private compareSemver(v1: string, v2: string): number {
    const parts1 = v1.split('.').map((p) => parseInt(p, 10) || 0);
    const parts2 = v2.split('.').map((p) => parseInt(p, 10) || 0);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }
}
