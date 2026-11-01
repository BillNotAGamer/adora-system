"""Cross-platform event-loop selection for async psycopg."""

import asyncio
import platform


def platform_loop_factory() -> asyncio.AbstractEventLoop:
    """Use a selector loop on Windows because psycopg async rejects Proactor loops."""

    if platform.system() == "Windows":
        return asyncio.SelectorEventLoop()
    return asyncio.new_event_loop()
