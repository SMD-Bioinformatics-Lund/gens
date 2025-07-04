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
scout_url = "http://localhost:8000/scout"
authentication = "oauth"
gens_api_url = "http://localhost:8080/gens"
main_sample_types = ["proband", "tumor"]

[gens_db]
connection = "mongodb://mongodb:27017/gens"

[scout_db]
connection = "mongodb://mongodb:27017/scout"
```

## Options

Configuration options. Note that double underscores (`__`) are used to denote sub-categories, such as **gens_db** and **oauth**, when using environment variables. For example, the envionment variable name for configuring Gens mongodb connection is `GENS_DB__CONNECTION` (`<SUB-CATEGORY>__<VARIABLE>`).

- **scout_url**, base url to Scout.
- **authentication**, authentication method "oauth", "simple", "disabled"
- **default_annotation_track**, when opening a fresh browser, this track will be preselected. Selected annotation tracks are now stored in the browser session, so if the user changes tracks that choice will persist.
- **main_sample_types**, sample types handled as the "main" sample for multi-sample cases. I.e. the sample displayed in the overview plot and multi-chromosome view.

**gens_db**

- **connection**, mongodb conneciton string
- **database**, optional database name. Can also be in connection string

**scout_db**

- **connection**, mongodb conneciton string
- **database**, optional database name. Can also be in connection string

