const { panoptes } = require('@zooniverse/panoptes-js')
const MAX_TRIES = 5
const DELAY = 2000

async function fetchJSON(endpoint, query) {
  try {
    const response = await panoptes.get(endpoint, {
      env: 'production',
      ...query
    })
    if (response && response.ok) {
      return response
    } else {
      const queryParams = Object.entries(query).map(([key, value]) => `${key}=${value}`)
      const error = new Error(`${response.status}: ${response.statusText} ${endpoint}?${queryParams.join('&')}`)
      return { error }
    }
  } catch (error) {
    return { error }
  }
}

function fetchWithDelay(endpoint, query, delay = DELAY) {
  return new Promise(function (resolve, reject) {
    setTimeout(async function () {
      const { body, error } = await fetchJSON(endpoint, query)
      if (body) {
        resolve(body)
      } else {
        reject(error)
      }
    }, delay)
  })
}

module.exports = async function fetchWithRetry(endpoint, query, retryCount = 0, delay = 0) {
  try {
    if (retryCount > 0) {
      const queryParams = Object.entries(query).map(([key, value]) => `${key}=${value}`)
      console.log(`retrying ${endpoint}?${queryParams.join('&')}, attempt: ${retryCount}`)
    }
    const body = await fetchWithDelay(endpoint, query, delay)
    return body
  } catch (error) {
    if (retryCount < MAX_TRIES) {
      return fetchWithRetry(endpoint, query, retryCount + 1, DELAY)
    }
    throw error
  }
}
