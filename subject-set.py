import csv
from panoptes_client import Project, SubjectSet

# update this list of project ids
# to build linked subject sets data files
# that will be included in the API
project_ids = [ 12268 ]

for project in project_ids:
    for subject_set in project.links.subject_sets:
        print(subject_set.id)
        if 'indexFields' in subject_set.metadata:
            print(subject_set.metadata['indexFields'])
            index_fields = (subject_set.metadata['indexFields']).split(',')

            headers = ['priority', 'subject_id']
            for field in index_fields:
                headers.append(field)

            rows = []
            for subject in subject_set.subjects:
                row = {}
                row['subject_id'] = subject.id
                row['priority'] = -1
                if 'priority' in subject.metadata:
                    row['priority'] = subject.metadata['priority']
                if '#priority' in subject.metadata:
                    row['priority'] = subject.metadata['#priority']
                for field in index_fields:
                    row[field] = subject.metadata[field]
                rows.append(row)

            filename = 'data/{id}.csv'.format(id=subject_set.id)
            with open(filename, mode='w') as csv_file:
                writer = csv.DictWriter(csv_file, fieldnames=headers)
                writer.writeheader()

                for row in rows:
                    writer.writerow(row)
