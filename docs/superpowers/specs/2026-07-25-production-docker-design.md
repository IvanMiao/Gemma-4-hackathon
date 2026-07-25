# Production-Style Local Docker Design

## Goal

Package the React dashboard and FastAPI service as production-style containers
that start together with one command:

```bash
docker compose up --build
```

The application is available at `http://localhost:8080`. The setup is intended
for repeatable local demos and evaluation, not hot-reload development.

## Architecture

Docker Compose runs two services:

- `frontend` builds the Vite application in a Node build stage and serves the
  immutable output with Nginx.
- `backend` installs the Python 3.12 project with `uv` and runs Uvicorn on the
  Compose network.

Only the frontend publishes a host port. Nginx serves the single-page
application and reverse-proxies `/api/` requests to `backend:8000`. The browser
therefore uses one origin and does not need to know Docker service names or
depend on CORS.

## Frontend Backend Selection

The existing dashboard uses the built-in `DemoDiagnosticGateway` when
`VITE_API_BASE_URL` is absent. The container build sets
`VITE_API_BASE_URL=/`, which selects `HttpDiagnosticGateway`.

The gateway resolves that relative value against `window.location.origin`
before constructing request URLs. This is the only application-code change
needed for container routing. Normal development without the variable
continues to use the synthetic demo gateway.

## Container Files

The implementation adds:

- `compose.yaml` to build, connect, health-check, and start both services.
- `Dockerfile.backend` for the Python/Uvicorn service.
- `Dockerfile.frontend` for the Vite build and Nginx runtime.
- `docker/nginx.conf` for SPA fallback, static asset serving, and `/api/`
  proxying.
- `.dockerignore` to keep local dependencies, VCS data, secrets, caches, model
  files, and generated artifacts out of build contexts.

The frontend image uses a locked dependency install from `package-lock.json`.
The backend image uses the checked-in `uv.lock` and installs the project
without development-only tooling.

## Configuration and Secrets

Compose reads optional runtime configuration from the repository `.env` file.
Relevant backend settings include model provider selection, model names, API
keys, and the optional OpenAI-compatible endpoint.

Secrets are passed as environment variables at runtime and are never copied
into either image. With no provider credentials or forced provider, the
backend retains its deterministic mock fallback. SerpAPI remains inactive
unless its existing network, opt-in, and key requirements are all satisfied.

## Startup and Health

The backend exposes a lightweight health check through its existing
`GET /api/state` endpoint. Compose marks the backend healthy only after that
endpoint responds successfully. The frontend depends on the healthy backend
before starting.

Nginx returns a failure for unavailable proxied API requests and continues to
serve the frontend shell. Existing frontend error handling surfaces backend
request failures to the user.

Both containers use normal foreground processes so Compose can deliver
shutdown signals and report failures directly.

## Verification

Implementation verification covers:

1. Build both images with `docker compose build`.
2. Start both services with `docker compose up`.
3. Confirm `http://localhost:8080` serves the React dashboard.
4. Confirm `http://localhost:8080/api/state` is proxied to FastAPI.
5. Run the dashboard diagnosis and inspection flow through the HTTP gateway.
6. Confirm the backend reports the deterministic mock provider when no API
   credentials are configured.
7. Stop the stack with `docker compose down`.

Existing checks also remain required:

```bash
npm run lint
npm test
npm run build
uv run python -m faultcapsule.benchmark --mock
```

## Non-Goals

- Hot reload or source bind mounts.
- TLS termination or public internet deployment.
- Bundling model weights into the backend image.
- Running Nginx and Uvicorn in one container.
- Changing the existing inference, network guard, or SerpAPI policies.
