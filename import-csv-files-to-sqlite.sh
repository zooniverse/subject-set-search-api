#!/bin/bash -e

# remove any existing (ephemeral) db as we're going to rebuild it
rm -f "./databases/*.db"

# run the import csv cmd using csvs-to-sqlite
echo ---
for input_csv_file in $(find ./data/subjects -type f -name *.csv)
do
  table_name="$(basename $input_csv_file .csv)"
  echo "Importing $input_csv_file to table: $table_name in db: ./databases/subjects.db"
  sqlite-utils insert ./databases/subjects.db $table_name $input_csv_file --csv --replace --detect-types
done


echo ---
for input_csv_file in $(find ./data/projects -type f -name *.csv)
do
  table_name="$(basename $input_csv_file .csv)"
  echo "Importing $input_csv_file to table: $table_name in db: ./databases/projects.db"
  sqlite-utils insert ./databases/projects.db $table_name $input_csv_file --csv --replace --detect-types
done

# inspect the databases to create and inspect file
# used in publishing the database files via datasette
# https://docs.datasette.io/en/latest/settings.html?highlight=immutable#configuration-directory-mode
# https://docs.datasette.io/en/latest/performance.html?highlight=inspect#using-datasette-inspect
# ensure we build this file from the dir of the databases for immutables config json
cd ./databases/
datasette inspect *.db --inspect-file=inspect-data.json
cd -