const MAX_TRIES = 5
const DELAY = 2000

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/vnd.api+json; version=1'
}

async function fetchJSON(url) {
  try {
    const response = await fetch(url, { headers })
    if (response && response.ok) {
      const body = await response.json()
      return { body }
    } else {
      const error = new Error(`${response.status}: ${response.statusText} ${url}`)
      return { error }
    }
  } catch (error) {
    return { error }
  }
}

function fetchWithDelay(url, delay = DELAY) {
  return new Promise(function (resolve, reject) {
    setTimeout(async function () {
      const { body, error } = await fetchJSON(url)
      if (body) {
        resolve(body)
      } else {
        reject(error)
      }
    }, delay)
  })
}

module.exports = async function fetchWithRetry(url, retryCount = 0, delay = 0) {
  try {
    if (retryCount > 0) {
      console.log(`retrying ${url}, attempt: ${retryCount}`)
    }
    const body = await fetchWithDelay(url, delay)
    return body
  } catch (error) {
    if (retryCount < MAX_TRIES) {
      return fetchWithRetry(url, retryCount + 1, DELAY)
    }
    throw error
  }
}
