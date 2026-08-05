# Security Policy

Please report suspected vulnerabilities through GitHub's
[private vulnerability reporting](https://github.com/meter-ac/my.meter.ac/security/advisories/new).
Do not open a public issue for a vulnerability that has not yet been disclosed.

This project is a static browser application and has no deployment secrets. The
read-only InfluxDB client credential committed in the source is intentionally
public and is also exposed by the production user interface.
