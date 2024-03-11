export function generateRandomString(len: number) {
  let s = ''
  const randomchar = function () {
    const n = Math.floor(Math.random() * 62)
    if (n < 10)
      return n // 1-10
    if (n < 36)
      return String.fromCharCode(n + 55) // A-Z
    return String.fromCharCode(n + 61) // a-z
  }
  while (s.length < len) s += randomchar()
  return s
}
