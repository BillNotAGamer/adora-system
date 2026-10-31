# Local containers

The root `compose.yaml` is the only local Compose entry point. Both ports bind to loopback and both
services use named volumes. PostgreSQL 18 deliberately mounts `/var/lib/postgresql`; do not change it
to the legacy `/var/lib/postgresql/data` location.
