/*
Get Subjects For Projects
This script pulls every Subject from a list of Projects, then creates a new
Datasette-ready database for that project.

Input:
- (hardcoded) projects: list of target projects

Output:
- A Datasette-ready database for each project, named project-{project_id}
  (e.g. project-1234)

Notes:
- Currently used by 2023 Community & Crowds's Community Catalog
  (https://github.com/zooniverse/community-catalog)

import csv
from panoptes_client import Project, Subject

# Note: this can be separated into its own JSON file
projects = [
  {
    "name": "Community Catalog (Stable Test Project)",
    "id": 21084,
    "metadata_fields": [ "Item", "Notes", "folder", "image1", "image2", "#Hazard", "Oversize", "group_id", "Condition", "internal_id", "part_number", "Photographer", "#Other Number", "picture_agency", "Sensitive_Image", "Problematic_Language", "Notes on Problematic Language", "TMPDELETETHIS" ]
  }
]

# For every Project, fetch every Subject associated with it.
for tgtProject in projects:
  print('Project ' + str(tgtProject['id']))

  # Ensure the project exists. This should throw an error if it doesn't.
  # TODO: error handling?
  project = Project.find(tgtProject['id'])

  # Fetch from /subjects?project
  # Question: what about deleted Subjects, or retired Subjects? (What does "retired" mean in this context?) 
  subjects = Subject.where(project_id = tgtProject['id'])

  # Prepare the CSV data containers!
  rows = []
  headers = [ 'subject_id' ] + tgtProject['metadata_fields']

  for subject in subjects:
    print('  ' + str(subject.id))

    # Set standard fields
    row = {}
    row['subject_id'] = subject.id

    # Set metadata fields
    for metadata_field in tgtProject['metadata_fields']:
      if metadata_field in subject.metadata:
        row[metadata_field] = subject.metadata[metadata_field]
        
    rows.append(row) 

  print(headers)
  print(rows)

  filename = 'data/project-{id}.csv'.format(id=tgtProject['id'])
  # with open(filename, mode='w') as csv_file:
    # writer = csv.DictWriter(csv_file, fieldnames=headers)
    # writer.writeheader()
    # writer.writerows(rows)
*/

// Note: this can be separated into its own JSON file
const projects = [
  {
    "name": "Community Catalog (Stable Test Project)",
    "id": 21084,
    "metadata_fields": [ "Item", "Notes", "folder", "image1", "image2", "#Hazard", "Oversize", "group_id", "Condition", "internal_id", "part_number", "Photographer", "#Other Number", "picture_agency", "Sensitive_Image", "Problematic_Language", "Notes on Problematic Language", "TMPDELETETHIS" ]
  }
]

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/vnd.api+json; version=1'
}

async function downloadProjectsData () {

  const results = await Promise.all(projects.map(fetchAndWriteProjectsData))

  console.log('Results: ', results)
}

async function fetchAndWriteProjectsData (project) {
  try {
    const subjects = await fetchAllSubjects(project.id)
    console.log('subjects: ', subjects.map(s=>s.id))

    return true
  } catch (err) {
    console.error('Error: ', err)
    return false
  }
}

async function fetchAllSubjects (projectId = '') {
  let allSubjects = []
  let continueFetching = true
  let page = 1

  while (continueFetching) {
    const { subjects, meta } = await fetchSubjectsByPage(projectId, page)
    allSubjects = allSubjects.concat(subjects)
    continueFetching = (+meta.page <= +meta.page_count) || false
    page++
  }

  return allSubjects
}

async function fetchSubjectsByPage (projectId = '', page = 1, pageSize = 20) {
  const url = `https://www.zooniverse.org/api/subjects?project_id=${projectId}&page=${page}&page_size=${pageSize}`
  
  try {
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`ERROR: fetchSubjectsByPage (${projectId}, ${page}, ${pageSize}`)
    const { subjects, meta }  = await res.json()
    return { subjects, meta: meta.subjects }
  } catch (err) {
    throw(err)
  }
}

downloadProjectsData()

