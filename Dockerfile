FROM datasetteproject/datasette:0.56

WORKDIR /mnt/datasette

# Datasette tools
# for csv import - https://datasette.io/tools/csvs-to-sqlite
# for datasette db maniupluations and tools - https://datasette.io/tools/sqlite-utils
# for geojson api responses - https://pypi.org/project/geojson/
RUN pip install csvs-to-sqlite sqlite-utils
