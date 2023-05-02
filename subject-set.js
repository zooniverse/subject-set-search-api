const fs = require('fs')
const { unparse } = require('papaparse')

const PROJECT_IDS = [ 12268, 12561, 16957, 5481, 17426 ]
const PAGE_SIZE = 100

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/vnd.api+json; version=1'
}

async function fetchWithRetry(url, retryCount = 0) {
  const MAX_TRIES = 5
  const DELAY = 2000

  function fetchWithDelay(resolve, reject) {
    setTimeout(async () => {
      const response = await fetchWithRetry(url, retryCount + 1)
      if (response && response.ok) {
        resolve(response)
      } else {
        reject(new Error('Request failed'))
      }
    }, DELAY)
  }

  try {
    const response = await fetch(url, { headers })
    if (response && response.ok) {
      return response
    }
  } catch (error) {
    console.error(error)
  }
  if (retryCount < MAX_TRIES) {
    return new Promise(fetchWithDelay)
  }
  throw new Error(`Max network retry count reached: ${MAX_TRIES}`)
}

function subjectMetadataRow(subject, indexFields = []) {
  const row = {
    subject_id: subject.id,
    priority: -1
  }
  row.priority = subject.metadata.priority || subject.metadata['#priority'] || -1
  indexFields.forEach(field => {
    row[field] = subject.metadata[field]
  })
  return row
}

async function getPagedSubjects(subjectSet, page = 1) {
  const { id } = subjectSet
  const indexFields = subjectSet.metadata.indexFields.split(',')
  const url = `https://www.zooniverse.org/api/subjects?subject_set_id=${id}&page_size=${PAGE_SIZE}&page=${page}`
  const response = await fetchWithRetry(url)
  const { subjects, meta } = await response.json()
  const rows = subjects.map(subject => subjectMetadataRow(subject, indexFields))
  if (meta.subjects.page_count > page) {
    const nextPage = await getPagedSubjects(subjectSet, page + 1)
    return rows.concat(nextPage)
  } else {
    console.log({ id: subjectSet.id, subjects: rows.length })
    return rows
  }
}

async function getSubjectSets(project) {
  const ids = project.links.subject_sets
  const url = `https://www.zooniverse.org/api/subject_sets?id=${ids.join(',')}&page_size=${ids.length}`
  const response = await fetchWithRetry(url)
  const { subject_sets } = await response.json()
  const indexedSets = subject_sets.filter(s => !!s.metadata.indexFields)
  console.log({ id: project.id, sets: indexedSets.length })
  return indexedSets
}

async function getProjects() {
  const url = `https://www.zooniverse.org/api/projects?id=${PROJECT_IDS.join(',')}`
  const response = await fetchWithRetry(url)
  const { projects } = await response.json()
  return projects
}

function onFileWrite(error) {
  if (error) {
    console.error(error)
  }
}

async function writeCSVFile(subjectSet) {
  const subjects = await getPagedSubjects(subjectSet)
  const csv = unparse(subjects)
  fs.writeFile(`./data/${subjectSet.id}.csv`, csv, onFileWrite)
  return subjects
}

async function buildDataFiles() {
  let subjectSets = []
  let count = 0
  const projects = await getProjects()
  const projectSubjectSets = await Promise.all(projects.map(getSubjectSets))
  projectSubjectSets.forEach(projectSets => {
    subjectSets = subjectSets.concat(projectSets)
  })
  const subjectSetSubjects = await Promise.all(subjectSets.map(writeCSVFile))
  subjectSetSubjects.forEach(subjects => {
    count = count + subjects.length
  })
  console.log('subject sets:', subjectSets.length)
  console.log('subjects:', count)
}

buildDataFiles()
