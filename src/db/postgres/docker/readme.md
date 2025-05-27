# This image by default contains postgres v.12.13 (alpine)

## Run pure postgres image that ready for migration files

`docker run -d -p 127.0.0.1:5432:5432 --name celebration-postgres -e POSTGRES_PASSWORD=test -e POSTGRES_DB=celebration postgres:12.13-alpine3.17`

> Note: all the following comands are declared in `package.json`. They use [postgres-migrations](https://github.com/thomwright/postgres-migrations) under the hood.

After the docker container is up and runnig you can run `bun run db:apply-migrations` command in the terminal. Note that this command has to be executed in the root of the project. After that the DB will have required tables and data seeded in them.

## Start docker container with postgresql

This is a command which you can use for a local run of postgres in a detached mode:

`docker run -d -p 127.0.0.1:5432:5432 --name celebration-postgres -e POSTGRES_PASSWORD=test -e POSTGRES_DB=celebration celebration-postgres:latest`

## Connect to PSQL of the image

`docker run -it --rm --link celebration-postgres:postgres postgres:12.13-alpine3.17 psql --dbname celebration -h postgres -U postgres`

## Connect to PSQL directly from the host

`docker exec -it celebration-postgres psql --dbname celebration -U postgres`
