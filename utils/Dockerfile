FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    procps \
    tabix \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Uncomment if you want to output bigwig files
# This is currently not supported as input in Gens itself, just experimental
# RUN wget -O /usr/local/bin/bedGraphToBigWig \
#     http://hgdownload.soe.ucsc.edu/admin/exe/linux.x86_64/bedGraphToBigWig && \
#     chmod +x /usr/local/bin/bedGraphToBigWig

WORKDIR /app

COPY utils/generate_gens_data.py /usr/local/bin
RUN chmod +x /usr/local/bin/generate_gens_data.py

CMD ["python3"]
