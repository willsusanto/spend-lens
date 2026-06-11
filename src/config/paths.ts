export const paths = {
  home: {
    getHref: () => '/',
  },

  transactions: {
    getHref: () => '/transactions',
  },

  imports: {
    getHref: () => '/imports',
  },

  settings: {
    getHref: () => '/settings',
  },
} as const;
