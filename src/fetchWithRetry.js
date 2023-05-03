const MAX_TRIES = 5
const DELAY = 2000

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/vnd.api+json; version=1'
}

module.exports = async function fetchWithRetry(url, retryCount = 0) {
  function fetchWithDelay(resolve, reject) {
    async function fetchJSON() {
      const response = await fetchWithRetry(url, retryCount + 1)
      if (response && response.ok) {
        const body = await response.json()
        resolve(body)
      } else {
        if (retryCount < MAX_TRIES) {
          return new Promise(fetchWithDelay)
        } else {
          reject(new Error(`Max network retry count reached: ${MAX_TRIES}`))
        }
      }
    }

    setTimeout(fetchJSON, DELAY)
  }

  try {
    const response = await fetch(url, { headers })
    if (response && response.ok) {
      const body = await response.json()
      return body
    }
  } catch (error) {
    console.error(error)
  }
  if (retryCount < MAX_TRIES) {
    return new Promise(fetchWithDelay)
  }
  throw new Error(`Max network retry count reached: ${MAX_TRIES}`)
}
