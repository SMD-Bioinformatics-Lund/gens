##################
# BUILDER PYTHON #
##################

FROM python:3.12 AS python-builder

# Set build variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /usr/src/app

COPY gens gens/
COPY README.md LICENSE pyproject.toml ./

RUN apt-get update &&                                                     \
    apt-get upgrade -y &&                                                 \
    apt-get install -y --no-install-recommends python3-pip                \
    python3-wheel &&                                                      \
    pip install --no-cache-dir --upgrade pip &&                           \
    pip install --no-cache-dir hatch &&                                   \
    hatch build -t wheel /usr/src/app/wheels
    #pip wheel --no-cache-dir --no-deps --wheel-dir /usr/src/app/wheels  --requirement requirements.txt  \


################
# BUILDER NODE #
################

FROM node:20.8.1-alpine AS node-builder
WORKDIR /usr/src/app
COPY package.json package-lock.json webpack.config.cjs gulpfile.js tsconfig.json ./
COPY frontend frontend
RUN npm install && npm run build

#########
# FINAL #
#########

FROM python:3.12-slim

LABEL base_image="python:3.12-slim"
LABEL about.home="https://github.com/Clinical-Genomics-Lund/Gens"

# Run commands as non-root user
# Create non-root user to run Gens
RUN groupadd --gid 1000 worker \
    && useradd -g worker --uid 1000 --shell /user/sbin/nologin --create-home worker

# Copy project to worker dir
WORKDIR /home/worker

# Copy pyhon wheels
COPY --from=python-builder /usr/src/app/wheels /wheels

# Install production dependencies
RUN apt-get update &&                              \
    apt-get install -y ssh sshfs &&                \
    pip install --no-cache-dir --upgrade pip &&    \
    pip install --no-cache-dir /wheels/* &&        \
    pip install --no-cache-dir gunicorn &&         \
    rm -rf /var/lib/apt/lists/* &&                 \
    rm -rf /wheels

# copy compiled web assetes
COPY --from=node-builder /usr/src/app/build/css/error.min.css gens/static/css/
COPY --from=node-builder /usr/src/app/build/css/home.min.css /usr/src/app/build/css/landing.min.css /usr/src/app/build/css/about.min.css gens/blueprints/home/static/
COPY --from=node-builder /usr/src/app/build/*/gens.min.* gens/blueprints/gens/static/

# make mountpoints and change ownership of app
RUN mkdir -p /access /fs1/results /fs1/results_dev && \
    chown -R worker:worker /access /fs1 /fs1/results_dev

# Setup non-root user and variables
USER worker

ENV GUNICORN_WORKERS=1
ENV GUNICORN_THREADS=1
ENV GUNICORN_BIND="0.0.0.0:5000"
ENV GUNICORN_TIMEOUT=400

CMD gunicorn -k uvicorn.workers.UvicornWorker \
    --workers=$GUNICORN_WORKERS \
    --bind=$GUNICORN_BIND  \
    --threads=$GUNICORN_THREADS \
    --timeout=$GUNICORN_TIMEOUT \
    --chdir /home/worker/ \
    --proxy-protocol \
    --forwarded-allow-ips="10.0.2.100,127.0.0.1" \
    --log-syslog \
    --access-logfile - \
    --error-logfile - \
    --log-level="warning" \
    gens.wsgi:app
