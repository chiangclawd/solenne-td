export class AssetLoader<K extends string = string> {
  private readonly images = new Map<K, HTMLImageElement>();

  async load(manifest: Record<K, string>): Promise<void> {
    const entries = Object.entries(manifest) as [K, string][];
    await Promise.all(entries.map(([name, url]) => this.loadOne(name, url)));
  }

  get(name: K): HTMLImageElement {
    const img = this.images.get(name);
    if (!img) throw new Error(`Asset not loaded: ${name}`);
    return img;
  }

  private loadOne(name: K, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(name, img);
        resolve();
      };
      img.onerror = () => reject(new Error(`Failed to load asset "${name}" at ${url}`));
      img.src = url;
    });
  }
}
