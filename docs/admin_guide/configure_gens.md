# Configuration of Gens

Gens can be configured using environment variables, a dotfile or with a separate toml file. To use a custom toml, specify the path to the file with the environment variable CONFIG_FILE.

The configs are read in the following priority order,

1.	Environment variables
2.	Dotfile
3.	Custom toml
4.	Default configuration (stored in config.toml)

Example of how to use environment variables in combination with docker.

```yaml
services:
  gens:
    environment:
      - GENS_DB__CONNECTION=mongodb://mongodb:27017/"
```

Example of how-to setup Gens with a custom configuration in a docker environment.

```yaml
services:
  gens:
    environment:
      - CONFIG_FILE=/home/worker/user.conf.toml
    volumes:
      - ./user.conf.toml:/home/worker/user.conf.toml
```

### Example config file

```
variant_url = "http://localhost:8000/scout"
authentication = "oauth"
secret_key = "change-this-in-production"
auth_user_db = "gens"
gens_api_url = "http://localhost:8080/gens/api"
main_sample_types = ["proband", "tumor"]

[gens_db]
connection = "mongodb://mongodb:27017/gens"

[variant_db]
connection = "mongodb://mongodb:27017/scout"

[default_profiles]
"proband+relative" = "profiles/proband_relative.json"
```

## Options

Configuration options. Note that double underscores (`__`) are used to denote sub-categories, such as **gens_db** and **oauth**, when using environment variables. For example, the envionment variable name for configuring Gens mongodb connection is `GENS_DB__CONNECTION` (`<SUB-CATEGORY>__<VARIABLE>`).

- **scout_url**, base url to Scout.
- **authentication**, authentication method "oauth", "ldap", "simple", "disabled"
- **secret_key**, Flask session secret. Set a unique value in production.
- **auth_user_db**, database used for login user lookups: "gens" (default) or "variant" (Scout db via `variant_db` config)
- **auth_user_collection**, collection used for login user lookups (default: "user")
- **default_annotation_track**, when opening a fresh browser, this track will be preselected. Selected annotation tracks are now stored in the browser session, so if the user changes tracks that choice will persist.
- **main_sample_types**, sample types handled as the "main" sample for multi-sample cases. I.e. the sample displayed in the overview plot and multi-chromosome view.
- **default_profiles**, mapping from profile type to default profile JSON. Profile types are calculated by the unique and sorted `sample_type` values joined by `+`. Values are paths to JSON files relative to the config file.

`authentication = "simple"` requires users to log in with email only. Access is granted only if that email exists in the configured auth user database/collection. Only meant to use for testing.

**gens_db**

- **connection**, mongodb conneciton string
- **database**, optional database name. Can also be in connection string

**scout_db**

- **connection**, mongodb conneciton string
- **database**, optional database name. Can also be in connection string

**ldap**

- **server**, LDAP server URL such as `ldap://ldap.example.com`
- **bind_user_template**, template used to bind directly to the LDAP server. Include `{username}` where the supplied username or email should be inserted, e.g. `uid={username},ou=People,dc=example,dc=com`

## User management CLI

Use the CLI to manage users instead of relying only on API endpoints:

```bash
# List users in configured auth user db/collection
gens users list

# Create user
gens users create --email user@example.com --name "Example User" --role user

# Show one user
gens users show --email user@example.com

# Delete user
gens users delete --email user@example.com --force
```

You can target a specific database source with `--user-db gens|variant` and override collection with `--collection`.
