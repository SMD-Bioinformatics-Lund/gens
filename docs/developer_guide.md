# Developer guide

Information for contributors to the Gens project.

## Organization

The repository contains of two main parts. The `assets` directory holds the Typescript front-end code and related build configurations.
The `gens` directory implements the Flask server and REST API built in FastAPI.


## The data flow

The raw data is parsed and served by a Flask backend. A FastAPI layer exposes endpoints with which the front-end communicates.
The client interacts with the API as implemented in `api.ts` and caches much of the data to minimize network requests.

## Development environment

```
npm install
npm run typecheck
npm run lint
npm run build
```
