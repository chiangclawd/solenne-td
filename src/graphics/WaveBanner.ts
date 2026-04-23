/**
 * Full-screen wave start banner — slides in from the left, holds, slides out right.
 * Lifecycle: ~1.8s total (in 0.3 + hold 1.0 + out 0.5).
 */

type Ctx = CanvasRenderingContext2D;

export interface BannerState {
  active: boolean;
  t: number;           // seconds since show()
  duration: number;    // total seconds
  title: string;       // e.g., "WAVE 1"
  subtitle: string;    // e.g., "草原哨站 · 共 6 波"
  accent: string;      // color bar
}

export function makeBanner(): BannerState {
  return { active: false, t: 0, duration: 1.8, title: '', subtitle: '', accent: '#ffd166' };
}

export function showBanner(st: BannerState, title: string, subtitle: string, accent = '#ffd166'): void {
  st.active = true;
  st.t = 0;
  st.title = title;
  st.subtitle = subtitle;
  st.accent = accent;
}

export function updateBanner(st: BannerState, dt: number): void {
  if (!st.active) return;
  st.t += dt;
  if (st.t >= st.duration) st.active = false;
}

export function renderBanner(ctx: Ctx, st: BannerState, vw: number, vh: number): void {
  if (!st.active) return;
  const dpr = window.devicePixelRatio || 1;
  const t = st.t / st.duration;

  // Phase: slide in (0..0.17), hold (0.17..0.72), slide out (0.72..1)
  let slideX = 0;
  let alpha = 1;
  if (t < 0.17) {
    // Ease out cubic from -vw to 0
    const p = t / 0.17;
    const e = 1 - Math.pow(1 - p, 3);
    slideX = (e - 1) * vw;
  } else if (t < 0.72) {
    slideX = 0;
  } else {
    const p = (t - 0.72) / 0.28;
    const e = Math.pow(p, 2);
    slideX = e * vw;
    alpha = 1 - p;
  }

  ctx.save();
  const bandH = 90;
  const bandY = vh * 0.38;
  ctx.translate(slideX * dpr, 0);
  ctx.globalAlpha = alpha;

  // Back band with gradient
  const g = ctx.createLinearGradient(0, bandY * dpr, 0, (bandY + bandH) * dpr);
  g.addColorStop(0, 'rgba(5, 8, 20, 0)');
  g.addColorStop(0.2, 'rgba(5, 8, 20, 0.92)');
  g.addColorStop(0.8, 'rgba(5, 8, 20, 0.92)');
  g.addColorStop(1, 'rgba(5, 8, 20, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, bandY * dpr, vw * dpr, bandH * dpr);

  // Accent stripe at top + bottom
  ctx.fillStyle = st.accent;
  ctx.fillRect(0, bandY * dpr, vw * dpr, 2 * dpr);
  ctx.fillRect(0, (bandY + bandH - 2) * dpr, vw * dpr, 2 * dpr);

  // Title
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = st.accent;
  ctx.shadowBlur = 14 * dpr;
  ctx.fillStyle = st.accent;
  ctx.font = `bold ${32 * dpr}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(st.title, (vw / 2) * dpr, (bandY + 30) * dpr);

  // Subtitle
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e4e9f0';
  ctx.font = `${12 * dpr}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(st.subtitle, (vw / 2) * dpr, (bandY + 62) * dpr);

  ctx.restore();
}
