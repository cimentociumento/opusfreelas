# Phase 3 Context: Local Discovery

## Overview
Phase 3 focuses on enabling contractors to find providers in the AMAUC region. Based on discussion, the emphasis is on **accessibility for elderly users** and **categorized discovery**.

## Key Decisions

### 1. Discovery Mechanism: Categorized Discovery
- Discovery will be based on predefined service categories rather than pure free-text.
- This helps users who might not know exactly what to type or have difficulty typing on mobile devices.
- Providers will eventually need to "tag" themselves with these categories (to be handled in Phase 4, but discovery will support it now).

### 2. UI/UX: Accessibility & List-First
- **Elderly-Friendly:** Large buttons, high contrast, and clear icons for categories.
- **Layout:** A simple vertical list of provider cards. Maps are deferred to keep the interface intuitive.
- **Search Flow:** Category selection -> Radius/Municipality filter -> Result List.

### 3. Service Categories (Initial Set)
To be refined, but starting with common regional needs:
- Roçada / Capina
- Diarista / Faxina
- Operador de Máquina Agrícola
- Serviços Gerais / Pequenos Reparos
- Pedreiro / Servente

### 4. Technical Implementation
- **Shared Schemas:** Define `ServiceCategory` enum and `DiscoveryFilterSchema`.
- **Backend RPC:** `discovery.searchProviders` using PostGIS to find profiles that match category + location.
- **Database:** Ensure `profiles` table can store `service_categories` (likely an array of text or a join table).

## Gray Areas Resolved
- **Free-text vs Categories:** Categories chosen for accessibility.
- **List vs Map:** List chosen for simplicity.
- **Discovery Logic:** Profile-based discovery (finding providers) vs demand-based discovery (finding work). This phase focuses on **Contractors finding Providers**.

## Next Steps
- Implement `discovery.searchProviders` RPC.
- Create mobile Discovery screen with category grid.
- Update `profiles` schema to support categories.
