# Geofencing and Vehicle Tracking System

## Node.js MVP Development Plan

## 1. Project overview

The project is a full-stack geofencing and vehicle-tracking application. Users can create polygonal geofences, register vehicles, submit vehicle locations, detect geofence entry and exit events, configure alert rules, receive alerts in real time, and review historical events.

The original requirements specify Go for the backend. This plan replaces Go with Node.js and TypeScript while preserving the required endpoint paths, HTTP methods, request bodies, response shapes, geospatial behavior, and WebSocket contract.

> **Assessment risk:** The evaluation criteria explicitly mention Go best practices. Obtain written confirmation that Node.js is acceptable before using this stack for the assessment. This restriction does not matter if the application is being built solely as a personal side project.

## 2. Goals

The system should:

- Manage polygonal geofences.
- Register and list vehicles.
- record vehicle location updates.
- Determine which geofences contain a vehicle.
- Detect geofence entry and exit transitions.
- Configure vehicle-specific and global alert rules.
- Deliver matching alerts to connected clients in real time.
- Retain geofence events for historical reporting.
- Provide an intuitive, responsive map-based interface.
- Run locally through Docker Compose.
- Be deployable as a containerized application.

## 3. MVP 1 definition

MVP 1 is complete when a user can:

1. Draw and save a geofence.
2. Filter and view saved geofences.
3. Register and list vehicles.
4. Submit a location for a vehicle.
5. View the vehicle's current location and containing geofences.
6. Configure an entry, exit, or combined alert rule.
7. Receive an immediate WebSocket notification after a matching boundary crossing.
8. Filter and view historical entry and exit events.
9. Run the API, frontend, and PostGIS database through Docker Compose.
10. Exercise all nine required REST endpoints plus `/ws/alerts`.
11. Follow `SETUP.md` to install, run, test, and use the system.

Authentication, rate limiting, Redis, background workers, route playback, fleet analytics, and advanced reporting are outside MVP 1.

## 4. Recommended technology stack

| Area | Technology | Reason |
|---|---|---|
| Runtime | Node.js 24 LTS | Stable LTS release with broad package compatibility |
| Language | TypeScript with strict mode | Strong types across requests, database records, and events |
| API framework | Fastify | Lightweight, fast, schema-oriented, and TypeScript-friendly |
| Validation | Zod | Runtime validation with inferred TypeScript types |
| Database | PostgreSQL with PostGIS | Reliable polygon storage, spatial indexing, and point-in-polygon operations |
| Database access | `pg` with repository modules | Keeps PostGIS queries explicit and easy to explain |
| Real-time transport | `@fastify/websocket` | Provides WebSocket support on the same Fastify server |
| Frontend | React, Vite, and TypeScript | Simple and efficient SPA development |
| Server-state management | TanStack Query | Loading, caching, mutation, error, and refetch support |
| Forms | React Hook Form with Zod | Typed and maintainable form validation |
| Component library | Material UI | Rapid development of a polished responsive dashboard |
| Map | Leaflet, React Leaflet, Leaflet-Geoman | Free interactive maps, polygon drawing, and markers |
| Backend tests | Vitest and Fastify `inject` | Fast unit and API integration testing |
| Frontend tests | Vitest and Testing Library | Component and hook testing |
| End-to-end tests | Playwright | Browser-level verification of the primary user journey |
| Containers | Docker and Docker Compose | Repeatable development and deployment environments |
| Package management | npm workspaces | Simple monorepo management |

Fastify is preferred over NestJS for this MVP. NestJS is useful for larger enterprise systems, but it would introduce additional abstractions and boilerplate without solving a requirement that Fastify cannot handle.

## 5. High-level architecture

```text
React dashboard
    |
    |-- REST requests -------------------+
    |                                    |
    `-- WebSocket connection             v
        /ws/alerts                  Fastify API
                                        |
                                        |-- request validation
                                        |-- domain services
                                        |-- spatial queries
                                        |-- transition detection
                                        `-- WebSocket broadcaster
                                                  |
                                                  v
                                      PostgreSQL + PostGIS
```

For MVP 1, the REST API and WebSocket server should run in one Node.js process. Matching alerts are broadcast through an in-memory connection manager after the database transaction commits.

When the application is scaled to multiple API instances, replace the in-memory broadcaster with Redis pub/sub or a durable message broker.

## 6. Suggested repository structure

```text
vehicle-geofencing/
|-- apps/
|   |-- api/
|   |   |-- src/
|   |   |   |-- app.ts
|   |   |   |-- server.ts
|   |   |   |-- config/
|   |   |   |-- db/
|   |   |   |-- modules/
|   |   |   |   |-- geofences/
|   |   |   |   |-- vehicles/
|   |   |   |   |-- alerts/
|   |   |   |   `-- violations/
|   |   |   |-- plugins/
|   |   |   `-- shared/
|   |   |-- migrations/
|   |   `-- test/
|   `-- web/
|       |-- src/
|       |   |-- api/
|       |   |-- components/
|       |   |-- features/
|       |   |   |-- dashboard/
|       |   |   |-- geofences/
|       |   |   |-- vehicles/
|       |   |   |-- alerts/
|       |   |   `-- history/
|       |   |-- hooks/
|       |   `-- routes/
|       `-- test/
|-- packages/
|   `-- contracts/
|-- docker-compose.yml
|-- SETUP.md
`-- README.md
```

The `contracts` package should contain shared enums and WebSocket message types. Required API response formats must remain exactly compatible with the specification.

## 7. Database design

### 7.1 `geofences`

| Column | Notes |
|---|---|
| `id` | Public ID such as `geo_<ulid>` |
| `name` | Required human-readable name |
| `description` | Nullable text |
| `category` | `delivery_zone`, `restricted_zone`, `toll_zone`, or `customer_area` |
| `boundary` | `geometry(Polygon, 4326)` |
| `status` | Defaults to `active` |
| `created_at` | UTC timestamp |

Create a GiST index on `boundary`.

### 7.2 `vehicles`

| Column | Notes |
|---|---|
| `id` | Public ID such as `veh_<ulid>` |
| `vehicle_number` | Required and unique |
| `driver_name` | Required |
| `vehicle_type` | Required |
| `phone` | Required |
| `status` | Defaults to `active` |
| `created_at` | UTC timestamp |

### 7.3 `vehicle_locations`

| Column | Notes |
|---|---|
| `id` | Primary key |
| `vehicle_id` | Foreign key to `vehicles` |
| `position` | `geometry(Point, 4326)` |
| `recorded_at` | Timestamp supplied by the location source |
| `created_at` | Server insertion time |

Create an index on `(vehicle_id, recorded_at DESC)`. A GiST index on `position` can be added if future queries need it.

### 7.4 `vehicle_geofence_state`

This table stores current known membership and makes transition detection explicit.

| Column | Notes |
|---|---|
| `vehicle_id` | Foreign key to `vehicles` |
| `geofence_id` | Foreign key to `geofences` |
| `is_inside` | Current membership state |
| `last_changed_at` | Time of the last entry or exit |

Use `(vehicle_id, geofence_id)` as a unique key.

### 7.5 `alert_rules`

| Column | Notes |
|---|---|
| `id` | Public ID such as `alert_<ulid>` |
| `geofence_id` | Required foreign key |
| `vehicle_id` | Nullable; `NULL` means every vehicle |
| `event_type` | `entry`, `exit`, or `both` |
| `status` | Defaults to `active` |
| `created_at` | UTC timestamp |

### 7.6 `geofence_events`

| Column | Notes |
|---|---|
| `id` | Public ID such as `viol_<ulid>` or `evt_<ulid>` |
| `vehicle_id` | Foreign key to `vehicles` |
| `geofence_id` | Foreign key to `geofences` |
| `event_type` | `entry` or `exit` |
| `position` | `geometry(Point, 4326)` |
| `occurred_at` | Location timestamp associated with the crossing |
| `created_at` | Server insertion time |

This table supplies `/violations/history`. Store both entries and exits even though the endpoint uses the word “violations.”

## 8. Required endpoints

Do not rename or restructure these endpoints:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/geofences` | Create a polygonal geofence |
| `GET` | `/geofences` | List and optionally filter geofences |
| `POST` | `/vehicles` | Register a vehicle |
| `GET` | `/vehicles` | List vehicles |
| `POST` | `/vehicles/location` | Record a location and detect boundary crossings |
| `GET` | `/vehicles/location/{vehicle_id}` | Return current location and geofence membership |
| `POST` | `/alerts/configure` | Create an alert rule |
| `GET` | `/alerts` | List and filter alert rules |
| `GET` | `/violations/history` | Return filtered historical crossing events |
| WebSocket | `/ws/alerts` | Push matching alerts to connected clients |

Extra health or development endpoints may be added, but required endpoints and field names must not be changed.

## 9. Geospatial rules

### 9.1 Coordinate order

The API specification uses:

```json
[latitude, longitude]
```

PostGIS and GeoJSON normally use:

```text
[longitude, latitude]
```

Convert explicitly when creating a point:

```sql
ST_SetSRID(ST_MakePoint($longitude, $latitude), 4326)
```

When creating a polygon, transform each incoming `[latitude, longitude]` pair into `[longitude, latitude]` before passing GeoJSON to PostGIS. Convert the coordinates back when returning API responses.

### 9.2 Boundary behavior

Use `ST_Covers(geofence, point)` for membership checks. This treats a point on the polygon boundary as inside and avoids the boundary behavior of `ST_Contains`.

Document and test this decision so that entry and exit behavior is deterministic.

### 9.3 Polygon validation

Validate that:

- Coordinates are an array of latitude/longitude pairs.
- There are at least four points.
- There are at least three unique vertices.
- The first and last coordinates are identical.
- Latitude is between `-90` and `90`.
- Longitude is between `-180` and `180`.
- The polygon is not self-intersecting.
- PostGIS reports the resulting geometry as valid.

Return a user-friendly `400` response when validation fails.

## 10. Location processing and transition detection

`POST /vehicles/location` is the central workflow.

1. Validate the vehicle ID, latitude, longitude, and ISO 8601 timestamp.
2. Start a database transaction.
3. Lock the vehicle row so concurrent updates for the same vehicle are processed serially.
4. Insert the location into `vehicle_locations`.
5. Query every active geofence for which `ST_Covers(boundary, point)` is true.
6. Load the vehicle's previous geofence membership.
7. Calculate the set differences:

```text
entered = current geofences - previous geofences
exited  = previous geofences - current geofences
```

8. Insert entry and exit records into `geofence_events`.
9. Update `vehicle_geofence_state`.
10. Load matching active alert rules.
11. Commit the transaction.
12. Queue matching WebSocket messages for asynchronous broadcast.
13. Return all geofences that currently contain the vehicle.

An alert rule matches when:

```text
rule.geofence_id equals event.geofence_id
AND (rule.vehicle_id is null OR rule.vehicle_id equals event.vehicle_id)
AND (rule.event_type equals event.event_type OR rule.event_type is "both")
```

Do not broadcast an event before committing the transaction. Otherwise a client could receive an alert for data that is subsequently rolled back.

## 11. Nanosecond timing

Every REST response, including validation errors, 404 responses, and server errors, must contain `time_ns` as a string.

Use Node.js's monotonic high-resolution timer:

```ts
const startTime = process.hrtime.bigint();

// Run request handling.

const timeNs = (process.hrtime.bigint() - startTime).toString();
```

Implement this through Fastify request/response hooks and the global error handler so individual route handlers do not duplicate timing code.

The required WebSocket message format does not contain `time_ns`; it is not an HTTP API response.

## 12. WebSocket design

The WebSocket endpoint must be:

```text
/ws/alerts
```

The backend should:

- Maintain a collection of open client sockets.
- Add clients when they connect.
- Remove clients after close or error events.
- Broadcast only events with matching alert rules.
- Isolate send failures so one broken client does not affect other clients.
- Close connections cleanly during server shutdown.
- Use ping/pong heartbeats if supported by the deployment environment.

The frontend should:

- Connect when the application starts.
- Validate each incoming message.
- Add valid alerts to a live feed.
- Show a toast or banner immediately.
- Display connected, reconnecting, and disconnected states.
- Reconnect with capped exponential backoff.
- Avoid opening duplicate sockets during React development re-renders.

For MVP 1, retain the latest 50 live alerts in memory. Fetch long-term history from `/violations/history`.

## 13. Frontend plan

### 13.1 Main areas

Build a dashboard with:

- Overview
- Geofences
- Vehicles
- Alert rules
- Violation history

### 13.2 Map workspace

The primary map should support:

- Displaying stored geofences as polygons.
- Category-specific polygon styles.
- Displaying vehicle positions as markers.
- Drawing a polygon for a new geofence.
- Clicking the map to select a vehicle location.
- Manually entering latitude and longitude.
- Selecting a vehicle before posting a location.
- Displaying all geofences that contain the selected vehicle.
- Displaying a legend that does not rely on color alone.

### 13.3 State management

Use TanStack Query for server state:

- Query geofences, vehicles, alert rules, and history.
- Use mutations for create and update actions.
- Invalidate relevant queries after successful mutations.
- Display mutation errors near the corresponding form.

Use local React state for temporary UI state such as open dialogs, selected tabs, and draft map points. Redux is unnecessary for MVP 1.

### 13.4 User experience requirements

Every operation should provide:

- Loading feedback.
- Success confirmation.
- Clear validation errors.
- Empty states.
- Retry behavior where appropriate.
- Responsive layouts for laptop and tablet widths.
- Accessible labels and keyboard navigation for form controls.

## 14. Step-by-step development guide

### Phase 0: Confirm scope and design

- Obtain confirmation that Node.js is acceptable.
- Copy the required endpoints and response examples into a checklist.
- Define boundary points as inside.
- Document coordinate-order conversion.
- Sketch the dashboard and demonstration flow.

**Exit condition:** The scope and MVP 1 acceptance criteria are written down.

### Phase 1: Bootstrap the monorepo

- Create npm workspaces for `apps/api`, `apps/web`, and `packages/contracts`.
- Enable strict TypeScript.
- Configure ESLint and Prettier.
- Add `.env.example` files.
- Add Docker Compose with PostGIS.
- Add database configuration and a migration runner.
- Add Fastify structured logging.
- Add a `/health` endpoint.

**Exit condition:** The API connects to PostGIS and the frontend can call the health endpoint.

### Phase 2: Database and geofence API

- Add the PostGIS extension in the initial migration.
- Create the geofence table and spatial index.
- Implement geofence validation.
- Implement `POST /geofences`.
- Implement `GET /geofences` with category filtering.
- Convert coordinates correctly in both directions.

**Exit condition:** A valid polygon can be created and retrieved in the required response format.

### Phase 3: Vehicle API

- Create the vehicle table.
- Implement `POST /vehicles`.
- Implement `GET /vehicles`.
- Implement `GET /vehicles/location/{vehicle_id}`.
- Return `409` for duplicate vehicle numbers.
- Return `404` for unknown vehicles.

**Exit condition:** A vehicle can be registered and retrieved before and after receiving a location.

### Phase 4: Location and event detection

- Add location, membership-state, and event tables.
- Implement transactional location storage.
- Query containing geofences with `ST_Covers`.
- Implement entry and exit set differences.
- Persist events and current membership.
- Add concurrency protection for updates to the same vehicle.

**Exit condition:** Moving a vehicle outside, inside, and outside creates exactly one entry and one exit event.

### Phase 5: Alert rules and WebSocket

- Create the alert-rule table.
- Implement `POST /alerts/configure`.
- Implement `GET /alerts` with filters.
- Implement `/ws/alerts`.
- Add the in-memory connection manager.
- Match alert rules after event creation.
- Broadcast only after the transaction commits.

**Exit condition:** Two connected browser tabs receive the same matching alert without delaying the location response.

### Phase 6: History API

- Implement `/violations/history` filters.
- Validate date ranges.
- Enforce a default limit of 50 and a maximum of 500.
- Sort deterministically by timestamp and ID in descending order.
- Return the filtered `total_count`.

If strict evaluation permits additional optional parameters, add `offset` for frontend pagination without changing required parameters.

**Exit condition:** Vehicle, geofence, date-range, and limit filters work independently and together.

### Phase 7: Frontend shell

- Add routing and responsive navigation.
- Configure the shared API client.
- Configure TanStack Query.
- Add a global error boundary and toast provider.
- Create reusable loading, error, and empty-state components.
- Build the five main dashboard areas.

**Exit condition:** All backend resources can be listed from the UI.

### Phase 8: Map workflow

- Render stored geofences.
- Add geofence polygon drawing.
- Add geofence creation form fields.
- Display current vehicle markers.
- Add vehicle selection.
- Add click-to-update vehicle location.
- Add manual coordinate input as a fallback.
- Display the resulting containing geofences.

**Exit condition:** The geofence and vehicle-location workflows can be completed without an external API client.

### Phase 9: Real-time frontend

- Implement a `useAlertSocket` hook.
- Connect to the configured WebSocket URL.
- Validate incoming payloads.
- Show toast notifications.
- Add a live-alert feed.
- Implement capped exponential reconnection.
- Display socket connection status.

**Exit condition:** Crossing a configured boundary produces a visible frontend alert without manual refresh.

### Phase 10: Docker and deployment

- Add multi-stage API and frontend Dockerfiles.
- Run production containers as non-root users.
- Add a PostGIS health check.
- Ensure the API waits for database readiness.
- Run migrations during deployment in a controlled step.
- Configure REST and WebSocket URLs with environment variables.
- Verify secure production connections use `wss://`.

**Exit condition:** A clean machine can start the system with Docker Compose, and the deployed application supports WebSocket connections.

### Phase 11: Documentation and demonstration

- Write `SETUP.md`.
- Add curl examples for all endpoints.
- Document WebSocket testing.
- Add frontend usage instructions.
- Add a concise architecture explanation.
- Create deterministic seed data.
- Rehearse the demonstration.
- Record the required video.

**Exit condition:** Another developer can run and demonstrate the application using only the repository documentation.

## 15. Testing plan

### 15.1 Unit tests

Test:

- Latitude and longitude validation.
- Polygon closure.
- Minimum and unique vertex requirements.
- Category and event-type validation.
- Entry and exit set-difference logic.
- Alert-rule matching.
- WebSocket message construction.
- Nanosecond timing serialization.

### 15.2 Database and API integration tests

Test:

- Point outside a polygon.
- Point inside a polygon.
- Point on a polygon edge.
- Point on a polygon vertex.
- Point inside overlapping geofences.
- Outside to outside creates no event.
- Outside to inside creates one entry.
- Inside to inside creates no duplicate event.
- Inside to outside creates one exit.
- First recorded location inside creates an entry.
- Global alert rules.
- Vehicle-specific alert rules.
- `both` event rules.
- Duplicate vehicle registration.
- Unknown vehicle or geofence IDs.
- Every response contains a string `time_ns`.
- History filters and total counts.
- Concurrent location updates for one vehicle.

### 15.3 WebSocket integration tests

Test:

- Multiple clients receive an alert.
- No alert is sent without a matching rule.
- A disconnected client is removed.
- One failed connection does not interrupt other sends.
- Entry and exit payloads match the required structure.

### 15.4 Frontend tests

Test:

- Form validation and error display.
- Successful geofence and vehicle creation.
- Loading and empty states.
- Map selection state.
- WebSocket reconnect state.
- Alert toast and feed rendering.
- History filters.

### 15.5 End-to-end test

Automate at least one primary journey:

```text
Create restricted geofence
-> register vehicle
-> configure entry and exit alert
-> submit an outside location
-> submit an inside location
-> observe entry notification
-> submit an outside location
-> observe exit notification
-> verify both events in filtered history
```

A reasonable MVP target is 25–35 backend tests plus one or two full end-to-end scenarios.

## 16. Suggested four-week schedule

### Week 1: Foundation

- Monorepo and tooling
- Docker and PostGIS
- Migrations
- Geofence endpoints
- Vehicle endpoints
- Initial unit and integration tests

### Week 2: Core domain behavior

- Location processing
- Spatial membership queries
- Entry and exit state machine
- Alert configuration
- WebSocket broadcasting
- History endpoint

### Week 3: Frontend

- Dashboard shell
- Geofence map drawing
- Vehicle management
- Location updates
- Live alerts
- History filters

### Week 4: Delivery

- End-to-end tests
- Responsive and error-state polish
- Production Docker builds
- Deployment
- Documentation
- Demo rehearsal
- Video recording

If time becomes limited, protect the complete location-crossing-to-live-alert journey first. It demonstrates the project's most important technical behavior.

## 17. Demonstration flow

Use a deterministic demonstration sequence:

```text
Create a restricted geofence on the map
-> register a vehicle
-> configure a rule for entry and exit
-> show the frontend WebSocket as connected
-> place the vehicle outside the polygon
-> move the vehicle inside
-> show the entry notification
-> move the vehicle outside
-> show the exit notification
-> open violation history
-> filter history by vehicle and geofence
-> show the same environment starting with Docker Compose
```

The implementation walkthrough should explain:

- Repository structure.
- Database schema.
- Coordinate conversion.
- `ST_Covers` and spatial indexes.
- The transaction used for location processing.
- Entry/exit transition detection.
- Alert-rule matching.
- WebSocket broadcasting and reconnection.
- Testing strategy.
- Known limitations and the scaling roadmap.

## 18. Documentation checklist

`SETUP.md` should include:

- Prerequisites and supported versions.
- Required environment variables.
- Local installation commands.
- Database startup and migration commands.
- API and frontend development commands.
- Docker Compose instructions.
- Example curl requests for all nine endpoints.
- WebSocket testing instructions.
- Frontend usage guide.
- Test commands.
- Troubleshooting guidance.

`README.md` should include:

- Project summary.
- Screenshots or a short GIF.
- Architecture summary.
- Technology choices.
- Quick-start instructions.
- Deployed frontend and API links.
- Video link.
- Known limitations.
- Future roadmap.

## 19. Deployment checklist

- Build the backend image successfully.
- Run the image locally before publishing it.
- Push the required backend image to Docker Hub.
- Deploy the API to a platform supporting persistent WebSocket connections.
- Use a PostgreSQL service with PostGIS enabled.
- Configure CORS for the deployed frontend URL.
- Configure the frontend API and WebSocket URLs.
- Confirm HTTPS correctly upgrades to `wss://`.
- Verify database migrations on a clean database.
- Run the full demonstration against the deployed environment.
- Keep credentials and secrets outside the repository.

## 20. MVP 1 acceptance checklist

### Backend

- [ ] All nine required REST endpoints work.
- [ ] All REST responses include string `time_ns`.
- [ ] Required request and response names remain unchanged.
- [ ] Polygon validation is implemented.
- [ ] Coordinate conversion is correct.
- [ ] Spatial membership uses PostGIS.
- [ ] Entry and exit transitions are accurate.
- [ ] Matching alerts are stored and broadcast.
- [ ] History filters and limits work.
- [ ] Errors are clear and consistently structured.

### Real time

- [ ] `/ws/alerts` accepts multiple clients.
- [ ] Matching entry and exit alerts arrive immediately.
- [ ] Disconnections are cleaned up.
- [ ] Frontend reconnection works.
- [ ] WebSocket payloads match the required format.

### Frontend

- [ ] Geofences can be drawn and created.
- [ ] Geofences can be listed and filtered.
- [ ] Vehicles can be registered and listed.
- [ ] Vehicle locations can be updated from the map or form.
- [ ] Current geofence membership is displayed.
- [ ] Alert rules can be created and listed.
- [ ] Live alert toasts and feed work.
- [ ] History can be filtered.
- [ ] Loading, empty, success, and error states are present.
- [ ] The interface is responsive.

### Quality and delivery

- [ ] Critical domain behavior has automated tests.
- [ ] The primary journey has an end-to-end test.
- [ ] Docker Compose starts the complete system.
- [ ] Production Docker images build successfully.
- [ ] `SETUP.md` is complete.
- [ ] The deployed application has been manually verified.
- [ ] The demonstration video covers all required sections.

## 21. Post-MVP roadmap

Add improvements in this order:

1. API-key or JWT authentication.
2. Rate limiting on vehicle location updates.
3. Cursor-based pagination.
4. Redis pub/sub for multiple API replicas.
5. A durable event queue with retries.
6. Route playback and vehicle simulation.
7. Database partitioning for large location histories.
8. Metrics, tracing, and alert-delivery monitoring.
9. Vehicle groups and bulk alert rules.
10. Automated CI/CD and deployment promotion.

## 22. Recommended focus for learning

The highest-value engineering work in this project is:

- Modeling geospatial data in PostGIS.
- Converting coordinate orders correctly.
- Designing a transactional entry/exit state machine.
- Handling concurrent location updates safely.
- Publishing committed events asynchronously.
- Managing WebSocket connection lifecycles.
- Implementing resilient frontend reconnection.
- Testing geospatial edge cases and the complete user journey.

Forms and dashboard styling matter for presentation, but the database transaction, spatial query, transition detection, and real-time delivery are the core of the system.

## 23. Reference documentation

- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [Fastify TypeScript reference](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [`@fastify/websocket`](https://github.com/fastify/fastify-websocket)
- [PostGIS `ST_Covers`](https://postgis.net/docs/ST_Covers.html)
- [TanStack Query for React](https://tanstack.com/query/latest/docs/framework/react/overview)

