const fs = require('fs')
const { unparse } = require('papaparse')

const fetchWithRetry = require('./fetchWithRetry')

const PROJECT_IDS = [ 12268, 12561, 16957, 5481, 17426, 20163 ]
const PAGE_SIZE = 100

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
  const { subjects, meta } = await fetchWithRetry('/subjects', {
    subject_set_id: id,
    page_size: PAGE_SIZE,
    page
  })
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
  const { subject_sets } = await fetchWithRetry('/subject_sets', {
    id: ids.join(','),
    page_size: ids.length
  })
  const indexedSets = subject_sets.filter(s => !!s.metadata.indexFields)
  console.log({ id: project.id, sets: indexedSets.length })
  return indexedSets
}

async function getProjects() {
  const { projects } = await fetchWithRetry('/projects', {
    id: PROJECT_IDS.join(',')
  })
  return projects
}

function onFileWrite(error) {
  if (error) {
    console.error(error)
  }
}

async function writeCSVFile(subjectSet) {
  const subjects = await getPagedSubjects(subjectSet)
  const cleanSubjects = [...new Set(subjects)]
  const csv = unparse(cleanSubjects)
  fs.writeFile(`./data/subjects/${subjectSet.id}.csv`, csv, onFileWrite)
  return cleanSubjects
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
