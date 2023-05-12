# Build a Datasette image with tools and plugins that we need
FROM datasetteproject/datasette:latest AS builder

WORKDIR /mnt/datasette

# Datasette tools
# for csv import - https://datasette.io/tools/csvs-to-sqlite
# for datasette db maniupluations and tools - https://datasette.io/tools/sqlite-utils
# for geojson api responses - https://pypi.org/project/geojson/
RUN pip install csvs-to-sqlite sqlite-utils

# pandas 2.0 breaks csvs-to-sqlite.
# https://github.com/simonw/csvs-to-sqlite/pull/92
RUN pip install --force-reinstall "pandas~=1.0"

RUN mkdir ./databases

COPY settings.json ./databases/

COPY ./plugins/ ./databases/plugins/

RUN datasette install datasette-hashed-urls

# Build the Panoptes data CSVs with NodeJS
FROM node:18-alpine AS panoptesData

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm ci

# Add the csv data files
COPY src/ ./src
RUN mkdir ./data
RUN mkdir ./data/subjects

# add BUILD_DATE arg to invalidate the cache
ARG BUILD_DATE=''
# bake this into the image for reference
# and invalidate the docker image cache to rebuild each time (remote data source may change)
# https://docs.docker.com/engine/reference/builder/#impact-on-build-caching
ENV BUILD_DATE=$BUILD_DATE
RUN echo building at $BUILD_DATE

# build the subject set csv files from the main API
RUN node src/subject-set.js

# Build the final database from our custom Datasette image with Panoptes data.
FROM builder

WORKDIR /mnt/datasette

RUN mkdir ./data
RUN mkdir ./data/subjects

# add BUILD_DATE arg to invalidate the cache
ARG BUILD_DATE=''
# bake this into the image for reference
# and invalidate the docker image cache to rebuild each time (remote data source may change)
# https://docs.docker.com/engine/reference/builder/#impact-on-build-caching
ENV BUILD_DATE=$BUILD_DATE
RUN echo building at $BUILD_DATE

COPY --from=panoptesData /app/data ./data

# our custom script for converting CSV files to database
COPY import-csv-files-to-sqlite.sh /usr/local/bin/

# build the config dir
RUN /usr/local/bin/import-csv-files-to-sqlite.sh

# CMD ["datasette", "-p", "80", "-h", "0.0.0.0", "--cors", "/mnt/datasette/databases"]
# fix the dbs not starting in immutable mode, https://github.com/simonw/datasette/pull/1229
CMD ["datasette", "-p", "80", "-h", "0.0.0.0", "--cors", "-i", "databases/subjects.db", "--plugins-dir=databases/plugins", "--inspect-file=databases/inspect-data.json", "--setting", "sql_time_limit_ms", "60000",  "--setting", "max_returned_rows", "50000"]

