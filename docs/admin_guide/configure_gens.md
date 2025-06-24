# Configuration of Gens

The behaviour of Gens and the connections to the mongo databases can be configured in several ways. The software can be configured using environment variables, a dotfile or with a separate toml file. To use a custom toml file the user have to specify the path to the file with the environment variable CONIFG_FILE and ensure that file is readable by the gens executable.

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

## Options

Configuration options. Note that double underscores (`__`) are used to denote sub-categories, such as **gens_db** and **oauth**, when using environment variables. For example, the envionment variable name for configuring Gens mongodb connection is `GENS_DB__CONNECTION` (`<SUB-CATEGORY>__<VARIABLE>`).

- **scout_url**, base url to Scout.

### gens_db

Connection to the Gens mongo database.

- **connection**, mongodb conneciton string
- **database**, optional database name. Can also be in connection string

### scout_db

Connection to the Scout mongo database.

- **connection**, mongodb conneciton string
- **database**, optional database name. Can also be in connection string

