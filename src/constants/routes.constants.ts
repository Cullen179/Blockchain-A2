// Application routes constants
export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  
  // Protected routes
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  
  // Admin routes
  ADMIN: {
    ROOT: '/admin',
    USERS: '/admin/users',
    COMPANIES: '/admin/companies',
    SETTINGS: '/admin/settings',
  },
  
  // Feature-specific routes
  COMPANIES: {
    ROOT: '/companies',
    LIST: '/companies',
    CREATE: '/companies/new',
    DETAIL: (id: string) => `/companies/${id}`,
    EDIT: (id: string) => `/companies/${id}/edit`,
  },
  
  // API routes (for Next.js API routes)
  API: {
    AUTH: '/api/auth',
    USERS: '/api/users',
    COMPANIES: '/api/companies',
  },
} as const;

export const NAVIGATION_ITEMS = [
  {
    label: 'Dashboard',
    href: ROUTES.DASHBOARD,
    icon: 'dashboard',
    protected: true,
  },
  {
    label: 'Companies',
    href: ROUTES.COMPANIES.ROOT,
    icon: 'building',
    protected: true,
  },
  {
    label: 'Profile',
    href: ROUTES.PROFILE,
    icon: 'user',
    protected: true,
  },
  {
    label: 'Settings',
    href: ROUTES.SETTINGS,
    icon: 'settings',
    protected: true,
  },
] as const;

export const BREADCRUMB_LABELS = {
  [ROUTES.HOME]: 'Home',
  [ROUTES.DASHBOARD]: 'Dashboard',
  [ROUTES.PROFILE]: 'Profile',
  [ROUTES.SETTINGS]: 'Settings',
  [ROUTES.COMPANIES.ROOT]: 'Companies',
  [ROUTES.COMPANIES.CREATE]: 'New Company',
} as const;
