"""Cross-platform event-loop selection for async psycopg."""

import asyncio
import sys


def platform_loop_factory() -> asyncio.AbstractEventLoop:
    """Use a selector loop on Windows because psycopg async rejects Proactor loops."""

    if sys.platform == "win32":
        return asyncio.SelectorEventLoop()
    return asyncio.new_event_loop()
