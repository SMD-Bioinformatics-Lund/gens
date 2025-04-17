"""Manages possible exceptions."""


class ConfigurationException(BaseException):
    """Configuration error."""


class DatabaseException(BaseException):
    """Paranet class for database releated errors."""


class GraphException(BaseException):
    """Parent class for graph and coordinate exceptions."""


class RegionParserException(GraphException):
    """Errors when parsing regions."""


class NoRecordsException(GraphException):
    """Record related error."""


class SampleNotFoundError(Exception):
    """The sample was not found in the database."""

    def __init__(self, message: str, sample_id: str):
        super().__init__(message)

        self.sample_id = sample_id


class NonUniqueIndexError(Exception):
    """A similar index already exists in the database."""

    def __init__(self, message: str, sample_id: str, case_id: str, genome_build: str):
        super().__init__(message)

        self.sample_id = sample_id
        self.case_id = case_id
        self.genome_build = genome_build
