/*
Get Subjects For Projects
This script pulls every Subject from a list of Projects, then creates a new
Datasette-ready database for that project.

Inputs/configurables:
- (hardcoded) PROJECTS: list of target projects
- (hardcoded) OUTPUT_DIR: Output directory
- (hardcoded) TABLE_PREFIX: Prefix for database table name

Output:
- A Datasette-ready database for each project, named project-{project_id}
  (e.g. project-1234)

Notes:
- Currently used by 2023 Community & Crowds's Community Catalog
  (https://github.com/zooniverse/community-catalog)
*/

const fs = require('fs')
const { unparse } = require('papaparse')
const fetchWithRetry = require('./fetchWithRetry')

/*
Input/Configurables
--------------------------------------------------------------------------------
 */
const OUTPUT_DIR = './data/projects/'  // Trailing slash
const TABLE_PREFIX = 'proj_'

// Note: this can be separated into its own JSON file
const PROJECTS = [
  {
    "name": "Community Catalog (Stable Test Project)",
    "id": 21084,
    "metadata_fields": [ "Item", "Notes", "folder", "image1", "image2", "#Hazard", "Oversize", "group_id", "Condition", "internal_id", "part_number", "Photographer", "#Other Number", "picture_agency", "Sensitive_Image", "Problematic_Language", "Notes on Problematic Language" ]
  }, {
    "name": "Scarlets & Blues (Performance Test Only)",  // Feel free to delete once Community Catalog goes live
    "id": 12268,
    "metadata_fields": [ "Date", "Page", "image", "Catalogue" ]
  }, {
    "name": "How Did We Get Here?",
    "id": 20816,
    "metadata_fields": [
      "image1", "image2", "internal_id", "group_id", "part_number", "folder", "#Hazard", "condition", "item", "picture_agency", "photographer", "oversize", "sensitive_image", "sensitive_image_note", "problematic_language", "probelmatic_language_notes", "#Other Number", "notes"
      // Yes, there's a typo in probelmatic_language_notes.
    ]
  }
]
/*
--------------------------------------------------------------------------------
 */

async function main() {
  console.log('--------')
  console.log('Get Subjects For Projects (aka Projects script)')
  console.log(`Fetching Subjects from ${PROJECTS.length} Projects`)
  console.log('Starting...')
  prepareOutputDirectory()
  const results = await Promise.all(PROJECTS.map(processOneProject))
  console.log('...done')
  console.log('Subjects fetched: ')
  PROJECTS.forEach((proj, index) => {
    const result = results[index]
    console.log(`- ${proj.name}: ${(result >= 0) ? result : 'ERROR'}`)
  })
  console.log('========')
}

/*
Prepares the output directory, if necessary.
This is mostly a convenience for local development; usually, the output dir is
manually prepared by mkdir commands in the Dockerfile.
 */
function prepareOutputDirectory() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }
}

/*
Fetches all Subjects from one Project and writes to a CSV file.

Input:
(object) project: single Project config.

Output:
(number) number of Subjects fetched & written. -1 on error.
 */
async function processOneProject(project) {
  try {
    const subjects = await fetchAllSubjects(project.id)
    return await writeProjectData(project, subjects)

  } catch (err) {
    console.error('ERROR: processOneProject()')
    console.error('- error: ', err)
    console.error('- args: ', project)
    return -1
  }
}

/*
Fetches ALL Subjects from a Project.

Ouput:
(array of objects) array of Panoptes Subject resources 
 */
async function fetchAllSubjects(projectId = '') {
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

/*
Fetches SOME Subjects from a Project.

Output: (object) {
  subjects: (array) array of Panoptes Subject resources
  meta: (object) contains .count (total items available) and .page_count (total pages available)
}
 */
async function fetchSubjectsByPage(projectId = '', page = 1, pageSize = 100) {
  try {
    const { subjects, meta }  = await fetchWithRetry('/subjects', {
      project_id: projectId,
      page,
      page_size: pageSize
    })
    return { subjects, meta: meta.subjects }
  } catch (err) {
    console.error('ERROR: fetchSubjectsByPage()')
    console.error('- error: ', err)
    console.error('- args: ', projectId, page, pageSize)
    throw(err)
  }
}

/*
Writes all fetched Subjects from one Project to a CSV file.

Input:
(object) project: single Project config.
(array of objects) subjects: array of Panoptes Subject resources

Output:
(number) number of Subjects written to file
 */
async function writeProjectData(project, subjects = []) {
  try {
    const csvRows = formatSubjectsForCsv(subjects, project.metadata_fields)
    const data = unparse(csvRows)
      .replaceAll(',FALSE', ',0')
      .replaceAll(',TRUE', ',1')
    const filename = `${OUTPUT_DIR}${TABLE_PREFIX}${project.id}.csv`
    await fs.writeFile(filename, data, 'utf8', onWriteFile)
    return subjects.length

  } catch (err) {
    console.error('ERROR: writeProjectData()')
    console.error('- error: ', err)
    console.error('- args: ', project, subjects?.length)
    throw(err)
  }
}

/*
Format Subject resources data from Panoptes into rows of CSV-ready data.
For the database, each Project requires specific metadata fields/columns (plus
general info fields such as Subject ID). These fields/columns are discussed with
the project team in advance, and defined in the PROJECTS config object.

Input:
(array of objects) subjects: array of Panoptes Subject resources
(array of strings) metadata_fields: the metadata fields of interest

Output:
(array of objects) array of subjects, in simple key-value pairs corresponding
  to the project's required CSV format.
 */
function formatSubjectsForCsv(subjects = [], metadata_fields = []) {
  return subjects.map(subject => {
    const row = {}

    // Add general fields
    row['subject_id'] = subject.id

    // Add metadata-specific fields
    // TODO: handle metadata fields with special characters, e.g. # and !
    metadata_fields.forEach(field => {
      row[field] = subject.metadata[field] || ''
    })

    return row
  })
}

function onWriteFile(err) {
  if (err) { console.error('ERROR: onWriteFile() ', err) }
}

main()
