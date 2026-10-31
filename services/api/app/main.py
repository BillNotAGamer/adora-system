"""ADORA FastAPI application factory and ASGI entry point."""

from typing import cast

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.types import ExceptionHandler

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import (
    http_error_handler,
    unhandled_error_handler,
    validation_error_handler,
)
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    application = FastAPI(
        title="ADORA API",
        version="1.0.0",
        description="Authoritative API contract for ADORA web and mobile clients.",
    )
    application.add_middleware(RequestContextMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.add_exception_handler(
        RequestValidationError, cast(ExceptionHandler, validation_error_handler)
    )
    application.add_exception_handler(HTTPException, cast(ExceptionHandler, http_error_handler))
    application.add_exception_handler(Exception, cast(ExceptionHandler, unhandled_error_handler))
    application.include_router(api_router, prefix=settings.api_v1_prefix)
    return application


app = create_app()
