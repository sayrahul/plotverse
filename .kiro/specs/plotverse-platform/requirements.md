# Requirements Document

## Introduction

PlotVerse is a real estate land-plot viewing web application (spacer.land-style) that lets prospective buyers explore land projects on a full-screen interactive satellite map. Each project lives on a single page at its own short URL (`/[projectId]`) where the entire experience — map with color-coded plots, gallery, project info, search, filters, sharing, and location features — is presented through sliding overlay panels rather than separate routes. Real estate developers and administrators manage projects, plots, zones, status presets, gallery media, share links, and sales leads through a protected admin panel, including uploading geospatial files in multiple formats that are converted to a common format for display. The application is real-time, mobile-first, installable as a PWA, and optimized for social sharing through per-project metadata.

This document defines the requirements for the public viewing experience, map interaction, filtering and search, plot details and enquiry, sharing and URL state, real-time inventory, location features, gallery and info panels, units and presentation, the landing page, social/SEO metadata, the admin project management surface, geospatial file upload and conversion, zone and status-group management, CRM/lead management, gallery management, authentication and access control, and PWA capabilities.

## Glossary

- **PlotVerse_Platform**: The complete web application, comprising the public viewer, the landing page, and the admin panel.
- **Project_Viewer**: The single-page public experience served at `/[projectId]` that renders the map and all overlay panels for one project.
- **Landing_Page**: The marketing-only page served at the root path (`/`).
- **Admin_Panel**: The protected management surface served under `/admin`.
- **Map_Renderer**: The component responsible for rendering the Mapbox GL satellite/street map, plot layers, zone layers, and related visual states.
- **Project**: A land development containing plots, zones, status groups, gallery media, and metadata; stored as a Firestore document whose document ID equals the Project_ID.
- **Project_ID**: A short 5-to-6 character alphanumeric identifier that uniquely identifies a Project and forms its URL path.
- **Plot**: An individual parcel of land within a Project, defined by a GeoJSON polygon geometry and properties such as number, area, price, facing, amenities, and status.
- **Zone**: A named polygon area within a Project used to group plots; rendered behind plots with a dashed outline and label.
- **Status_Group**: An admin-defined named filter preset that selects a subset of plots by status and/or other criteria, referenced by a status group identifier in the URL.
- **Plot_Status**: The availability state of a Plot, one of: available, sold, reserved, blocked.
- **URL_State_Manager**: The mechanism that reads and writes shareable state to URL query parameters using history replacement without page navigation.
- **Plot_Detail_Sheet**: The bottom-sheet overlay that displays the details of a single selected Plot.
- **Gallery_Panel**: The overlay panel that displays project images, video thumbnails, and YouTube videos.
- **Info_Panel**: The overlay panel that displays live project statistics, description, price and area ranges, amenities, QR code, and social links.
- **Lightbox**: The full-screen media viewer used to display gallery images and videos with swipe, pinch-zoom, and video playback.
- **Lead**: A record of a prospective buyer enquiry, stored in the leads collection and managed through the CRM.
- **CRM**: The lead management feature within the Admin_Panel, including lead list, detail, status pipeline, timeline, notes, export, and statistics.
- **Lead_Status**: The stage of a Lead in the sales pipeline, one of: New, Contacted, Interested, Negotiating, Closed, Lost.
- **File_Converter**: The Admin_Panel subsystem that converts uploaded geospatial files into GeoJSON and enriches and validates them.
- **GeoJSON**: The geospatial data format used to store and render plot and zone geometry.
- **Geojson_History**: A retained list of the most recent saved GeoJSON versions for a Project, used for rollback.
- **Presentation_Mode**: A viewing mode that hides all interface chrome to show the map alone.
- **WhatsApp_FAB**: A fixed, always-visible floating action button that initiates a WhatsApp conversation.
- **Unit_Preference**: The user's selected area measurement unit, one of: sqft, sqm, sqyd, acre, gunta.
- **Public_Viewer**: A prospective buyer who browses a Project without authentication.
- **Admin_User**: An authenticated user who manages Projects through the Admin_Panel.
- **Admin_Role**: The permission level of an Admin_User, one of: superadmin, editor.
- **Sales_Agent**: An authenticated user who works with Leads through the CRM.
- **PWA**: The installable Progressive Web App configuration of the PlotVerse_Platform.
- **OG_Metadata**: Open Graph and related social/SEO metadata generated per Project for link previews.
- **WGS84**: The geographic coordinate reference system EPSG:4326 required for stored GeoJSON.

## Requirements

### Requirement 1: Single-Page Project Viewer Routing

**User Story:** As a Public_Viewer, I want each project to load at its own short URL on a single page, so that I can open and share a direct link to a specific development without navigating through sub-pages.

#### Acceptance Criteria

1. WHEN a Public_Viewer requests the path `/[projectId]`, THE Project_Viewer SHALL render the full-screen map experience for the Project whose Project_ID matches the path segment.
2. IF the requested Project_ID does not match an existing Project, THEN THE Project_Viewer SHALL display a not-found state for that path.
3. THE Project_Viewer SHALL present the map, gallery, info, search, filters, status summary, and location features for one Project on a single page without navigating to a different route.
4. WHEN a Public_Viewer opens an overlay panel within the Project_Viewer, THE Project_Viewer SHALL present the panel as a slide-in overlay and SHALL retain the underlying map view.
5. WHEN a Public_Viewer closes an overlay panel, THE Project_Viewer SHALL dismiss the overlay and SHALL retain the underlying map view.

### Requirement 2: Short Project Identifier Generation

**User Story:** As an Admin_User, I want each project to receive a short alphanumeric identifier, so that project links are concise and easy to share.

#### Acceptance Criteria

1. WHEN an Admin_User creates a Project, THE PlotVerse_Platform SHALL generate a Project_ID consisting of 5 to 6 alphanumeric characters.
2. THE PlotVerse_Platform SHALL store each Project as a Firestore document whose document identifier equals the Project_ID.
3. WHEN the PlotVerse_Platform generates a Project_ID, THE PlotVerse_Platform SHALL ensure the generated Project_ID does not match the Project_ID of any existing Project.

### Requirement 3: Shareable URL Query Parameter State

**User Story:** As a Public_Viewer, I want the viewer's current state to be captured in the URL, so that I can share or revisit a link that restores the same filters, selected plot, and view.

#### Acceptance Criteria

1. WHEN a Public_Viewer changes a shareable view state, THE URL_State_Manager SHALL update the corresponding query parameter among `status`, `plot`, `zone`, `view`, and `tab` using history replacement without page navigation.
2. WHEN the Project_Viewer loads with a `status` query parameter, THE Project_Viewer SHALL apply the Status_Group identified by the parameter value as the active filter.
3. WHEN the Project_Viewer loads with a `plot` query parameter, THE Project_Viewer SHALL open the Plot_Detail_Sheet for the Plot identified by the parameter value.
4. WHEN the Project_Viewer loads with a `zone` query parameter, THE Project_Viewer SHALL apply the Zone filter identified by the parameter value.
5. WHEN the Project_Viewer loads with a `view` query parameter equal to `3d`, THE Map_Renderer SHALL render the map in 3D view.
6. WHEN the Project_Viewer loads with a `tab` query parameter equal to `gallery`, THE Project_Viewer SHALL open the Gallery_Panel.
7. IF a query parameter value does not match an existing Plot, Zone, or Status_Group, THEN THE Project_Viewer SHALL render the default view and SHALL ignore the unmatched parameter.

### Requirement 4: Satellite and Street View Map Display

**User Story:** As a Public_Viewer, I want to view the project on a satellite map and switch to a street view, so that I can understand the land both visually and in map context.

#### Acceptance Criteria

1. WHEN the Project_Viewer loads, THE Map_Renderer SHALL display the Project on a full-screen satellite map by default.
2. WHEN a Public_Viewer activates the street view toggle, THE Map_Renderer SHALL switch the base map to the street style.
3. WHEN a Public_Viewer activates the satellite view toggle, THE Map_Renderer SHALL switch the base map to the satellite style.
4. WHEN the Map_Renderer changes the base map style, THE Map_Renderer SHALL re-add the plot layers, zone layers, and related visual states after the new style has loaded.

### Requirement 5: 3D View Toggle

**User Story:** As a Public_Viewer, I want to toggle a 3D view of the map, so that I can perceive terrain and building height around the plots.

#### Acceptance Criteria

1. WHEN a Public_Viewer enables 3D view, THE Map_Renderer SHALL change the map pitch from 0 degrees to 60 degrees.
2. WHEN a Public_Viewer disables 3D view, THE Map_Renderer SHALL change the map pitch from 60 degrees to 0 degrees.
3. WHILE 3D view is enabled, THE Map_Renderer SHALL render building extrusions.
4. WHEN 3D view is enabled, THE URL_State_Manager SHALL set the `view` query parameter to `3d`.
5. WHEN 3D view is disabled, THE URL_State_Manager SHALL remove the `view` query parameter.

### Requirement 6: Plot Rendering and Status Color Coding

**User Story:** As a Public_Viewer, I want plots drawn on the map and colored by availability, so that I can quickly see which plots are available, sold, reserved, or blocked.

#### Acceptance Criteria

1. WHEN the Map_Renderer renders a Project, THE Map_Renderer SHALL display a fill layer for each Plot using the polygon geometry of the Plot.
2. WHERE a Plot has Plot_Status available, THE Map_Renderer SHALL render the Plot fill in green.
3. WHERE a Plot has Plot_Status sold, THE Map_Renderer SHALL render the Plot fill in red.
4. WHERE a Plot has Plot_Status reserved, THE Map_Renderer SHALL render the Plot fill in amber.
5. WHERE a Plot has Plot_Status blocked, THE Map_Renderer SHALL render the Plot fill in gray.
6. THE Map_Renderer SHALL render an outline layer for each Plot.
7. WHEN a Plot is selected, THE Map_Renderer SHALL render the outline of the selected Plot with greater thickness than the outline of unselected Plots.

### Requirement 7: Plot Labels

**User Story:** As a Public_Viewer, I want each plot labeled with relevant details, so that I can identify a plot by its number, area, or price at a glance.

#### Acceptance Criteria

1. THE Map_Renderer SHALL render a label for each Plot using the label format configured for the Project.
2. WHERE the configured label format is number, THE Map_Renderer SHALL display the Plot number as the label.
3. WHERE the configured label format is number plus area, THE Map_Renderer SHALL display the Plot number and area as the label.
4. WHERE the configured label format is number plus price, THE Map_Renderer SHALL display the Plot number and price as the label.
5. WHERE the configured label format is custom, THE Map_Renderer SHALL display the custom label text configured for the Plot.

### Requirement 8: Plot Hover and Selection Interaction

**User Story:** As a Public_Viewer, I want plots to respond when I hover and click, so that I get visual feedback and can open a plot's details.

#### Acceptance Criteria

1. WHEN a pointer hovers over a Plot, THE Map_Renderer SHALL set the hover feature-state for that Plot to produce a hover visual state.
2. WHEN a pointer leaves a Plot, THE Map_Renderer SHALL clear the hover feature-state for that Plot.
3. WHEN a Public_Viewer clicks a Plot, THE Project_Viewer SHALL open the Plot_Detail_Sheet for the clicked Plot.
4. WHEN a Public_Viewer clicks a Plot, THE URL_State_Manager SHALL set the `plot` query parameter to the identifier of the clicked Plot.

### Requirement 9: Zone Rendering

**User Story:** As a Public_Viewer, I want zones displayed behind the plots, so that I can understand how the project is divided into areas.

#### Acceptance Criteria

1. THE Map_Renderer SHALL render each Zone as a polygon with a dashed outline.
2. THE Map_Renderer SHALL render a label for each Zone.
3. THE Map_Renderer SHALL render Zone layers behind Plot layers.

### Requirement 10: Top Bar Controls

**User Story:** As a Public_Viewer, I want a top bar with the project name and key controls, so that I can orient myself and access share, 3D, and locate actions.

#### Acceptance Criteria

1. THE Project_Viewer SHALL display a top bar containing the Project name, a compass, a Share control, a 3D control, and a Locate control.
2. WHEN a Public_Viewer activates the 3D control, THE Map_Renderer SHALL toggle 3D view.
3. WHEN a Public_Viewer activates the Locate control, THE Project_Viewer SHALL initiate the location feature.
4. WHEN a Public_Viewer activates the Share control, THE Project_Viewer SHALL initiate sharing of the current view.
5. THE Project_Viewer SHALL display the compass to indicate the current map bearing.

### Requirement 11: Status Summary Bar

**User Story:** As a Public_Viewer, I want a summary of plot counts per status, so that I can see project availability at a glance.

#### Acceptance Criteria

1. THE Project_Viewer SHALL display a status summary bar showing the count of Plots for each Plot_Status.
2. WHEN the underlying Plot inventory changes, THE Project_Viewer SHALL update the displayed counts in the status summary bar to reflect the current inventory.

### Requirement 12: Filter Pills for Status and Zones

**User Story:** As a Public_Viewer, I want filter controls for status and zones, so that I can narrow the displayed plots to what interests me.

#### Acceptance Criteria

1. THE Project_Viewer SHALL display filter pills for All, Available, Sold, Reserved, and Blocked.
2. THE Project_Viewer SHALL display a filter pill for each Zone in the Project.
3. WHEN a Public_Viewer selects a status filter pill, THE Map_Renderer SHALL display only Plots whose Plot_Status matches the selected status.
4. WHEN a Public_Viewer selects the All filter pill, THE Map_Renderer SHALL display all Plots regardless of Plot_Status.
5. WHEN a Public_Viewer selects a Zone filter pill, THE Map_Renderer SHALL display only Plots within the selected Zone, and THE URL_State_Manager SHALL set the `zone` query parameter to the identifier of the selected Zone.

### Requirement 13: Status Group Presets

**User Story:** As an Admin_User, I want to define named status presets, so that buyers can open a link that pre-filters the map to a curated selection.

#### Acceptance Criteria

1. WHEN an Admin_User creates a Status_Group, THE Admin_Panel SHALL save the Status_Group with a name and the set of statuses it selects.
2. WHEN a Public_Viewer selects a Status_Group, THE Map_Renderer SHALL display only Plots matching the criteria of the Status_Group.
3. WHEN a Status_Group is applied, THE URL_State_Manager SHALL set the `status` query parameter to the identifier of the Status_Group.

### Requirement 14: Plot Search

**User Story:** As a Public_Viewer, I want to search for a specific plot, so that I can quickly locate and view a plot of interest.

#### Acceptance Criteria

1. THE Project_Viewer SHALL provide a search control that filters Plots on the client by Plot number.
2. WHEN a Public_Viewer selects a Plot from the search results, THE Map_Renderer SHALL fly to the selected Plot and SHALL highlight the selected Plot.
3. WHEN a Public_Viewer selects a Plot from the search results, THE URL_State_Manager SHALL set the `plot` query parameter to the identifier of the selected Plot.
4. WHERE the Public_Viewer's location is available, THE Project_Viewer SHALL display the distance from the Public_Viewer's location to each Plot in the search results.

### Requirement 15: Bottom Tab Navigation

**User Story:** As a Public_Viewer, I want a bottom tab bar, so that I can switch between the gallery, project info, and locate actions.

#### Acceptance Criteria

1. THE Project_Viewer SHALL display a bottom tab bar with tabs for Gallery, Info, and Locate.
2. WHEN a Public_Viewer selects the Gallery tab, THE Project_Viewer SHALL open the Gallery_Panel, and THE URL_State_Manager SHALL set the `tab` query parameter to `gallery`.
3. WHEN a Public_Viewer selects the Info tab, THE Project_Viewer SHALL open the Info_Panel.
4. WHEN a Public_Viewer selects the Locate tab, THE Project_Viewer SHALL initiate the location feature.

### Requirement 16: Plot Detail Sheet Contents

**User Story:** As a Public_Viewer, I want a detail sheet for a selected plot, so that I can review its specifications and take action on it.

#### Acceptance Criteria

1. WHEN the Plot_Detail_Sheet opens for a Plot, THE Plot_Detail_Sheet SHALL display the Plot area, facing, price, amenities, a unit toggle, a directions action, a share action, a WhatsApp enquiry action, and an enquiry form.
2. WHEN a Public_Viewer changes the unit toggle in the Plot_Detail_Sheet, THE Plot_Detail_Sheet SHALL display the Plot area in the selected Unit_Preference.
3. WHEN a Public_Viewer closes the Plot_Detail_Sheet, THE URL_State_Manager SHALL remove the `plot` query parameter.

### Requirement 17: Directions to a Plot

**User Story:** As a Public_Viewer, I want to open directions to a plot, so that I can navigate to the land using my preferred maps application.

#### Acceptance Criteria

1. WHEN a Public_Viewer activates the directions action for a Plot, THE Plot_Detail_Sheet SHALL provide a Google Maps directions link targeting the Plot location.
2. WHEN a Public_Viewer activates the directions action for a Plot, THE Plot_Detail_Sheet SHALL provide an Apple Maps directions link targeting the Plot location.
3. WHERE the Public_Viewer's device is an iOS device, THE Plot_Detail_Sheet SHALL present the Apple Maps directions link.

### Requirement 18: Share a Plot

**User Story:** As a Public_Viewer, I want to share a specific plot, so that I can send a direct link to that plot to someone else.

#### Acceptance Criteria

1. WHEN a Public_Viewer activates the share action for a Plot, THE Project_Viewer SHALL construct a shareable URL that includes the `plot` query parameter set to the Plot identifier.
2. WHERE the device supports the native share capability, THE Project_Viewer SHALL invoke the native share interface with the shareable URL.
3. IF the device does not support the native share capability, THEN THE Project_Viewer SHALL copy the shareable URL to the clipboard and SHALL confirm the copy to the Public_Viewer.

### Requirement 19: WhatsApp Enquiry

**User Story:** As a Public_Viewer, I want to enquire about a plot over WhatsApp, so that I can quickly reach the seller with the plot context included.

#### Acceptance Criteria

1. WHEN a Public_Viewer activates the WhatsApp enquiry action for a Plot, THE Project_Viewer SHALL open a WhatsApp conversation containing a pre-filled URL-encoded message that references the Plot.
2. THE Project_Viewer SHALL display the WhatsApp_FAB at a fixed position that remains visible across the Project_Viewer.
3. WHEN a Public_Viewer activates the WhatsApp_FAB, THE Project_Viewer SHALL open a WhatsApp conversation with the Project contact.

### Requirement 20: Enquiry Form Lead Capture

**User Story:** As a Sales_Agent, I want buyer enquiries captured as leads, so that I can follow up with prospective buyers.

#### Acceptance Criteria

1. THE Plot_Detail_Sheet SHALL provide an enquiry form for a Public_Viewer to submit a name, contact information, and message.
2. WHEN a Public_Viewer submits the enquiry form with valid input, THE Project_Viewer SHALL save a Lead to the leads collection referencing the Project and the Plot.
3. IF the enquiry form is submitted with invalid input, THEN THE Project_Viewer SHALL display validation messages and SHALL withhold submission until the input is valid.
4. WHEN a Lead is saved, THE Project_Viewer SHALL assign the Lead the Lead_Status New.

### Requirement 21: Gallery Panel

**User Story:** As a Public_Viewer, I want a gallery of project media, so that I can view photos and videos of the development.

#### Acceptance Criteria

1. WHEN a Public_Viewer opens the Gallery_Panel, THE Gallery_Panel SHALL display a grid of Project images, video thumbnails, and YouTube videos.
2. WHEN a Public_Viewer selects a media item in the Gallery_Panel, THE Lightbox SHALL open and display the selected media item.
3. WHILE the Lightbox is open, THE Lightbox SHALL support swipe navigation between media items, pinch-zoom on images, and playback of videos.

### Requirement 22: Project Info Panel

**User Story:** As a Public_Viewer, I want a project information panel, so that I can read about the project and access its key details and links.

#### Acceptance Criteria

1. WHEN a Public_Viewer opens the Info_Panel, THE Info_Panel SHALL display live Project statistics, the Project description, price range, area range, amenities, a QR code, and social links.
2. WHERE the Project description exceeds the collapsed display length, THE Info_Panel SHALL provide a read-more control to reveal the full description.
3. WHEN the underlying Plot inventory changes, THE Info_Panel SHALL update the displayed Project statistics to reflect the current inventory.

### Requirement 23: QR Code Generation and Download

**User Story:** As an Admin_User, I want a QR code for the project link, so that I can place it on printed materials and let buyers download it.

#### Acceptance Criteria

1. THE Info_Panel SHALL generate a QR code that encodes the Project_Viewer URL.
2. WHEN a Public_Viewer activates the QR code download control, THE Info_Panel SHALL download the QR code as a PNG image.

### Requirement 24: Real-Time Inventory Updates

**User Story:** As a Public_Viewer, I want the map to reflect inventory changes as they happen, so that I always see accurate plot availability.

#### Acceptance Criteria

1. THE Project_Viewer SHALL subscribe to real-time updates of the Project's Plots from Firestore.
2. WHEN a Plot's data changes in Firestore, THE Map_Renderer SHALL update the affected Plot in the existing map source without recreating the source.
3. WHEN a Plot's Plot_Status changes in Firestore, THE Project_Viewer SHALL update the status summary counts and Info_Panel statistics to reflect the change.

### Requirement 25: GPS Location Display

**User Story:** As a Public_Viewer, I want to see my live location on the map, so that I can understand where I am relative to the plots.

#### Acceptance Criteria

1. WHEN a Public_Viewer initiates the location feature, THE Project_Viewer SHALL request location access and SHALL begin watching the device position.
2. WHILE the device position is available, THE Map_Renderer SHALL display a pulsing blue dot at the device location and an accuracy circle around the dot.
3. WHEN the device position updates, THE Map_Renderer SHALL move the blue dot and resize the accuracy circle to reflect the new position and accuracy.
4. IF location access is denied, THEN THE Project_Viewer SHALL inform the Public_Viewer that location is unavailable.

### Requirement 26: Near-Plot Notification

**User Story:** As a Public_Viewer, I want to be notified when I am standing on a plot, so that I know which plot I am physically located on.

#### Acceptance Criteria

1. WHEN the device location falls within the polygon of a Plot, THE Project_Viewer SHALL notify the Public_Viewer that the device is located on that Plot.

### Requirement 27: Dynamic Edge Dimension Labels

**User Story:** As a Public_Viewer, I want plot edge dimensions shown when zoomed in, so that I can see the measured length of each plot boundary.

#### Acceptance Criteria

1. WHILE the map zoom level is greater than or equal to 18, THE Map_Renderer SHALL display a dimension label on each edge of each visible Plot.
2. THE Map_Renderer SHALL compute each edge dimension label using the measured length and midpoint of the edge.
3. WHILE the map zoom level is less than 18, THE Map_Renderer SHALL hide the edge dimension labels.

### Requirement 28: Unit Preference Selection and Persistence

**User Story:** As a Public_Viewer, I want to choose my area measurement unit and have it remembered, so that areas display in my preferred unit across visits.

#### Acceptance Criteria

1. THE Project_Viewer SHALL allow a Public_Viewer to select a Unit_Preference among sqft, sqm, sqyd, acre, and gunta.
2. WHEN a Public_Viewer selects a Unit_Preference, THE Project_Viewer SHALL display all Plot areas in the selected Unit_Preference.
3. WHEN a Public_Viewer selects a Unit_Preference, THE Project_Viewer SHALL persist the Unit_Preference to localStorage.
4. WHEN the Project_Viewer loads and a persisted Unit_Preference exists in localStorage, THE Project_Viewer SHALL apply the persisted Unit_Preference.

### Requirement 29: Presentation Mode

**User Story:** As a Sales_Agent, I want a presentation mode that hides the interface, so that I can show the map cleanly during client meetings.

#### Acceptance Criteria

1. WHEN a Public_Viewer enables Presentation_Mode, THE Project_Viewer SHALL hide all interface chrome and SHALL display the map alone.
2. WHILE Presentation_Mode is active, WHEN a Public_Viewer taps the map or presses the Escape key, THE Project_Viewer SHALL exit Presentation_Mode and SHALL restore the interface chrome.

### Requirement 30: Landing Page

**User Story:** As a Public_Viewer, I want a marketing landing page at the root, so that I can learn about PlotVerse before opening a specific project.

#### Acceptance Criteria

1. WHEN a Public_Viewer requests the root path, THE Landing_Page SHALL display marketing content.
2. THE Landing_Page SHALL exclude the Project_Viewer map experience.

### Requirement 31: Per-Project Social and SEO Metadata

**User Story:** As an Admin_User, I want each project link to produce a rich preview when shared, so that shared links present the project attractively on social platforms.

#### Acceptance Criteria

1. WHEN a request is made for a Project_Viewer page, THE PlotVerse_Platform SHALL generate OG_Metadata for the Project containing a title, a description, and an image.
2. THE PlotVerse_Platform SHALL derive the OG_Metadata title and description from the Project's stored data.

### Requirement 32: Admin Authentication and Access Control

**User Story:** As an Admin_User, I want the admin panel protected by authentication, so that only authorized users can manage projects and leads.

#### Acceptance Criteria

1. WHEN an unauthenticated request is made for a path under `/admin`, THE PlotVerse_Platform SHALL deny access and SHALL redirect the request to authentication.
2. WHEN an authenticated Admin_User requests a path under `/admin`, THE Admin_Panel SHALL grant access according to the Admin_User's Admin_Role.
3. WHERE an Admin_User has the Admin_Role editor, THE Admin_Panel SHALL restrict the Admin_User from actions reserved for the superadmin Admin_Role.
4. THE PlotVerse_Platform SHALL enforce admin access control at the request middleware layer.

### Requirement 33: Admin Project Management

**User Story:** As an Admin_User, I want a dashboard to manage my projects and their contents, so that I can maintain the developments shown to buyers.

#### Acceptance Criteria

1. THE Admin_Panel SHALL provide management sections for Projects, Plots, Zones, gallery media, the CRM, and share links.
2. WHEN an Admin_User creates, updates, or deletes a Project, THE Admin_Panel SHALL persist the change to the projects collection.
3. WHEN an Admin_User updates a Plot, THE Admin_Panel SHALL persist the change to the plots collection.

### Requirement 34: Geospatial File Upload and Conversion

**User Story:** As an Admin_User, I want to upload plot boundaries from common geospatial file formats, so that I can populate a project's plots without manual drawing.

#### Acceptance Criteria

1. WHEN an Admin_User uploads a file in GeoJSON, JSON, KML, KMZ, SHP ZIP, DXF, or CSV format, THE File_Converter SHALL convert the file contents into GeoJSON.
2. WHEN the File_Converter produces GeoJSON, THE File_Converter SHALL enrich each feature with area values in sqft, sqm, and sqyd and a centroid.
3. WHEN the File_Converter produces GeoJSON, THE File_Converter SHALL validate that the coordinate reference system is WGS84 and that polygon rings are closed.
4. IF validation fails, THEN THE File_Converter SHALL report the validation errors to the Admin_User and SHALL withhold saving until the errors are resolved.
5. WHEN validation succeeds, THE File_Converter SHALL display a preview of the converted GeoJSON to the Admin_User before saving.
6. THE File_Converter SHALL allow the Admin_User to edit feature properties before saving.

### Requirement 35: GeoJSON Persistence and Rollback

**User Story:** As an Admin_User, I want saved plot data versioned with rollback, so that I can recover from an incorrect upload.

#### Acceptance Criteria

1. WHEN an Admin_User saves converted GeoJSON, THE Admin_Panel SHALL store the GeoJSON file in Firebase Storage and SHALL create or update the corresponding Plot documents in the plots collection.
2. WHEN an Admin_User saves converted GeoJSON, THE Admin_Panel SHALL retain the GeoJSON version in the Geojson_History, keeping the most recent 5 versions.
3. WHEN an Admin_User selects a version from the Geojson_History, THE Admin_Panel SHALL restore the Project's GeoJSON to the selected version.

### Requirement 36: Round-Trip Integrity of Converted GeoJSON

**User Story:** As an Admin_User, I want uploaded geometry to be preserved exactly through conversion and storage, so that displayed plots match the source data.

#### Acceptance Criteria

1. WHEN the File_Converter converts a valid source file to GeoJSON and the GeoJSON is serialized for storage and then read back, THE File_Converter SHALL produce a GeoJSON geometry equivalent to the converted geometry.
2. WHEN a GeoJSON file stored in Firebase Storage is read back into the Map_Renderer, THE Map_Renderer SHALL render Plot polygons matching the stored geometry.

### Requirement 37: Zone and Status Group Management

**User Story:** As an Admin_User, I want to manage zones and status groups, so that I can organize plots and create curated filter presets.

#### Acceptance Criteria

1. WHEN an Admin_User creates, updates, or deletes a Zone, THE Admin_Panel SHALL persist the change to the zones collection.
2. WHEN an Admin_User creates, updates, or deletes a Status_Group, THE Admin_Panel SHALL persist the change to the statusGroups collection.
3. WHEN an Admin_User assigns a Plot to a Zone, THE Admin_Panel SHALL persist the Zone reference on the Plot.

### Requirement 38: CRM Lead Management

**User Story:** As a Sales_Agent, I want to manage leads through a pipeline, so that I can track and progress each prospective buyer.

#### Acceptance Criteria

1. THE CRM SHALL display a list of Leads and a detail view for a selected Lead.
2. WHEN a Sales_Agent changes the Lead_Status of a Lead, THE CRM SHALL persist the new Lead_Status, where the permitted Lead_Status values are New, Contacted, Interested, Negotiating, Closed, and Lost.
3. WHEN a Sales_Agent adds a note to a Lead, THE CRM SHALL persist the note and SHALL record it in the Lead timeline.
4. THE CRM SHALL display a timeline of status changes and notes for each Lead.
5. WHEN a Sales_Agent requests a lead export, THE CRM SHALL produce a CSV file containing the Leads.
6. THE CRM SHALL display statistics summarizing the Leads by Lead_Status.

### Requirement 39: Gallery Management

**User Story:** As an Admin_User, I want to manage a project's gallery media, so that buyers see current photos and videos.

#### Acceptance Criteria

1. WHEN an Admin_User uploads an image or video to a Project gallery, THE Admin_Panel SHALL store the media in Firebase Storage and SHALL associate the media with the Project.
2. WHEN an Admin_User adds a YouTube video reference to a Project gallery, THE Admin_Panel SHALL associate the YouTube reference with the Project.
3. WHEN an Admin_User removes a media item from a Project gallery, THE Admin_Panel SHALL remove the association of the media item with the Project.

### Requirement 40: Progressive Web App Installation

**User Story:** As a Public_Viewer, I want to install PlotVerse on my device, so that I can open projects like a native app.

#### Acceptance Criteria

1. THE PlotVerse_Platform SHALL provide a PWA manifest enabling installation to the device home screen.
2. WHILE a Public_Viewer is on a mobile device, WHEN 30 seconds have elapsed on the Project_Viewer, THE Project_Viewer SHALL present an Add to Home Screen prompt.

### Requirement 41: Project Viewer Mobile Viewport Behavior

**User Story:** As a Public_Viewer, I want the project page to behave like a full-screen app on mobile, so that the map fills the screen without unwanted scrolling or zooming.

#### Acceptance Criteria

1. THE Project_Viewer SHALL set the viewport to disable user scaling.
2. THE Project_Viewer SHALL set the page height to 100 dynamic viewport height units and SHALL hide overflow.
