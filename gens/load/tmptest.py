from gens.load.transcripts import build_transcripts
from gens.models.genomic import GenomeBuild

def main():
    print("hello")
    transcr_file = "/home/jakob/src/gens/dump/MANE.GRCh38.v1.4.ensembl_genomic.gtf"
    mane_file = "/home/jakob/src/gens/dump/MANE.GRCh38.v1.4.summary.txt"
    genome_build = GenomeBuild(38)

    transcr_file_fh = open(transcr_file)
    mane_fh = open(mane_file)

    build_transcripts(transcr_file_fh, mane_fh, genome_build)

    transcr_file_fh.close()
    mane_fh.close()

if __name__ == "__main__":
    main()
