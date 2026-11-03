"""Catalog-domain errors translated by the HTTP adapter."""


class CatalogError(Exception):
    """Base class for expected catalog failures."""


class CatalogNotFoundError(CatalogError):
    """A requested catalog entity does not exist or is not public."""


class CatalogConflictError(CatalogError):
    """A catalog mutation conflicts with existing state or constraints."""


class CatalogPolicyError(CatalogError):
    """A requested lifecycle transition violates catalog policy."""
