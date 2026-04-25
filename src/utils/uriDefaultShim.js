function splitRawUri(raw) {
  let source = String(raw ?? '')
  let fragment = ''
  let query = ''

  const hashIndex = source.indexOf('#')
  if (hashIndex !== -1) {
    fragment = source.slice(hashIndex + 1)
    source = source.slice(0, hashIndex)
  }

  const queryIndex = source.indexOf('?')
  if (queryIndex !== -1) {
    query = source.slice(queryIndex + 1)
    source = source.slice(0, queryIndex)
  }

  return {
    path: source,
    query,
    fragment,
  }
}

function rebuildRawUri(parts) {
  let value = parts.path ?? ''
  if (parts.query) {
    value += `?${parts.query}`
  }
  if (parts.fragment) {
    value += `#${parts.fragment}`
  }
  return value
}

class URI {
  constructor(uri = '') {
    this._raw = String(uri ?? '')
    this._absoluteUrl = null
    this._refreshAbsolute()
  }

  _refreshAbsolute() {
    try {
      this._absoluteUrl = new URL(this._raw)
    } catch {
      this._absoluteUrl = null
    }
  }

  _setRaw(raw) {
    this._raw = String(raw ?? '')
    this._refreshAbsolute()
  }

  scheme(value) {
    if (value === undefined) {
      if (!this._absoluteUrl) return ''
      return this._absoluteUrl.protocol.replace(':', '')
    }

    if (!this._absoluteUrl) {
      return this
    }

    this._absoluteUrl.protocol = value ? `${value}:` : ''
    this._setRaw(this._absoluteUrl.toString())
    return this
  }

  query(value) {
    if (value === undefined) {
      if (this._absoluteUrl) {
        return this._absoluteUrl.search.startsWith('?')
          ? this._absoluteUrl.search.slice(1)
          : this._absoluteUrl.search
      }
      return splitRawUri(this._raw).query
    }

    if (this._absoluteUrl) {
      this._absoluteUrl.search = value ? `?${value}` : ''
      this._setRaw(this._absoluteUrl.toString())
      return this
    }

    const parts = splitRawUri(this._raw)
    parts.query = String(value ?? '')
    this._setRaw(rebuildRawUri(parts))
    return this
  }

  search(value) {
    return this.query(value)
  }

  fragment(value) {
    if (value === undefined) {
      if (this._absoluteUrl) {
        return this._absoluteUrl.hash.startsWith('#')
          ? this._absoluteUrl.hash.slice(1)
          : this._absoluteUrl.hash
      }
      return splitRawUri(this._raw).fragment
    }

    if (this._absoluteUrl) {
      this._absoluteUrl.hash = value ? `#${value}` : ''
      this._setRaw(this._absoluteUrl.toString())
      return this
    }

    const parts = splitRawUri(this._raw)
    parts.fragment = String(value ?? '')
    this._setRaw(rebuildRawUri(parts))
    return this
  }

  path(value) {
    if (value === undefined) {
      if (this._absoluteUrl) {
        return this._absoluteUrl.pathname
      }
      return splitRawUri(this._raw).path
    }

    if (this._absoluteUrl) {
      this._absoluteUrl.pathname = String(value ?? '')
      this._setRaw(this._absoluteUrl.toString())
      return this
    }

    const parts = splitRawUri(this._raw)
    parts.path = String(value ?? '')
    this._setRaw(rebuildRawUri(parts))
    return this
  }

  authority(value) {
    if (value === undefined) {
      if (!this._absoluteUrl) return ''
      const username = this._absoluteUrl.username
      const password = this._absoluteUrl.password
      const host = this._absoluteUrl.host
      if (!username) {
        return host
      }
      const userInfo = password ? `${username}:${password}` : username
      return `${userInfo}@${host}`
    }

    if (!this._absoluteUrl) {
      return this
    }

    let nextAuthority = String(value ?? '')
    let username = ''
    let password = ''
    if (nextAuthority.includes('@')) {
      const [userInfo, hostInfo] = nextAuthority.split('@')
      nextAuthority = hostInfo
      if (userInfo.includes(':')) {
        const [u, p] = userInfo.split(':')
        username = u
        password = p
      } else {
        username = userInfo
      }
    }
    this._absoluteUrl.username = username
    this._absoluteUrl.password = password
    this._absoluteUrl.host = nextAuthority
    this._setRaw(this._absoluteUrl.toString())
    return this
  }

  normalize() {
    if (this._absoluteUrl) {
      this._setRaw(this._absoluteUrl.toString())
      return this
    }

    const parsed = splitRawUri(this._raw)
    try {
      const normalized = new URL(parsed.path || '.', 'http://uri-shim.local')
      parsed.path = normalized.pathname
    } catch {
      // Keep original relative path if URL normalization fails.
    }
    this._setRaw(rebuildRawUri(parsed))
    return this
  }

  absoluteTo(base) {
    const baseValue =
      base && typeof base.toString === 'function' ? base.toString() : String(base ?? '')
    const resolved = new URL(this.toString(), baseValue).toString()
    return new URI(resolved)
  }

  toString() {
    return this._absoluteUrl ? this._absoluteUrl.toString() : this._raw
  }
}

export default URI
