#!/bin/bash -e

# remove any existing (ephemeral) db as we're going to rebuild it
rm -f "./databases/*.db"

# run the import csv cmd using csvs-to-sqlite
echo ---
echo "Importing ./data/subjects/*.csv to db: ./databases/subjects.db"
csvs-to-sqlite --replace-tables ./data/subjects/*.csv ./databases/subjects.db

echo ---
echo "Importing ./data/projects/*.csv to db: ./databases/projects.db"
csvs-to-sqlite --replace-tables ./data/projects/*.csv ./databases/projects.db

# inspect the databases to create and inspect file
# used in publishing the database files via datasette
# https://docs.datasette.io/en/latest/settings.html?highlight=immutable#configuration-directory-mode
# https://docs.datasette.io/en/latest/performance.html?highlight=inspect#using-datasette-inspect
# ensure we build this file from the dir of the databases for immutables config json
cd ./databases/
datasette inspect *.db --inspect-file=inspect-data.json
cd -