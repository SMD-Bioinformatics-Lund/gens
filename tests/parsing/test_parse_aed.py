import logging
from gens.load.annotations import parse_aed_file
from pathlib import Path

LOG = logging.getLogger(__name__)



def test_parse_aed_header_multiline(aed_multiline_header_path: Path):
    meta, records = parse_aed_file(aed_multiline_header_path, continue_on_error=True)

    assert len(meta) == 4
    interp = meta[3]
    LOG.debug(f"Results {interp}")
    assert interp["value"] == "row1\nrow2"
    assert len(records) == 2
