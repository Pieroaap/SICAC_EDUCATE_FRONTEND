export type WallTextSegment = { value: string; href?: string };

const urlPattern = /(https?:\/\/[^\s<]+)/gi;

export function parseWallText(text: string): WallTextSegment[] {
  return text.split(urlPattern).filter(Boolean).map((value) => {
    if (!/^https?:\/\//i.test(value)) return { value };
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? { value, href: url.href } : { value };
    } catch {
      return { value };
    }
  });
}
