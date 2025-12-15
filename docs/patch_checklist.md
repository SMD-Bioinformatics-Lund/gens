# Gens patch

For minor and major version updates, refer to the full [update_checklist](https://github.com/SMD-Bioinformatics-Lund/gens/blob/master/docs/update_checklist.md).

- [ ] The full diff has been read through.
- [ ] The changes have been manually tested.
- [ ] All GitHub CI tests are passing.
- [ ] The changes have been run through a colleague or minimally through an LLM such as Codex.
- [ ] For bug fixes. Consider to prevent future regression:
    - [ ] Relevant CLI-, utility and backend changes are covered by unit tests.
    - [ ] Update `docs/update_checklist.md`.

In the Gens repo, update the version in:

- [ ] `package.json`
- [ ] `__version__.py`

Post merge:

- [ ] Tag
- [ ] Make a release
- [ ] Build and deploy a container

```bash
docker build -t clinicalgenomicslund/gens:<version> .
docker push clinicalgenomicslund/gens:<version>
```
