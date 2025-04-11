"""Utility functions and classes for click commands."""

import click


class ChoiceType(click.Choice):
    """Custom input type for click that returns genome build enum."""

    name = "genome build"

    def __init__(self, enum):
        super().__init__(list(map(str, enum)))
        self.enum = enum

    def convert(self, value: str, param, ctx):
        """Convert str to genome build"""

        value = super().convert(value, param, ctx)
        return next(v for v in self.enum if str(v) == value)
