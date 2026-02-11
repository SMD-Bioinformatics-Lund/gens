from pathlib import Path

import click
import yaml
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from gens.models.genomic import GenomeBuild
from gens.models.sample import SampleSex


class YamlConfigModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CaseSampleAnnotationConfig(YamlConfigModel):
    file: Path
    name: str


class CaseSampleConfig(YamlConfigModel):
    sample_id: str
    baf: Path
    coverage: Path
    sample_type: str | None = None
    sex: SampleSex | None = None
    meta_files: list[Path] = Field(default_factory=list)
    sample_annotations: list[CaseSampleAnnotationConfig] = Field(default_factory=list)


class CaseLoadConfig(YamlConfigModel):
    case_id: str
    genome_build: GenomeBuild
    samples: list[CaseSampleConfig]


def load_case_config(config_file: Path) -> CaseLoadConfig:
    if not config_file.is_file():
        raise click.UsageError(f"Case config {config_file} must be a file")

    try:
        with open(config_file, encoding="utf-8") as config_fh:
            raw_config = yaml.safe_load(config_fh)
    except yaml.YAMLError as err:
        raise click.UsageError(
            f"Failed to parse YAML file {config_file}: {err}"
        ) from err

    if not isinstance(raw_config, dict):
        raise click.UsageError("Case YAML must contain a top-level mapping")

    try:
        case_config = CaseLoadConfig.model_validate(raw_config)
    except ValidationError as err:
        raise click.UsageError(f"Invalid case YAML: {err}") from err

    if len(case_config.samples) == 0:
        raise click.UsageError("Case YAML must define at least one sample")

    return case_config
