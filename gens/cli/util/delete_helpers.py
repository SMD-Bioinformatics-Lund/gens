import click

from gens.crud.samples import delete_sample, get_sample_ids_for_case_and_build
from gens.db.collections import SAMPLES_COLLECTION
from gens.models.genomic import GenomeBuild


def delete_case_samples(
    db, case_id: str, genome_build: GenomeBuild, force: bool
) -> int:
    samples_c = db.get_collection(SAMPLES_COLLECTION)
    samples_to_delete = get_sample_ids_for_case_and_build(
        samples_c=samples_c,
        case_id=case_id,
        genome_build=genome_build,
    )

    if not samples_to_delete:
        raise click.ClickException(
            f"No samples found for case_id '{case_id}' and genome build '{genome_build}'"
        )

    if not force:
        click.echo("The following samples will be removed:")
        for sample in samples_to_delete:
            click.echo(f" - {sample}")
        if not click.confirm("Proceed with deletion?", default=False):
            click.echo("Aborted.")
            return 0

    for sample_to_delete_id in samples_to_delete:
        delete_sample(
            db=db,
            sample_id=sample_to_delete_id,
            case_id=case_id,
            genome_build=genome_build,
        )
    return len(samples_to_delete)
