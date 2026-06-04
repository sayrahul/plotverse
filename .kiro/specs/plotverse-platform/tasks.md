# Implementation Plan: PlotVerse Platform

## Overview

This plan builds PlotVerse as a Next.js 14+ (App Router, TypeScript) application backed by Firebase (Firestore, Storage, Auth) and Mapbox GL JS. The strategy is to implement the pure, framework-free domain logic in `lib/*` first — each module paired with its property-based test so correctness is validated against hundreds of generated inputs before any I/O is wired. The data-access layer, routing/middleware, and Map_Renderer are built next, followed by the viewer overlay panels and the admin panel, then PWA/viewport configuration, and finally end-to-end wiring of enquiry capture and real-time inventory.

Property-based tests use fast-check (minimum 100 iterations each, exactly one property per test), and each is tagged `// Feature: plotverse-platform, Property {n}: {text}`. Tests are optional sub-tasks (marked `*`) so an MVP can skip them, but core implementation tasks are never optional.

## Tasks

- [x] 1. Project foundation and core types
  - [x] 1.1 Scaffold the Next.js App Router project
    - Create the Next.js 14+ App Router structure (`app/`, `lib/`, `components/`) with TypeScript strict mode and Tailwind CSS
    - Add the base `app/layout.tsx`, root `globals.css`, and Tailwind config
    - Configure path aliases and linting
    - _Requirements: 1.1, 1.3, 30.1_

  - [x] 1.2 Configure the testing toolchain
    - Install and configure Vitest with jsdom, fast-check, and @testing-library/react + user-event
    - Add a test setup file and scripts that run the suite once (no watch mode)
    - Add the Firebase Emulator Suite configuration scaffolding for later integration tests
    - _Requirements: 36.1_

  - [x] 1.3 Define core domain models and types
    - Create `lib/types.ts` with `Project`, `Plot`, `Zone`, `StatusGroup`, `MediaItem`, `Lead`, `LeadTimelineEntry`, `GeojsonVersion`, `PlotStatus`, `LeadStatus`, `AdminRole`, `LabelFormat`, `Unit`, and `ViewerState`
    - _Requirements: 2.1, 6.1, 9.2, 13.1, 21.1, 32.2, 38.2_

  - [x] 1.4 Configure Firebase SDK wiring
    - Create the Firebase client init (`lib/firebase/client.ts`) and admin/server init (`lib/firebase/server.ts`) reading from environment variables
    - Add Firestore typed converters scaffolding and Storage/Auth handles
    - _Requirements: 2.2, 24.1, 32.4_

- [x] 2. Implement Project_ID generation
  - [x] 2.1 Implement the projectId generator and validator
    - Create `lib/projectId.ts` with `generateProjectIdCandidate`, `isValidProjectId`, and `generateUniqueProjectId` (retry against an `existing` predicate, throw after max attempts)
    - _Requirements: 2.1, 2.3_

  - [ ]* 2.2 Write property test for Project_ID format
    - **Property 1: Project_ID format** — every generated candidate is 5–6 chars and alphanumeric only
    - **Validates: Requirements 2.1**

  - [ ]* 2.3 Write property test for Project_ID uniqueness
    - **Property 2: Project_ID uniqueness** — the id returned by the unique generator is never a member of the existing set
    - **Validates: Requirements 2.3**

- [x] 3. Implement URL state codec (URL_State_Manager)
  - [x] 3.1 Implement the viewer state encode/decode/resolve functions
    - Create `lib/urlState.ts` with `encodeViewerState` (omit undefined keys), `decodeViewerState` (drop unknown/invalid values; honor only `view=3d` and `tab=gallery`), and `resolveViewerState` (drop references not present in the project index)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.4, 5.5, 8.4, 13.3, 14.3, 15.2, 16.3_

  - [ ]* 3.2 Write property test for URL sta          te codec round-trip and omission
    - **Property 3: URL state codec round-trip and omission** — decode(encode(state)) is equivalent, and undefined fields produce no query-parameter key
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.4, 5.5, 8.4, 13.3, 14.3, 15.2, 16.3**

  - [ ]* 3.3 Write property test for URL state resolution against project data
    - **Property 4: URL state resolves against project data** — resolving retains existing references and drops non-existent ones, leaving valid fields unchanged
    - **Validates: Requirements 3.7**

- [x] 4. Implement units, persistence, and plot labels
  - [x] 4.1 Implement unit conversion
    - Create `lib/units.ts` with `fromSquareMeters`, `toSquareMeters`, and `formatArea` for `sqft | sqm | sqyd | acre | gunta`, using square meters as the canonical store
    - _Requirements: 16.2, 28.1, 28.2_

  - [ ]* 4.2 Write property test for unit conversion round-trip
    - **Property 9: Unit conversion round-trip** — converting sqm→unit→sqm recovers the original within tolerance, so unit-to-unit conversions compose
    - **Validates: Requirements 16.2, 28.2**

  - [x] 4.3 Implement the unit-preference persistence hook
    - Create `useUnitPreference` wrapping pure load/save helpers over `localStorage["plotverse.unit"]`
    - _Requirements: 28.3, 28.4_

  - [ ]* 4.4 Write property test for unit preference persistence round-trip
    - **Property 10: Unit preference persistence round-trip** — persisting then loading a unit returns the same unit
    - **Validates: Requirements 28.3, 28.4**

  - [x] 4.5 Implement the plot label formatter
    - Create `lib/labels.ts` with `formatPlotLabel` for `number | number+area | number+price | custom`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 4.6 Write property test for plot label formatting
    - **Property 5: Plot label formatting** — each format produces the specified label content
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 5. Implement filtering and aggregation
  - [x] 5.1 Implement filter, status-group, and search resolvers
    - Create `lib/filters.ts` with `filterByStatus` (incl. `all`), `filterByZone`, `resolveStatusGroup`, and `searchByNumber`
    - _Requirements: 12.3, 12.4, 12.5, 13.2, 14.1_

  - [ ]* 5.2 Write property test for predicate filtering
    - **Property 6: Predicate filtering is sound and complete** — filtered results contain exactly the plots satisfying the criterion; `all` returns the full list
    - **Validates: Requirements 12.3, 12.4, 12.5, 13.2, 14.1**

  - [x] 5.3 Implement status counts and value-range aggregation
    - Create `lib/aggregate.ts` with per-status counts and price/area min–max range computation over a plot (or lead) collection
    - _Requirements: 11.1, 11.2, 22.1, 22.3, 24.3, 38.6_

  - [ ]* 5.4 Write property test for group-by-status counts
    - **Property 7: Group-by-status counts partition the collection** — per-status counts sum to collection size and equal the count for each status; recompute reflects changes
    - **Validates: Requirements 11.1, 11.2, 22.3, 24.3, 38.6**

  - [ ]* 5.5 Write property test for value ranges
    - **Property 8: Price and area ranges equal dataset extremes** — min ≤ max, and min/max equal the smallest/largest present values
    - **Validates: Requirements 22.1**

- [x] 6. Implement geospatial math utilities
  - [x] 6.1 Implement geo utilities
    - Create `lib/geo.ts` with `areaSqm`, `centroid`, `edgeDimensions` (midpoint + great-circle length per edge), `pointInPlot`, and `distanceMeters` using Turf.js
    - _Requirements: 14.4, 26.1, 27.2_

  - [ ]* 6.2 Write property test for the distance metric
    - **Property 14: Distance metric properties** — distance is non-negative, symmetric, and zero for identical coordinates
    - **Validates: Requirements 14.4**

  - [ ]* 6.3 Write property test for point-in-plot detection
    - **Property 15: Point-in-plot detection** — a point inside the polygon is detected inside; a point outside the bounding box is detected outside
    - **Validates: Requirements 26.1**

  - [ ]* 6.4 Write property test for edge dimension computation
    - **Property 16: Edge dimension computation** — label count equals edge count; each midpoint is the average of its endpoints; each length is non-negative and equals the measured edge length
    - **Validates: Requirements 27.2**

- [ ] 7. Implement the File_Converter
  - [x] 7.1 Implement format detection and multi-format parsing
    - Create `lib/converter/parse.ts` with `detectFormat` and `parseToGeoJSON` for GeoJSON, JSON, KML, KMZ, SHP ZIP, DXF, and CSV using `@tmcw/togeojson`, `shpjs`, `jszip`, `dxf-parser`, and `papaparse`; catch parser failures and report which file/feature failed
    - _Requirements: 34.1_

  - [ ]* 7.2 Write property test for multi-format parse equivalence
    - **Property 18: Multi-format parse equivalence** — encoding WGS84 polygons into any supported format and parsing yields geometries equivalent to the originals
    - **Validates: Requirements 34.1**

  - [x] 7.3 Implement feature enrichment
    - Create `lib/converter/enrich.ts` with `enrichFeatures` adding area (sqft, sqm, sqyd) and centroid to each feature's properties
    - _Requirements: 34.2_

  - [ ]* 7.4 Write property test for feature enrichment
    - **Property 19: Feature enrichment** — enriched features carry sqft/sqm/sqyd areas in correct fixed ratios and a centroid within the bounding box
    - **Validates: Requirements 34.2**

  - [x] 7.5 Implement GeoJSON validation
    - Create `lib/converter/validate.ts` with `validateGeoJSON` checking WGS84 coordinate bounds and closed polygon rings, returning a typed error array (saving withheld on errors)
    - _Requirements: 34.3, 34.4_

  - [ ]* 7.6 Write property test for GeoJSON validation correctness
    - **Property 20: GeoJSON validation correctness** — no errors iff all coordinates are within WGS84 bounds and rings are closed; out-of-bounds or open-ring mutations produce a corresponding error
    - **Validates: Requirements 34.3, 34.4**

  - [x] 7.7 Implement stable serialization/deserialization
    - Create `lib/converter/serialize.ts` with deterministic `serializeGeoJSON` and `deserializeGeoJSON` for Storage round-trips
    - _Requirements: 36.1_

  - [ ]* 7.8 Write property test for serialization round-trip integrity
    - **Property 21: GeoJSON serialization round-trip integrity** — deserialize(serialize(fc)) yields geometry coordinates exactly equal to the converted geometry
    - **Validates: Requirements 36.1**

- [x] 8. Implement link, QR, CSV, and history domain logic
  - [x] 8.1 Implement link builders
    - Create `lib/links.ts` with `googleMapsDirections`, `appleMapsDirections`, `whatsappEnquiryUrl` (URL-encoded message), and `buildShareUrl` (project id in path, optional `plot` param)
    - _Requirements: 17.1, 17.2, 18.1, 19.1_

  - [ ]* 8.2 Write property test for directions and share link well-formedness
    - **Property 11: Directions and share link well-formedness** — directions URLs are valid and encode destination lat/lng; share URL path contains the project id and `plot` equals the plot id when supplied
    - **Validates: Requirements 17.1, 17.2, 18.1**

  - [ ]* 8.3 Write property test for WhatsApp message encoding
    - **Property 12: WhatsApp message encoding round-trip** — the URL is valid and decoding its message parameter recovers the original message exactly
    - **Validates: Requirements 19.1**

  - [x] 8.4 Implement QR code generation
    - Create `lib/qr.ts` to encode a viewer URL into a QR (canvas/PNG) using `qrcode`
    - _Requirements: 23.1, 23.2_

  - [ ]* 8.5 Write property test for QR encoding
    - **Property 13: QR code encodes the viewer URL** — decoding the generated QR yields the same URL
    - **Validates: Requirements 23.1**

  - [x] 8.6 Implement the lead CSV export encoder
    - Create `lib/csv.ts` with `leadsToCsv` using RFC-4180 escaping (commas, quotes, newlines)
    - _Requirements: 38.5_

  - [ ]* 8.7 Write property test for lead CSV export round-trip
    - **Property 28: Lead CSV export round-trip** — one header row plus one row per lead; parsing back recovers each lead's exported field values incl. escaped special characters
    - **Validates: Requirements 38.5**

  - [x] 8.8 Implement GeoJSON history retention
    - Create `lib/history.ts` with `retainRecentVersions` keeping only the most recent 5 versions in order
    - _Requirements: 35.2_

  - [ ]* 8.9 Write property test for history retention
    - **Property 22: GeoJSON history retention** — retained history has at most 5 entries equal to the 5 most recent in order
    - **Validates: Requirements 35.2**

- [x] 9. Implement lead, access, metadata, and gallery domain logic
  - [x] 9.1 Implement enquiry form validation
    - Create `lib/leadValidation.ts` validating required name, contact (well-formed), and message; return a typed error list
    - _Requirements: 20.3_

  - [ ]* 9.2 Write property test for enquiry form validation
    - **Property 25: Enquiry form validation** — valid iff all required fields present and contact well-formed; invalid input always yields a non-empty error list and submission is withheld
    - **Validates: Requirements 20.3**

  - [x] 9.3 Implement lead status and timeline logic
    - Create `lib/leads.ts` with status-enum guard, default `New` on creation, and timeline append for status changes and notes
    - _Requirements: 20.4, 38.2, 38.3, 38.4_

  - [ ]* 9.4 Write property test for lead status enum membership
    - **Property 26: Lead status enum membership** — a status change is accepted iff the value is one of the six permitted statuses
    - **Validates: Requirements 38.2**

  - [ ]* 9.5 Write property test for lead timeline append
    - **Property 27: Lead timeline append** — each operation appends exactly one entry of the correct type, preserves prior entries in order, and timeline length equals the number of operations
    - **Validates: Requirements 38.3, 38.4**

  - [x] 9.6 Implement the admin access policy matrix
    - Create `lib/access.ts` with a role/action policy: superadmin permitted all actions, editor denied superadmin-only actions
    - _Requirements: 32.2, 32.3_

  - [ ]* 9.7 Write property test for admin access policy
    - **Property 23: Admin access policy** — the decision permits an action iff the matrix allows the role; editor is denied every superadmin-only action, superadmin permitted all
    - **Validates: Requirements 32.2, 32.3**

  - [x] 9.8 Implement OG metadata derivation
    - Create `lib/ogMetadata.ts` deriving a non-empty title, description, and image from a project's stored data
    - _Requirements: 31.1, 31.2_

  - [ ]* 9.9 Write property test for OG metadata derivation
    - **Property 24: OG metadata derivation** — generated metadata has non-empty title/description/image, with title and description derived from the project name and description
    - **Validates: Requirements 31.1, 31.2**

  - [x] 9.10 Implement gallery media add/remove logic
    - Create `lib/gallery.ts` with pure add-YouTube-reference and remove-by-id operations over a media list
    - _Requirements: 39.2, 39.3_

  - [ ]* 9.11 Write property test for gallery media add/remove
    - **Property 29: Gallery media add/remove** — adding a YouTube reference appends one youtube item with that id; removing by id leaves all other items intact
    - **Validates: Requirements 39.2, 39.3**

- [x] 10. Implement real-time map source delta merge
  - [x] 10.1 Implement feature-collection delta application
    - Create `lib/mapSource.ts` applying single-plot add/modify/remove deltas to an in-memory FeatureCollection without recreating it and with no duplicate feature ids
    - _Requirements: 24.2_

  - [ ]* 10.2 Write property test for real-time source delta application
    - **Property 17: Real-time source delta application** — applying a delta reflects the change, preserves other features, and contains no duplicate ids
    - **Validates: Requirements 24.2**

- [x] 11. Checkpoint - domain logic verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement the data-access layer
  - [x] 12.1 Implement Firestore repositories
    - Create typed `projectRepo` (get/exists/create with id generation/update/remove), `plotRepo`, `zoneRepo`, `statusGroupRepo`, and `leadRepo` (create/list/update/addNote)
    - _Requirements: 2.2, 2.3, 20.2, 33.2, 33.3, 37.1, 37.2, 37.3, 38.2, 38.3_

  - [x] 12.2 Implement real-time subscription helpers
    - Create `onSnapshot` wrappers for the project's `plots`, `zones`, and `statusGroups` subcollections with non-blocking error handling and auto-retry
    - _Requirements: 24.1_

  - [x] 12.3 Implement the Firebase Storage client
    - Create `storageClient` with `uploadGeoJSON`, `uploadMedia`, `getDownloadUrl`, and `listVersions`; on save, upsert plot documents and append a history version
    - _Requirements: 35.1, 36.2, 39.1_

  - [x] 12.4 Implement the Auth client and session/claims handling
    - Create sign-in, ID-token→session-cookie exchange, session verification, and `role` custom-claim reading
    - _Requirements: 32.1, 32.2, 32.4_

  - [ ]* 12.5 Write integration tests for repositories, subscriptions, and storage
    - Use the Firebase Emulator Suite to verify CRUD persistence, snapshot callbacks, and GeoJSON save/Storage/plot upsert
    - _Requirements: 2.2, 24.1, 33.2, 33.3, 35.1, 36.2, 37.1, 37.2, 37.3, 39.1_

- [ ] 13. Implement routing, middleware, and metadata
  - [x] 13.1 Implement the landing page route
    - Create `app/page.tsx` as a marketing-only Server Component that excludes the viewer/map bundle
    - _Requirements: 30.1, 30.2_

  - [x] 13.2 Implement the project viewer server shell and metadata
    - Create `app/[projectId]/page.tsx` loading the project for `generateMetadata` (OG_Metadata), rendering a not-found state for missing ids, and mounting the client `<ProjectViewer>`
    - _Requirements: 1.1, 1.2, 31.1, 31.2_

  - [x] 13.3 Implement the admin auth middleware
    - Create `middleware.ts` verifying the session cookie for `/admin/**`, redirecting unauthenticated requests to login and passing the decoded role
    - _Requirements: 32.1, 32.4_

  - [ ]* 13.4 Write integration tests for middleware and metadata
    - Verify the `/admin` redirect for missing/invalid sessions and that `generateMetadata` derives title/description/image from project data
    - _Requirements: 31.1, 31.2, 32.1, 32.4_

- [ ] 14. Implement the Map_Renderer
  - [x] 14.1 Implement Map_Renderer base rendering
    - Initialize Mapbox with the satellite default, build the ordered layer stack (zones behind plots), data-driven plot fill color by status, plot/zone outlines and labels via the configured format, and bind the `plots`/`zones` GeoJSON sources with real-time `setData` updates from the delta merge
    - _Requirements: 4.1, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 9.1, 9.2, 9.3, 11.2, 22.3, 24.2, 24.3_

  - [-] 14.2 Implement map interactions and view modes
    - Add hover/selected feature-state with selected-outline thickening, click-to-open plot, satellite/street style switching with layer re-add on `style.load`, status/zone filter application, fly-to-and-highlight, and 3D pitch + building extrusions
    - _Requirements: 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 6.7, 8.1, 8.2, 8.3, 12.3, 12.4, 12.5, 14.2_

  - [~] 14.3 Implement edge dimension labels and the user-location layer
    - Add the edge-dimension symbol layer gated at zoom ≥ 18 (hidden below) and the pulsing user-location dot + accuracy circle driven by position updates
    - _Requirements: 25.2, 25.3, 27.1, 27.2, 27.3_

  - [ ]* 14.4 Write unit tests for color mapping and zoom gating
    - Using a mock map object, test status→color mapping (Req 6.2–6.5) and edge-label show/hide at the zoom-18 threshold (Req 27.1, 27.3)
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 27.1, 27.3_

- [x] 15. Checkpoint - data layer, routing, and map verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Implement the Project_Viewer UI shell and overlay panels
  - [-] 16.1 Implement the ProjectViewer root
    - Create the client `<ProjectViewer>` owning the Zustand store, the Map_Renderer ref, URL state sync via history replacement, the not-found-safe parameter resolution on load, and real-time subscription wiring; render panels as slide-in overlays that retain the underlying map
    - _Requirements: 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 24.1_

  - [~] 16.2 Implement the TopBar and StatusSummaryBar
    - Build the top bar (project name, compass bearing, Share, 3D, Locate controls) and the live per-status count summary bar
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2_

  - [~] 16.3 Implement FilterPills and SearchControl
    - Build status pills (All/Available/Sold/Reserved/Blocked) and per-zone pills, plus client-side plot-number search with fly-to/highlight and optional distance display
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 14.1, 14.2, 14.3, 14.4_

  - [~] 16.4 Implement the BottomTabBar
    - Build Gallery/Info/Locate tabs wired to open the corresponding panels/feature and set the `tab` param for gallery
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [~] 16.5 Implement the PlotDetailSheet
    - Build the bottom sheet showing area/facing/price/amenities, a unit toggle, directions (with iOS Apple Maps branch), share (native share → clipboard fallback), WhatsApp enquiry, and the enquiry form with validation; remove the `plot` param on close
    - _Requirements: 16.1, 16.2, 16.3, 17.1, 17.2, 17.3, 18.1, 18.2, 18.3, 19.1, 20.1, 20.3_

  - [~] 16.6 Implement the GalleryPanel and Lightbox
    - Build the media grid (images, video thumbnails, YouTube) and a full-screen Lightbox supporting swipe, pinch-zoom, and video playback
    - _Requirements: 21.1, 21.2, 21.3_

  - [~] 16.7 Implement the InfoPanel
    - Build live statistics, description with read-more, price/area ranges, amenities, the downloadable QR code, and social links
    - _Requirements: 22.1, 22.2, 22.3, 23.1, 23.2_

  - [~] 16.8 Implement the WhatsApp FAB, UnitToggle, and Presentation_Mode
    - Build the fixed always-visible WhatsApp FAB, the unit selector wired to the persistence hook, and presentation mode (hide chrome; exit on map tap or Escape)
    - _Requirements: 19.2, 19.3, 28.1, 28.2, 29.1, 29.2_

  - [~] 16.9 Implement the LocationLayer
    - Wire GPS permission request and position watch, feed updates to the user-location layer, surface a denied-access message, and notify when the device location falls within a plot polygon
    - _Requirements: 25.1, 25.4, 26.1_

  - [ ]* 16.10 Write component tests for the overlay panels
    - Test overlay open/close retaining the map (Req 1.3–1.5), tab/top-bar controls, filter pills presence, detail-sheet contents, gallery/lightbox, and presentation mode
    - _Requirements: 1.3, 1.4, 1.5, 10.1, 12.1, 12.2, 15.1, 16.1, 21.1, 29.1, 29.2_

- [ ] 17. Implement the Admin_Panel
  - [x] 17.1 Implement the AdminShell
    - Build the auth-gated `/admin` layout with role context, navigation across sections, and superadmin-only action gating using the access policy
    - _Requirements: 32.2, 32.3, 33.1_

  - [-] 17.2 Implement the ProjectsManager
    - Build project create (with id generation)/update/delete persisted to the projects collection
    - _Requirements: 2.1, 2.2, 33.2_

  - [-] 17.3 Implement Plots, Zones, and Status Groups managers
    - Build plot editing (incl. label format and zone assignment), zone CRUD, and status-group CRUD persisted to their collections
    - _Requirements: 13.1, 33.3, 37.1, 37.2, 37.3_

  - [-] 17.4 Implement the FileConverter and Geojson history panels
    - Build upload→convert→enrich→validate with per-feature error reporting, a preview, editable feature properties, save to Storage with plot upsert, and version list with rollback
    - _Requirements: 34.1, 34.2, 34.3, 34.4, 34.5, 34.6, 35.1, 35.2, 35.3_

  - [-] 17.5 Implement the GalleryManager
    - Build image/video upload to Storage, YouTube reference add, and media removal associated with the project
    - _Requirements: 39.1, 39.2, 39.3_

  - [-] 17.6 Implement the CRM board
    - Build the lead list and detail view, status pipeline updates, note adding with timeline, CSV export, and per-status statistics
    - _Requirements: 38.1, 38.2, 38.3, 38.4, 38.5, 38.6_

  - [ ]* 17.7 Write integration tests for admin operations
    - Use the emulator to verify project/plot/zone/status-group CRUD and GeoJSON save/rollback round-trips
    - _Requirements: 33.2, 33.3, 35.1, 35.3, 36.2, 37.1, 37.2, 37.3_

- [ ] 18. Implement PWA installability and mobile viewport
  - [-] 18.1 Implement the PWA manifest, service worker, and install prompt
    - Add the web app manifest enabling Add-to-Home-Screen, register the service worker, and show the 30-second mobile install prompt
    - _Requirements: 40.1, 40.2_

  - [x] 18.2 Implement mobile viewport behavior
    - Set the viewport meta to disable user scaling and apply 100dvh height with hidden overflow for the Project_Viewer
    - _Requirements: 41.1, 41.2_

  - [ ]* 18.3 Write smoke tests for manifest and viewport
    - Verify the manifest fields (Req 40.1) and the viewport meta / 100dvh + overflow rules (Req 41)
    - _Requirements: 40.1, 41.1, 41.2_

- [ ] 19. Integration and final wiring
  - [~] 19.1 Wire enquiry capture and live inventory end-to-end
    - Connect the PlotDetailSheet enquiry submission to `leadRepo` (saving a `New` lead referencing project and plot) and feed real-time snapshot deltas through the source merge into map, status summary, and Info_Panel statistics
    - _Requirements: 20.2, 20.4, 24.1, 24.2, 24.3_

  - [ ]* 19.2 Write end-to-end integration tests
    - Verify lead capture persistence and that a Firestore plot change propagates to the map source and derived counts (emulator + mocked Mapbox)
    - _Requirements: 20.2, 24.1, 24.2, 24.3_

- [~] 20. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; they cover property, unit, component, integration, and smoke tests.
- Each property-based test implements exactly one correctness property from the design, runs a minimum of 100 fast-check iterations, and is tagged `// Feature: plotverse-platform, Property {n}: {text}`.
- The pure domain layer (`lib/*`) is implemented and property-tested first so correctness is validated before any Firebase/Mapbox I/O is wired.
- Each task references specific granular requirements for traceability; checkpoints provide incremental validation points.
- Round-trip geometry integrity (Req 36) is covered across Properties 18–21 plus the storage integration test in 12.5/17.7.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1", "3.1", "4.1", "4.5", "5.1", "5.3", "6.1", "7.1", "7.3", "7.5", "7.7", "8.1", "8.4", "8.6", "8.8", "9.1", "9.3", "9.6", "9.8", "9.10", "10.1", "12.1", "12.3", "12.4", "13.1", "18.2"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.2", "3.3", "4.2", "4.3", "4.6", "5.2", "5.4", "5.5", "6.2", "6.3", "6.4", "7.2", "7.4", "7.6", "7.8", "8.2", "8.3", "8.5", "8.7", "8.9", "9.2", "9.4", "9.5", "9.7", "9.9", "9.11", "10.2", "12.2", "13.2", "13.3", "14.1", "17.1"] },
    { "id": 4, "tasks": ["4.4", "12.5", "13.4", "14.2", "16.1", "17.2", "17.3", "17.4", "17.5", "17.6", "18.1"] },
    { "id": 5, "tasks": ["14.3", "16.2", "16.3", "16.4", "16.5", "16.6", "16.7", "16.8", "16.9", "17.7", "18.3"] },
    { "id": 6, "tasks": ["14.4", "16.10", "19.1"] },
    { "id": 7, "tasks": ["19.2"] }
  ]
}
```
