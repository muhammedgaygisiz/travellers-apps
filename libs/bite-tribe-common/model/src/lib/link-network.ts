/**
 * The networks a restaurant can link to (GitHub issue #2224), in the order
 * the editors offer them. X replaced Twitter and TikTok joined the list.
 */
export const LINK_NETWORKS = [
  'website',
  'instagram',
  'facebook',
  'tiktok',
  'x',
  'linkedin',
] as const;

export type LinkNetwork = (typeof LINK_NETWORKS)[number];

/**
 * The network a stored link means. Links saved before #2224 may still say
 * `twitter`, which is X now; anything else unknown is left as it is.
 */
export const linkNetworkOf = (network: string | undefined): string =>
  network === 'twitter' ? 'x' : (network ?? '');

const NAMES: Record<LinkNetwork, string> = {
  website: 'Website',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  x: 'X',
  linkedin: 'LinkedIn',
};

const isLinkNetwork = (network: string): network is LinkNetwork =>
  (LINK_NETWORKS as readonly string[]).includes(network);

/**
 * How a network is written: its own spelling for a brand ("TikTok",
 * "LinkedIn"), where title case got it wrong.
 */
export const linkNetworkName = (network: string | undefined): string => {
  const known = linkNetworkOf(network);

  return isLinkNetwork(known)
    ? NAMES[known]
    : known.charAt(0).toUpperCase() + known.slice(1);
};

/** The Ionicon a link shows with; a website has no logo, so a globe. */
export const linkNetworkIcon = (network: string | undefined): string => {
  const known = linkNetworkOf(network);

  return known === 'website' ? 'globe-outline' : `logo-${known}`;
};
