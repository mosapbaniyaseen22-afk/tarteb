'use client';

import html2canvas from 'html2canvas';

export type LabibScreenCapture = {
  text: string;
  image: string | null;
};

function visibleText(): string {
  const root = document.querySelector('main') ?? document.body;
  return (root.innerText || '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 4500);
}

function toJpeg(source: HTMLCanvasElement, maxWidth: number, quality: number) {
  if (source.width <= maxWidth) return source.toDataURL('image/jpeg', quality);
  const width = maxWidth;
  const height = Math.max(1, Math.round((source.height * maxWidth) / source.width));
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  if (!ctx) return source.toDataURL('image/jpeg', quality);
  ctx.drawImage(source, 0, 0, width, height);
  return out.toDataURL('image/jpeg', quality);
}

async function takeScreenshot(): Promise<string | null> {
  const root = (document.querySelector('main') as HTMLElement | null) ?? document.body;
  const canvas = await html2canvas(root, {
    scale: 0.7,
    useCORS: true,
    logging: false,
    backgroundColor: '#f8fafc',
    foreignObjectRendering: false,
    ignoreElements: (element) => Boolean(element.closest('[data-labib-chat]')),
    width: Math.min(root.clientWidth || window.innerWidth, 1200),
    height: Math.min(root.scrollHeight || window.innerHeight, Math.round(window.innerHeight * 1.35)),
    windowWidth: window.innerWidth,
  });
  let image = toJpeg(canvas, 880, 0.52);
  if (image.length > 380_000) image = toJpeg(canvas, 720, 0.4);
  if (image.length > 480_000) return null;
  return image;
}

export function readLabibScreenText() {
  if (typeof document === 'undefined') return '';
  return visibleText();
}

export async function captureLabibScreen(): Promise<LabibScreenCapture> {
  const text = visibleText();
  try {
    const image = await Promise.race([
      takeScreenshot(),
      new Promise<null>((resolve) => {
        window.setTimeout(() => resolve(null), 2800);
      }),
    ]);
    return { text, image };
  } catch {
    return { text, image: null };
  }
}
