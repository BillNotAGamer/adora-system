"""Identity application errors translated by the HTTP adapter."""


class IdentityError(RuntimeError):
    pass


class DuplicateEmailError(IdentityError):
    pass


class InvalidCredentialsError(IdentityError):
    pass


class InactiveAccountError(IdentityError):
    pass


class InvalidRefreshTokenError(IdentityError):
    pass


class InvalidAccessTokenError(IdentityError):
    pass
