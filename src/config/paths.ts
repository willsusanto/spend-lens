export const paths = {
  home: {
    getHref: () => '/',
  },

  transactions: {
    getHref: () => '/transactions',
    getDetailHref: (transactionId: string) => `/transactions/${transactionId}`,
  },

  imports: {
    getHref: () => '/imports',
    getReviewHref: (importId: string) => `/imports/${importId}/review`,
  },

  statistics: {
    getHref: () => '/statistics',
  },

  settings: {
    getHref: () => '/settings',
  },
} as const;
