FROM datasetteproject/datasette:0.57

WORKDIR /mnt/datasette

# Datasette tools
# for csv import - https://datasette.io/tools/csvs-to-sqlite
# for datasette db maniupluations and tools - https://datasette.io/tools/sqlite-utils
# for geojson api responses - https://pypi.org/project/geojson/
RUN pip install csvs-to-sqlite sqlite-utils panoptes-client

# add BUILD_DATE arg to invalidate the cache
ARG BUILD_DATE=''
# bake this into the image for reference
ENV BUILD_DATE=$BUILD_DATE

# Add the csv data files
COPY subject-set.py ./
RUN mkdir ./data

# ensure we invalidate the docker image cache to rebuild each time (remote data source may change)
RUN echo building at $BUILD_DATE
RUN python subject-set.py

# our custom script for converting CSV files to database
COPY import-csv-files-to-sqlite.sh /usr/local/bin/

# build the config dir
RUN /usr/local/bin/import-csv-files-to-sqlite.sh
COPY ./plugins/ ./databases/plugins/
COPY settings.json ./databases/

# CMD ["datasette", "-p", "80", "-h", "0.0.0.0", "--cors", "/mnt/datasette/databases"]
# fix the dbs not starting in immutable mode, https://github.com/simonw/datasette/pull/1229
CMD ["datasette", "-p", "80", "-h", "0.0.0.0", "--cors", "-i", "databases/subjects.db", "--plugins-dir=databases/plugins", "--inspect-file=databases/inspect-data.json", "--setting", "sql_time_limit_ms", "60000",  "--setting", "max_returned_rows", "50000", "--setting", "hash_urls", "1"]

