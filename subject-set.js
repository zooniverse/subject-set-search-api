const fs = require('fs')
const { unparse } = require('papaparse')

const PROJECT_IDS = [ 12268, 12561, 16957, 5481, 17426 ]

let subject_sets = []
let count = 0

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/vnd.api+json; version=1'
}

async function getPagedSubjects(id, indexFields = [], page = 1) {
  const url = `https://www.zooniverse.org/api/subjects?subject_set_id=${id}&page_size=50&page=${page}`
  const response = await fetch(url, { headers })
  const { subjects, meta } = await response.json()
  let rows = subjects.map(subject => {
    const row = {
      subject_id: subject.id,
      priority: -1
    }
    row.priority = subject.metadata.priority || subject.metadata['#priority'] || -1
    indexFields.forEach(field => {
      row[field] = subject.metadata[field]
    })
    return row
  })
  if (meta.subjects.page_count > page) {
    const nextPage = await getPagedSubjects(id, indexFields, page + 1)
    return rows.concat(nextPage)
  } else {
    return rows
  }
}

async function getSubjectSets(ids = []) {
  const url = `https://www.zooniverse.org/api/subject_sets?id=${ids.join(',')}&page_size=${ids.length}`
  const response = await fetch(url, { headers })
  const { subject_sets } = await response.json()
  return subject_sets.filter(s => !!s.metadata.indexFields)
}

async function getProjects() {
  const url = `https://www.zooniverse.org/api/projects?id=${PROJECT_IDS.join(',')}`
  const response = await fetch(url, { headers })
  const { projects } = await response.json()
  return projects
}

async function buildDataFiles() {
  const projects = await getProjects()
  const awaitSubjectSets = projects.map(async project => {
    const subjectSets = await getSubjectSets(project.links.subject_sets)
    console.log({ id: project.id, sets: subjectSets.length })
    return subjectSets
  })
  const projectSubjectSets = await Promise.all(awaitSubjectSets)
  projectSubjectSets.forEach(subjectSets => {
    subject_sets = subject_sets.concat(subjectSets)
  })
  const awaitSubjects = subject_sets.map(async s => {
    const subjects = await getPagedSubjects(s.id, s.metadata.indexFields.split(','))
    console.log({ id: s.id, subjects: subjects.length })
    const csv = unparse(subjects)
    fs.writeFile(`./data/${s.id}.csv`, csv, err => {
      if (err) {
        console.error(err)
      }
    })
    return subjects
  })
  const subjectSetSubjects = await Promise.all(awaitSubjects)
  subjectSetSubjects.forEach(subjects => {
    count = count + subjects.length
  })
  console.log('subject sets:', subject_sets.length)
  console.log('subjects:', count)
}

buildDataFiles()
