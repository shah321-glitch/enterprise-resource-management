# ERSMS Design System & Frontend Architecture

The **Enterprise Resource & Subscription Management System (ERSMS)** design system provides accessible, robust, and responsive UI components for desktop and mobile devices.

---

## 1. Design Tokens & Theming Architecture

The system uses CSS Custom Properties in HSL format compatible with Tailwind CSS and shadcn/ui conventions.

### Theme Variables & Semantic Tokens

Both light and dark themes maintain WCAG 2.1 AA contrast standards:

| Semantic Token | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `--background` | `210 40% 98%` | `222.2 84% 4.9%` | Primary application canvas background |
| `--foreground` | `222.2 84% 4.9%` | `210 40% 98%` | Primary high-contrast text color |
| `--card` | `0 0% 100%` | `222.2 84% 6.9%` | Surface color for cards, panels, and modals |
| `--card-foreground` | `222.2 84% 4.9%` | `210 40% 98%` | Text on card surfaces |
| `--primary` | `221.2 83.2% 53.3%` | `217.2 91.2% 59.8%` | Primary brand accent and call-to-action buttons |
| `--primary-foreground` | `210 40% 98%` | `222.2 47.4% 11.2%` | Text and icons placed on primary surfaces |
| `--secondary` | `210 40% 96.1%` | `217.2 32.6% 17.5%` | Subtle background fills, chips, and secondary buttons |
| `--muted` | `210 40% 96.1%` | `217.2 32.6% 17.5%` | Inactive tab backgrounds and placeholder surfaces |
| `--muted-foreground` | `215.4 16.3% 46.9%` | `215 20.2% 65.1%` | Secondary descriptions, captions, and timestamps |
| `--border` | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` | Structural borders and dividers |
| `--input` | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` | Form field outlines and borders |
| `--ring` | `221.2 83.2% 53.3%` | `224.3 76.3% 48%` | Accessible keyboard focus-visible rings |
| `--destructive` | `0 84.2% 60.2%` | `0 62.8% 30.6%` | Destructive operations and critical alerts |

### Theme Persistence & Detection

- **Context Provider**: [`ThemeProvider`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/context/ThemeContext.jsx)
- **Persistence**: Safely saved to `localStorage` under key `ersms_theme` with safe error-handling.
- **Auto-Detection**: Falls back to `window.matchMedia('(prefers-color-scheme: dark)')` when unconfigured.
- **DOM Application**: Applies or removes the `dark` class on `document.documentElement`.

---

## 2. Layout & Shell Architecture

### Responsive Layout Composition

[`DashboardLayout`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/components/layout/DashboardLayout.jsx) coordinates three primary regions:

```
┌─────────────────────────────────────────────────────────────────┐
│                           Header                                │
│ [Menu] Breadcrumbs / Title    [Search ⌘K]   [Theme] [Bell] [User]│
├───────────────┬─────────────────────────────────────────────────┤
│               │                                                 │
│               │                    Main Canvas                  │
│    Sidebar    │                                                 │
│  Navigation   │               <Outlet /> Content                │
│  (Desktop:    │             (max-w-7xl centered)                │
│    w-64;      │                                                 │
│   Mobile:     │                                                 │
│   drawer)     │                                                 │
│               │                                                 │
└───────────────┴─────────────────────────────────────────────────┘
```

### Navigation Modules

The [`Sidebar`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/components/layout/Sidebar.jsx) provides access to all 12 enterprise modules:

1. **Dashboard** (`/`): High-level KPI cards, expenditure trends, renewal warnings, and quota overviews.
2. **Resources** (`/resources`): Inventory of cloud clusters, SaaS tools, and licenses.
3. **Subscriptions** (`/subscriptions`): Recurring vendor contracts, billing cadences, and renewal history.
4. **Projects** (`/projects`): Strategic project containers, authorized budgets, and assigned resources.
5. **Allocations** (`/allocations`): Cross-project resource distribution with percentage validation.
6. **API Credits** (`/api-credits`): LLM token tracking, HTTP request quotas, and sync telemetry.
7. **Expenses** (`/expenses`): Verified paid invoice actuals vs. subscription cost forecasts.
8. **Reports** (`/reports`): Export CSV generators for inventory, expenses, and compliance.
9. **Users** (`/users`): RBAC administration, role promotion, and activation lifecycle (*Admin*).
10. **Notifications** (`/notifications`): Centralized alert center with severity filtering.
11. **Audit Logs** (`/audit-logs`): Immutable event trail tracking security actions (*Admin*).
12. **Settings** (`/settings`): Profile details, theme selectors, and system health status.

### Mobile Navigation

- On small viewports (`< 1024px`), the sidebar collapses into a slide-over drawer with a backdrop blur overlay.
- Toggling the hamburger icon in the [`Header`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/components/layout/Header.jsx) opens the drawer.
- The drawer automatically closes upon navigating to any route, pressing `Escape`, or tapping the backdrop.

---

## 3. UI Primitives Catalog

### 1. `Button` ([`Button.jsx`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/components/ui/Button.jsx))
- **Variants**: `primary` / `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`.
- **Sizes**: `sm` (h-8), `md` (h-9), `lg` (h-11), `icon` (h-9 w-9).
- **States**: `isLoading` with animated SVG spinner, `disabled` with pointer-events lock, active tactile feedback (`active:scale-[0.98]`).

### 2. `Input` ([`Input.jsx`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/components/ui/Input.jsx))
- **Features**: Label, helper text, error messages, prefix icons (`startIcon`), suffix icons (`endIcon`).
- **Accessibility**: Automatic `id`/`htmlFor` association, `aria-invalid`, and focus-visible rings.

### 3. `Select` ([`Select.jsx`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/components/ui/Select.jsx))
- **Features**: Accessible native `<select>` with custom chevron dropdown indicator and label/error support.

### 4. `Modal` ([`Modal.jsx`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/components/ui/Modal.jsx)) & `ConfirmDialog` ([`ConfirmDialog.jsx`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/components/ui/ConfirmDialog.jsx))
- **Features**: Backdrop blur, automatic body scroll lock (`document.body.style.overflow = 'hidden'`), `Escape` key dismissal, customizable action buttons.

### 5. `Dropdown` ([`Dropdown.jsx`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/components/ui/Dropdown.jsx))
- **Features**: Click-outside listener, keyboard escape handling, alignment (`left`, `right`, `center`), dropdown items with icon slots and dividers.

### 6. `Pagination` ([`Pagination.jsx`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/components/ui/Pagination.jsx))
- **Features**: Page range computation with ellipsis (`...`), first/previous/next/last buttons, entry summary (`Showing 1-10 of 48`).

### 7. `Badge` ([`Badge.jsx`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/components/ui/Badge.jsx))
- **Variants**: `default`, `secondary`, `success`, `warning`, `destructive`, `outline`.
- **Indicator**: Optional `dot` prop rendering a live pulsing status indicator.

### 8. `Skeleton` ([`Skeleton.jsx`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/components/ui/Skeleton.jsx))
- **Variants**: Standard `Skeleton`, `TableSkeleton` (configurable rows and columns), and `StatCardSkeleton` for metric cards.

### 9. `EmptyState` ([`EmptyState.jsx`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/components/ui/EmptyState.jsx)) & `ErrorState` ([`ErrorState.jsx`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/components/ui/ErrorState.jsx))
- **Features**: Clear visual icons, title, description, and action button slots (e.g. "Add Resource" or "Try Again").

### 10. `PageHeader` ([`PageHeader.jsx`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/components/ui/PageHeader.jsx))
- **Features**: Dynamic breadcrumb trail, page title, status badge, description, and action button bar.

---

## 4. Toast Notification System

Managed via [`ToastProvider`](file:///c:/Users/shahl/OneDrive/Desktop/enterprise-resource-management/client/src/context/ToastContext.jsx) and the `useToast()` hook:

```jsx
import { useToast } from '../context/ToastContext.jsx';

const MyComponent = () => {
  const toast = useToast();

  const handleAction = () => {
    toast.success('Resource allocated successfully');
    toast.error('Failed to update contract');
    toast.warning('Token quota threshold reached');
    toast.info('Session refreshed');
  };
};
```

- **Features**: Stacked floating toasts at bottom-right, auto-dismissal after 4 seconds (6s for errors), manual dismissal button, and accessible `role="alert"` announcements.

---

## 5. Command Palette (`SearchModal`)

- **Shortcut**: `Ctrl+K` (Windows/Linux) or `Cmd+K` (macOS).
- **Navigation**: Arrow key up/down selection, `Enter` to jump, `Escape` to close.
- **Search Scope**: Indexes all modules with keyword aliases (e.g., typing "token" matches *API Credits*, "invoice" matches *Expenses*).

---

## 6. Verification & Quality Standards

- **ESLint**: 0 syntax or rule errors (`npm run lint`).
- **Client Tests**: 9/9 design system and shell unit tests passing (`npm test --workspace=client`).
- **Server Tests**: 27/27 integration and RBAC tests passing (`npm test --workspace=server`).
- **Production Bundle**: Minified and optimized with Vite (`npm run build`).

