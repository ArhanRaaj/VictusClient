import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export class ConfigManager {
  private dataDir: string;
  private instancesDir: string;
  private configFile: string;
  private accountsFile: string;

  constructor() {
    const userPath = app?.getPath('userData') || path.resolve('.');
    if (path.basename(userPath).toLowerCase() === 'victusclient') {
      this.dataDir = userPath;
    } else {
      this.dataDir = path.join(userPath, 'VictusClient');
    }
    // Respect existing nested directory if instances already exist there
    const nested = path.join(this.dataDir, 'VictusClient');
    if (fs.existsSync(nested) && fs.existsSync(path.join(nested, 'instances'))) {
      this.dataDir = nested;
    }

    this.instancesDir = path.join(this.dataDir, 'instances');
    this.configFile = path.join(this.dataDir, 'settings.json');
    this.accountsFile = path.join(this.dataDir, 'accounts.json');

    this.ensureDirs();
  }

  private ensureDirs() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    if (!fs.existsSync(this.instancesDir)) fs.mkdirSync(this.instancesDir, { recursive: true });
  }

  public getDataDir(): string {
    return this.dataDir;
  }

  public getInstancesDir(): string {
    return this.instancesDir;
  }

  public getInstanceDir(instanceId: string): string {
    const dir = path.join(this.instancesDir, instanceId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      fs.mkdirSync(path.join(dir, 'mods'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'shaderpacks'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'resourcepacks'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'saves'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'config'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'screenshots'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'logs'), { recursive: true });
    }
    return dir;
  }

  public loadSettings(): any {
    try {
      if (fs.existsSync(this.configFile)) {
        return JSON.parse(fs.readFileSync(this.configFile, 'utf-8'));
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
    return null;
  }

  public saveSettings(settings: any) {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  public loadAccounts(): any[] {
    try {
      if (fs.existsSync(this.accountsFile)) {
        return JSON.parse(fs.readFileSync(this.accountsFile, 'utf-8'));
      }
    } catch (e) {
      console.error('Failed to load accounts:', e);
    }
    return [];
  }

  public saveAccounts(accounts: any[]) {
    try {
      fs.writeFileSync(this.accountsFile, JSON.stringify(accounts, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save accounts:', e);
    }
  }

  public loadInstances(): any[] {
    const list: any[] = [];
    try {
      const dirs = fs.readdirSync(this.instancesDir);
      for (const d of dirs) {
        const jsonPath = path.join(this.instancesDir, d, 'instance.json');
        if (fs.existsSync(jsonPath)) {
          try {
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            list.push(data);
          } catch {}
        }
      }

      if (list.length === 0) {
        const defaults = [
          {
            id: 'inst-victus-121',
            name: 'Victus Modded 1.21.4',
            version: '1.21.4',
            loader: 'fabric',
            loaderVersion: '0.19.5',
            ramMin: 2048,
            ramMax: 6144,
            status: 'idle',
            lastPlayed: 'Today',
            playTimeMinutes: 480,
            isFavorite: true,
            background: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
            icon: '⚡',
          },
          {
            id: 'inst-vanilla-121',
            name: 'Vanilla 1.21.4 Pure',
            version: '1.21.4',
            loader: 'vanilla',
            ramMin: 1024,
            ramMax: 4096,
            status: 'idle',
            lastPlayed: 'Yesterday',
            playTimeMinutes: 120,
            isFavorite: true,
            background: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
            icon: '💎',
          },
          {
            id: 'inst-forge-120',
            name: 'Create & Magic 1.20.1',
            version: '1.20.1',
            loader: 'forge',
            loaderVersion: '47.3.0',
            ramMin: 4096,
            ramMax: 8192,
            status: 'idle',
            lastPlayed: '3 days ago',
            playTimeMinutes: 940,
            isFavorite: false,
            background: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
            icon: '⚙️',
          },
          {
            id: 'inst-pvp-189',
            name: 'Hypixel PvP 1.8.9',
            version: '1.8.9',
            loader: 'fabric',
            ramMin: 1024,
            ramMax: 3072,
            status: 'idle',
            lastPlayed: '1 week ago',
            playTimeMinutes: 3400,
            isFavorite: false,
            background: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
            icon: '⚔️',
          },
        ];

        for (const def of defaults) {
          this.saveInstance(def);
          list.push(def);
        }
      }
    } catch (e) {
      console.error('Error loading instances:', e);
    }
    return list;
  }

  public saveInstance(instance: any): any {
    const dir = this.getInstanceDir(instance.id);
    const jsonPath = path.join(dir, 'instance.json');
    instance.gameDir = dir;
    fs.writeFileSync(jsonPath, JSON.stringify(instance, null, 2), 'utf-8');
    return instance;
  }

  public deleteInstance(instanceId: string): boolean {
    const dir = path.join(this.instancesDir, instanceId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    }
    return false;
  }
}
