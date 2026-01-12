import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from '../button';

describe('Button Touch Targets (WCAG 2.5.5 Level AAA)', () => {
  // Helper to get computed touch target classes
  const getTouchTargetClasses = (element: HTMLElement): string[] => {
    return Array.from(element.classList).filter(cls =>
      cls.includes('[@media(pointer:coarse)]') ||
      cls.includes('h-') ||
      cls.includes('w-')
    );
  };

  describe('Icon button variants', () => {
    it('icon-xs variant has 44px touch targets on touch devices', () => {
      const { container } = render(<Button size="icon-xs">Icon</Button>);
      const button = container.querySelector('button');

      expect(button).not.toBeNull();
      const classes = button!.className;

      // Should have base size h-6 w-6 (24px)
      expect(classes).toContain('h-6');
      expect(classes).toContain('w-6');

      // Should have touch device override to h-11 w-11 (44px)
      expect(classes).toMatch(/\[@media\(pointer:coarse\)\]:h-11/);
      expect(classes).toMatch(/\[@media\(pointer:coarse\)\]:w-11/);
    });

    it('icon-sm variant has 44px touch targets on touch devices', () => {
      const { container } = render(<Button size="icon-sm">Icon</Button>);
      const button = container.querySelector('button');

      expect(button).not.toBeNull();
      const classes = button!.className;

      // Should have base size h-8 w-8 (32px)
      expect(classes).toContain('h-8');
      expect(classes).toContain('w-8');

      // Should have touch device override to h-11 w-11 (44px)
      expect(classes).toMatch(/\[@media\(pointer:coarse\)\]:h-11/);
      expect(classes).toMatch(/\[@media\(pointer:coarse\)\]:w-11/);
    });

    it('icon variant has 44px touch targets on touch devices', () => {
      const { container } = render(<Button size="icon">Icon</Button>);
      const button = container.querySelector('button');

      expect(button).not.toBeNull();
      const classes = button!.className;

      // Should have base size h-10 w-10 (40px)
      expect(classes).toContain('h-10');
      expect(classes).toContain('w-10');

      // Should have touch device override to h-11 w-11 (44px)
      expect(classes).toMatch(/\[@media\(pointer:coarse\)\]:h-11/);
      expect(classes).toMatch(/\[@media\(pointer:coarse\)\]:w-11/);
    });
  });

  describe('Regular button size variants', () => {
    it('xs variant has 44px minimum height on touch devices', () => {
      const { container } = render(<Button size="xs">Extra Small</Button>);
      const button = container.querySelector('button');

      expect(button).not.toBeNull();
      const classes = button!.className;

      // Should have base size h-7 (28px)
      expect(classes).toContain('h-7');

      // Should have touch device override to h-11 (44px)
      expect(classes).toMatch(/\[@media\(pointer:coarse\)\]:h-11/);
    });

    it('sm variant has 44px minimum height on touch devices', () => {
      const { container } = render(<Button size="sm">Small</Button>);
      const button = container.querySelector('button');

      expect(button).not.toBeNull();
      const classes = button!.className;

      // Should have base size h-8 (32px)
      expect(classes).toContain('h-8');

      // Should have touch device override to h-11 (44px)
      expect(classes).toMatch(/\[@media\(pointer:coarse\)\]:h-11/);
    });

    it('md variant has 44px minimum height on touch devices', () => {
      const { container } = render(<Button size="md">Medium</Button>);
      const button = container.querySelector('button');

      expect(button).not.toBeNull();
      const classes = button!.className;

      // Should have base size h-10 (40px)
      expect(classes).toContain('h-10');

      // Should have touch device override to h-11 (44px)
      expect(classes).toMatch(/\[@media\(pointer:coarse\)\]:h-11/);
    });

    it('compact variant has 44px minimum height on touch devices', () => {
      const { container } = render(<Button size="compact">Compact</Button>);
      const button = container.querySelector('button');

      expect(button).not.toBeNull();
      const classes = button!.className;

      // Should have base size h-10 (40px)
      expect(classes).toContain('h-10');

      // Should have touch device override to h-11 (44px)
      expect(classes).toMatch(/\[@media\(pointer:coarse\)\]:h-11/);
    });

    it('lg variant already meets 44px minimum (48px)', () => {
      const { container } = render(<Button size="lg">Large</Button>);
      const button = container.querySelector('button');

      expect(button).not.toBeNull();
      const classes = button!.className;

      // Should have h-12 (48px) which already meets 44px minimum
      expect(classes).toContain('h-12');

      // No need for touch device override on already large sizes
      expect(classes).not.toMatch(/\[@media\(pointer:coarse\)\]:h-11/);
    });

    it('xl variant already meets 44px minimum (56px)', () => {
      const { container } = render(<Button size="xl">Extra Large</Button>);
      const button = container.querySelector('button');

      expect(button).not.toBeNull();
      const classes = button!.className;

      // Should have h-14 (56px) which already meets 44px minimum
      expect(classes).toContain('h-14');

      // No need for touch device override on already large sizes
      expect(classes).not.toMatch(/\[@media\(pointer:coarse\)\]:h-11/);
    });
  });

  describe('WCAG 2.5.5 compliance verification', () => {
    it('all icon variants meet 44x44px minimum on touch devices', () => {
      const iconSizes = ['icon-xs', 'icon-sm', 'icon'] as const;

      iconSizes.forEach(size => {
        const { container } = render(<Button size={size}>Icon</Button>);
        const button = container.querySelector('button');

        expect(button, `${size} button should exist`).not.toBeNull();
        const classes = button!.className;

        // All icon variants should have touch overrides to 44x44px
        expect(classes, `${size} should have touch height override`).toMatch(/\[@media\(pointer:coarse\)\]:h-11/);
        expect(classes, `${size} should have touch width override`).toMatch(/\[@media\(pointer:coarse\)\]:w-11/);
      });
    });

    it('all small button variants meet 44px minimum height on touch devices', () => {
      const smallSizes = ['xs', 'sm', 'md', 'compact'] as const;

      smallSizes.forEach(size => {
        const { container } = render(<Button size={size}>Button</Button>);
        const button = container.querySelector('button');

        expect(button, `${size} button should exist`).not.toBeNull();
        const classes = button!.className;

        // All small variants should have touch height override to 44px
        expect(classes, `${size} should have touch height override`).toMatch(/\[@media\(pointer:coarse\)\]:h-11/);
      });
    });

    it('uses @media(pointer:coarse) for accurate touch device detection', () => {
      const { container } = render(<Button size="icon-xs">Icon</Button>);
      const button = container.querySelector('button');

      expect(button).not.toBeNull();
      const classes = button!.className;

      // Should use pointer:coarse media query, not just screen width
      expect(classes).toMatch(/\[@media\(pointer:coarse\)\]/);

      // Should NOT use screen width based media queries like @media(max-width:...)
      expect(classes).not.toMatch(/@media\(max-width/);
      expect(classes).not.toMatch(/@media\(min-width/);
    });
  });

  describe('Visual regression prevention', () => {
    it('maintains original desktop sizes for non-touch devices', () => {
      // icon-xs should be 24x24px on desktop
      const { container: xs } = render(<Button size="icon-xs">XS</Button>);
      expect(xs.querySelector('button')!.className).toContain('h-6');
      expect(xs.querySelector('button')!.className).toContain('w-6');

      // icon-sm should be 32x32px on desktop
      const { container: sm } = render(<Button size="icon-sm">SM</Button>);
      expect(sm.querySelector('button')!.className).toContain('h-8');
      expect(sm.querySelector('button')!.className).toContain('w-8');

      // icon should be 40x40px on desktop
      const { container: md } = render(<Button size="icon">MD</Button>);
      expect(md.querySelector('button')!.className).toContain('h-10');
      expect(md.querySelector('button')!.className).toContain('w-10');
    });

    it('does not add unnecessary touch overrides to already large buttons', () => {
      // lg (48px) and xl (56px) already meet 44px minimum
      const { container: lg } = render(<Button size="lg">Large</Button>);
      const { container: xl } = render(<Button size="xl">XL</Button>);

      const lgClasses = lg.querySelector('button')!.className;
      const xlClasses = xl.querySelector('button')!.className;

      // These should NOT have touch overrides since they already meet minimum
      expect(lgClasses).not.toMatch(/\[@media\(pointer:coarse\)\]:h-11/);
      expect(xlClasses).not.toMatch(/\[@media\(pointer:coarse\)\]:h-11/);
    });
  });
});
