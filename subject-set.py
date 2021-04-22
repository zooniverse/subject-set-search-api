import csv
from panoptes_client import SubjectSet

subject_set=SubjectSet.find(92753)
index_fields = (subject_set.metadata['indexFields']).split(',')

headers = ['subject_id']
for field in index_fields:
    headers.append(field)

rows = []
for subject in subject_set.subjects:
    row = {}
    row['subject_id'] = subject.id
    for field in index_fields:
        row[field] = subject.metadata[field]
    rows.append(row)

with open('data/92553.csv', mode='w') as csv_file:
    writer = csv.DictWriter(csv_file, fieldnames=headers)
    writer.writeheader()

    for row in rows:
        writer.writerow(row)
