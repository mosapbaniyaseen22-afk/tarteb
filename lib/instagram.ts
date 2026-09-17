export function instagramProfileUrl(handle: string) {
  const username = handle.replace(/^@/, '');
  return `https://www.instagram.com/${username}/`;
}

export function instagramDmUrl(handle: string) {
  const username = handle.replace(/^@/, '');
  return `https://ig.me/m/${username}`;
}

export const INSTAGRAM_PAGES = [
  {
    href: instagramProfileUrl('tarteeb888'),
    handle: '@tarteeb888',
    username: 'tarteeb888',
    label: 'ترتيب',
  },
  {
    href: instagramProfileUrl('dev_ah7'),
    handle: '@dev_ah7',
    username: 'dev_ah7',
    label: 'المطوّر',
  },
] as const;
