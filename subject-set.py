from panoptes_client import SubjectSet
subject_set=SubjectSet.find(92753)
index_fields = (subject_set.metadata['indexFields']).split(',')

headers = ['subject_id']
for field in index_fields:
    headers.append(field)

print(headers)

for subject in subject_set.subjects:
    row = [subject.id]
    for field in index_fields:
        row.append(subject.metadata[field])
    print(row)

