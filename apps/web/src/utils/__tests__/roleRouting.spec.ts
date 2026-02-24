import { getHighestPriorityRole, getDashboardRoute, DASHBOARD_ROUTES } from '../roleRouting';

describe('roleRouting utilities', () => {
  describe('getHighestPriorityRole', () => {
    it('returns null for undefined roles', () => {
      expect(getHighestPriorityRole(undefined)).toBeNull();
    });

    it('returns null for empty roles array', () => {
      expect(getHighestPriorityRole([])).toBeNull();
    });

    it('returns null for unrecognized roles', () => {
      expect(getHighestPriorityRole(['UnknownRole', 'AnotherUnknown'])).toBeNull();
    });

    it('returns admin for Admin role', () => {
      expect(getHighestPriorityRole(['Admin'])).toBe('admin');
    });

    it('returns admin for SiteOwner role (maps to admin)', () => {
      expect(getHighestPriorityRole(['SiteOwner'])).toBe('admin');
    });

    it('returns support for Support role', () => {
      expect(getHighestPriorityRole(['Support'])).toBe('support');
    });

    it('returns operator for SaccoAdmin role', () => {
      expect(getHighestPriorityRole(['SaccoAdmin'])).toBe('operator');
    });

    it('returns business for BusinessOwner role', () => {
      expect(getHighestPriorityRole(['BusinessOwner'])).toBe('business');
    });

    it('returns rider for Rider role', () => {
      expect(getHighestPriorityRole(['Rider'])).toBe('rider');
    });

    it('returns rider for Driver role (maps to rider)', () => {
      expect(getHighestPriorityRole(['Driver'])).toBe('rider');
    });

    it('returns admin when user has Admin and other roles (Admin is highest priority)', () => {
      expect(getHighestPriorityRole(['Rider', 'Admin', 'Support'])).toBe('admin');
    });

    it('returns admin when user has SiteOwner and Admin (both map to admin)', () => {
      expect(getHighestPriorityRole(['Admin', 'SiteOwner'])).toBe('admin');
    });

    it('returns support when user has Support and Rider (Support is higher priority)', () => {
      expect(getHighestPriorityRole(['Rider', 'Support'])).toBe('support');
    });

    it('returns operator when user has SaccoAdmin and BusinessOwner', () => {
      expect(getHighestPriorityRole(['BusinessOwner', 'SaccoAdmin'])).toBe('operator');
    });

    it('returns business when user has BusinessOwner and Rider', () => {
      expect(getHighestPriorityRole(['Rider', 'BusinessOwner'])).toBe('business');
    });

    it('ignores unrecognized roles and picks highest from recognized ones', () => {
      expect(getHighestPriorityRole(['UnknownRole', 'Rider', 'AnotherUnknown'])).toBe('rider');
    });

    it('handles mixed recognized and unrecognized roles', () => {
      expect(getHighestPriorityRole(['UnknownRole', 'Support', 'Rider'])).toBe('support');
    });
  });

  describe('getDashboardRoute', () => {
    it('returns rider route as default for undefined roles', () => {
      expect(getDashboardRoute(undefined)).toBe('/dashboard/rider');
    });

    it('returns rider route as default for empty roles', () => {
      expect(getDashboardRoute([])).toBe('/dashboard/rider');
    });

    it('returns rider route as default for unrecognized roles', () => {
      expect(getDashboardRoute(['UnknownRole'])).toBe('/dashboard/rider');
    });

    it('returns admin route for Admin role', () => {
      expect(getDashboardRoute(['Admin'])).toBe(DASHBOARD_ROUTES.admin);
      expect(getDashboardRoute(['Admin'])).toBe('/dashboard/admin');
    });

    it('returns support route for Support role', () => {
      expect(getDashboardRoute(['Support'])).toBe(DASHBOARD_ROUTES.support);
      expect(getDashboardRoute(['Support'])).toBe('/dashboard/support');
    });

    it('returns operator route for SaccoAdmin role', () => {
      expect(getDashboardRoute(['SaccoAdmin'])).toBe(DASHBOARD_ROUTES.operator);
      expect(getDashboardRoute(['SaccoAdmin'])).toBe('/dashboard/operator');
    });

    it('returns business route for BusinessOwner role', () => {
      expect(getDashboardRoute(['BusinessOwner'])).toBe(DASHBOARD_ROUTES.business);
      expect(getDashboardRoute(['BusinessOwner'])).toBe('/dashboard/business');
    });

    it('returns rider route for Rider role', () => {
      expect(getDashboardRoute(['Rider'])).toBe(DASHBOARD_ROUTES.rider);
      expect(getDashboardRoute(['Rider'])).toBe('/dashboard/rider');
    });

    it('returns highest priority route when user has multiple roles', () => {
      expect(getDashboardRoute(['Rider', 'Admin', 'Support'])).toBe('/dashboard/admin');
      expect(getDashboardRoute(['BusinessOwner', 'Support'])).toBe('/dashboard/support');
    });
  });
});
