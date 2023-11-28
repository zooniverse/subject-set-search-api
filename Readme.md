## Production API

Browse the data, and run SQL queries at
https://subject-set-search-api.zooniverse.org

### Example queries

All subjects from set 92752 where `subject.metadata.Date` contains 'December'.

https://subject-set-search-api.zooniverse.org/subjects/92752?_sort=rowid&Date__contains=December

Or as JSON.

https://subject-set-search-api.zooniverse.org/subjects/92752.json?_sort=rowid&Date__contains=December

## Installation

Use docker and docker-compose, no other way is supported

## Getting Started

## Generate some data

Generate some test data by writing some csv files to `./data/`. Each file will be named after a subject set ID: `12345.csv`.
```
node src/subject-set.js
```
## Building the SQLite db(s)

### Use custom docker image to build the dbs

The following will build a sqlite `subjects` db with one table for each csv file in the `/data/` directory of this repository. The table names are subject set IDs. One table per subject set.

``` bash
docker-compose build
```

### Run Datasette with the built sql databases from above

``` bash
docker-compose up
```

This will start datasette and serve all the newly created files at http://127.0.0.1:8001

See docker-compose.yaml for more information

## Run SQL queries directly against the databases

JSON format
- http://127.0.0.1:8001/subjects.json?sql=select+*from+[92751]+where+subject_id=58047414

HTML format
- http://127.0.0.1:8001/subjects?sql=select+*from+[92751]+where+subject_id=58047414

## Manually interact with the sqlite db or datasette via bash

``` bash
docker-compose run --rm --service-ports datasette bash
# do what you want on the file system
#
# re-run the builder script manually
import-csv-files-to-sqlite.sh
#
# use sqlite repl to interact with the database.db file
sqlite3 /mnt/databases/folder/database.db
#
# start datasette in config directoy & cors mode
datasette -h 0.0.0.0 --cors ./databases
```

## Updates

- 2021.09.29: Intentional rebuild triggered.
