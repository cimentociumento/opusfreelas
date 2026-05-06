# Discussion Log: Phase 3

## Session: 2026-04-28

### Topic: Accessibility & Search UX
- **Context:** The platform targets the AMAUC region, which has a significant elderly population.
- **Decision:** Use predefined categories and a list-first view instead of complex maps or free-text search.
- **Rationale:** Minimize typing effort and cognitive load. Categorized search provides a "tappable" interface which is more intuitive for older users.

### Topic: Search Algorithm
- **Context:** How to match contractors with providers.
- **Decision:** Categorized Discovery.
- **Rationale:** Aligns with the UI decision. Providers will be discoverable based on the categories they offer and their proximity via PostGIS.

### Topic: Geographic Constraints
- **Context:** Ensuring results are local to AMAUC.
- **Decision:** Keep the municipality and radius filters used in Phase 2.
- **Rationale:** Consistency in the "local first" value proposition.
