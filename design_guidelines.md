# Design Guidelines: Accounting & Inventory Tracking System

## Design Approach

**Selected System**: Carbon Design System (IBM)

**Justification**: This is a data-intensive enterprise application requiring clear information hierarchy, efficient workflows, and consistent patterns across complex CRUD operations. Carbon excels at:
- Dense data tables with inline editing
- Multi-step workflows with clear progression
- Form-heavy interfaces with validation states
- Role-based UI variations
- Dashboard and summary views

**Key Design Principles**:
1. **Clarity Over Decoration**: Prioritize readability and scannability of data
2. **Efficiency First**: Minimize clicks for common actions, support keyboard navigation
3. **Consistent Patterns**: Reuse components across similar contexts (all CRUD screens follow same structure)
4. **Progressive Disclosure**: Show complexity only when needed (expand rows for details, collapsible sections)

---

## Core Design Elements

### A. Typography

**Font Family**: IBM Plex Sans (via Google Fonts CDN)

**Hierarchy**:
- Page Titles: text-2xl font-semibold (24px)
- Section Headers: text-lg font-semibold (18px)
- Table Headers: text-sm font-medium uppercase tracking-wide (14px)
- Body Text: text-sm (14px)
- Help Text/Labels: text-xs (12px)
- Data/Numbers: font-mono for numerical values to ensure alignment

**Weights**: Regular (400), Medium (500), Semibold (600)

---

### B. Layout System

**Spacing Units**: Use Tailwind units of **2, 4, 6, 8, 12, 16, 20** exclusively
- Micro spacing (between related elements): p-2, gap-2
- Standard spacing (form fields, card padding): p-4, p-6, gap-4
- Section spacing (between major areas): p-8, mb-12, gap-8
- Page margins: p-16 desktop, p-6 mobile

**Grid System**:
- Main content area: max-w-7xl mx-auto
- Two-column layouts (form + preview): grid-cols-1 lg:grid-cols-2 gap-8
- Data tables: Full-width with horizontal scroll on mobile
- Cards/Panels: p-6 rounded-lg border

---

### C. Component Library

#### Navigation
- **Top Navigation Bar**: Fixed header with logo, main nav links, user profile dropdown
  - Height: h-16
  - Links: Horizontal with active state indicator (border-b-2)
  - User menu: Right-aligned with avatar + role badge
  
- **Sidebar (Optional for Admin)**: Collapsible left sidebar (w-64 expanded, w-16 collapsed) for dense navigation

#### Data Tables
- **Table Structure**: 
  - Sticky header row with sort indicators
  - Row hover states for scannability
  - Inline action buttons (Edit, Delete) appear on row hover
  - Pagination controls at bottom (showing "1-10 of 100")
  - Bulk action checkbox column (first column)
  
- **Column Types**:
  - Status: Badge component with icon
  - Numbers: Right-aligned, monospaced font
  - Actions: Icon buttons (Edit, Delete, View)
  - Overflow: Truncate with tooltip on hover

#### Forms
- **Input Fields**: 
  - Label above input: text-sm font-medium mb-2
  - Input height: h-10
  - Border: border rounded
  - Focus state: ring-2 ring-offset-2
  - Error state: Red border with error message below (text-xs)
  
- **Dropdowns**: 
  - Same height as inputs (h-10)
  - With search functionality for long lists
  - "Quick Add" button next to dropdown for Supplier/ItemType
  
- **Calculated Fields**: 
  - Read-only styling with subtle background
  - Display formula hint on hover/focus

#### Cards & Panels
- **Structure**: p-6 rounded-lg border shadow-sm
- **Header**: Border bottom, pb-4 mb-4
- **Actions**: Top-right corner of card header

#### Status & Badges
- **Status Badges**: px-3 py-1 text-xs font-medium rounded-full
  - CREATED, IMPORTING_DETAILS_DONE, CUSTOMS_IN_PROGRESS, CUSTOMS_RECEIVED
  - Each status has distinct visual treatment (border variation)

#### Buttons
- **Primary**: px-4 py-2 text-sm font-medium rounded
- **Secondary**: Border variant
- **Icon Buttons**: w-8 h-8 rounded for table actions
- **Loading State**: Disabled with spinner icon

#### Multi-Step Workflow
- **Progress Indicator**: 
  - Horizontal stepper at top of workflow pages
  - Steps: Shipment → Items → Importing Details → Customs
  - Completed steps: Checkmark icon
  - Current step: Highlighted
  - Disabled steps: Muted

#### Data Summary Panels
- **Totals Display**: Grid of stat cards
  - Each card: p-4 rounded border
  - Label: text-xs uppercase tracking-wide
  - Value: text-2xl font-semibold font-mono
  - Grid: grid-cols-2 md:grid-cols-4 gap-4

#### Modals & Dialogs
- **Confirmation Dialogs**: Centered overlay with backdrop blur
  - Size: max-w-md
  - Actions: Cancel (Secondary) + Confirm (Primary/Danger)
  
- **Form Modals**: Larger for CRUD operations (max-w-2xl)

#### Empty States
- Icon + message + action button for empty tables/lists
- Center-aligned, p-12

---

### D. Responsive Behavior

- **Desktop (lg:)**: Full layout with sidebar, multi-column grids
- **Tablet (md:)**: Simplified layout, collapsible sidebar
- **Mobile (base)**: 
  - Single column stack
  - Tables scroll horizontally or convert to cards
  - Bottom navigation for primary actions
  - Simplified forms (one field per row)

---

### E. Interactions (Minimal)

- **Hover States**: Subtle background change on interactive elements
- **Focus States**: Ring indicator for keyboard navigation
- **Loading States**: Inline spinners, no full-page overlays
- **Transitions**: Short duration (150ms) for state changes only
- **NO animations** on page load, data updates, or workflow progression

---

## Images

No hero images or decorative imagery needed. This is a data-focused enterprise application. Only functional images:

1. **User Avatar Placeholders**: In navigation header (32x32px circular)
2. **Item Photos in ShipmentItems**: Thumbnail column in table (64x64px, rounded, clickable to enlarge)
3. **Empty State Icons**: Simple line icons for empty tables/lists (inline SVG from Heroicons)

Use **Heroicons** (outline variant) via CDN for all UI icons.