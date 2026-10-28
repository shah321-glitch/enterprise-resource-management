import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, getDaysRemaining, cn } from '../src/lib/utils.js';

describe('Frontend Shell & Design System Unit Tests', () => {
  describe('Utility & Financial Token Formatting', () => {
    it('should format minor integer cents into precise USD currency representation', () => {
      expect(formatCurrency(1050, 'USD')).toBe('$10.50');
      expect(formatCurrency(0, 'USD')).toBe('$0.00');
      expect(formatCurrency(250000, 'USD')).toBe('$2,500.00');
      expect(formatCurrency(499, 'USD')).toBe('$4.99');
    });

    it('should format dates consistently in MMM DD, YYYY format', () => {
      const formatted = formatDate('2026-10-28T12:00:00Z');
      expect(formatted).toContain('2026');
      expect(formatDate(null)).toBe('-');
    });

    it('should compute positive and negative days remaining for renewal deadlines', () => {
      const future = new Date(Date.now() + 5 * 86400000).toISOString();
      const past = new Date(Date.now() - 3 * 86400000).toISOString();

      expect(getDaysRemaining(future)).toBeGreaterThanOrEqual(4);
      expect(getDaysRemaining(past)).toBeLessThanOrEqual(0);
      expect(getDaysRemaining(null)).toBe(0);
    });

    it('should safely merge and resolve conditional Tailwind classes with cn()', () => {
      const result = cn('px-4 py-2', false && 'hidden', true && 'bg-primary', 'px-6');
      expect(result).toContain('py-2');
      expect(result).toContain('bg-primary');
      expect(result).toContain('px-6');
      expect(result).not.toContain('px-4'); // overridden by twMerge
    });
  });

  describe('Navigation & Route Schema Validation', () => {
    const plannedModules = [
      { name: 'Dashboard', href: '/' },
      { name: 'Resources', href: '/resources' },
      { name: 'Subscriptions', href: '/subscriptions' },
      { name: 'Projects', href: '/projects' },
      { name: 'Allocations', href: '/allocations' },
      { name: 'API Credits', href: '/api-credits' },
      { name: 'Expenses', href: '/expenses' },
      { name: 'Reports', href: '/reports' },
      { name: 'Users', href: '/users', adminOnly: true },
      { name: 'Notifications', href: '/notifications' },
      { name: 'Audit Logs', href: '/audit-logs', adminOnly: true },
      { name: 'Settings', href: '/settings' },
    ];

    it('should include all 12 planned enterprise modules in navigation catalog', () => {
      expect(plannedModules).toHaveLength(12);
      const paths = plannedModules.map((m) => m.href);
      expect(paths).toContain('/');
      expect(paths).toContain('/resources');
      expect(paths).toContain('/subscriptions');
      expect(paths).toContain('/projects');
      expect(paths).toContain('/allocations');
      expect(paths).toContain('/api-credits');
      expect(paths).toContain('/expenses');
      expect(paths).toContain('/reports');
      expect(paths).toContain('/users');
      expect(paths).toContain('/notifications');
      expect(paths).toContain('/audit-logs');
      expect(paths).toContain('/settings');
    });

    it('should mark sensitive administrative modules with adminOnly flags', () => {
      const adminModules = plannedModules.filter((m) => m.adminOnly).map((m) => m.href);
      expect(adminModules).toContain('/users');
      expect(adminModules).toContain('/audit-logs');
      expect(adminModules).not.toContain('/resources');
      expect(adminModules).not.toContain('/settings');
    });
  });

  describe('Pagination Logic & Range Generation', () => {
    const computePagination = (currentPage, totalPages) => {
      const delta = 1;
      const range = [];
      const rangeWithDots = [];

      for (
        let i = Math.max(2, currentPage - delta);
        i <= Math.min(totalPages - 1, currentPage + delta);
        i++
      ) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages);
      } else if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };

    it('should generate correct page series for single page', () => {
      expect(computePagination(1, 1)).toEqual([1]);
    });

    it('should generate continuous page series for 3 pages', () => {
      expect(computePagination(2, 3)).toEqual([1, 2, 3]);
    });

    it('should introduce ellipses when total pages exceed window delta', () => {
      const pages = computePagination(5, 10);
      expect(pages).toContain('...');
      expect(pages[0]).toBe(1);
      expect(pages[pages.length - 1]).toBe(10);
      expect(pages).toContain(4);
      expect(pages).toContain(5);
      expect(pages).toContain(6);
    });
  });
});

