const APP_NAME = "zikoro-stream"

export default class Logger {
  private _debug: (message: string, ...args: any[]) => void
  private _warn: (message: string, ...args: any[]) => void
  private _error: (message: string, ...args: any[]) => void

  constructor(prefix?: string) {
    if (prefix) {
      this._debug = this._createLogger(`${APP_NAME}:${prefix}`, "debug")
      this._warn = this._createLogger(`${APP_NAME}:WARN:${prefix}`, "warn")
      this._error = this._createLogger(`${APP_NAME}:ERROR:${prefix}`, "error")
    } else {
      this._debug = this._createLogger(APP_NAME, "debug")
      this._warn = this._createLogger(`${APP_NAME}:WARN`, "warn")
      this._error = this._createLogger(`${APP_NAME}:ERROR`, "error")
    }
  }

  private _createLogger(prefix: string, level: "debug" | "warn" | "error") {
    return (message: string, ...args: any[]) => {
      const formattedMessage = this._format(message, args)
      switch (level) {
        case "debug":
          console.log(`[${prefix}] ${formattedMessage}`)
          break
        case "warn":
          console.warn(`[${prefix}] ${formattedMessage}`)
          break
        case "error":
          console.error(`[${prefix}] ${formattedMessage}`)
          break
      }
    }
  }

  private _format(message: string, args: any[]): string {
    if (args.length === 0) return message

    return message.replace(/%[osdj]/g, (match) => {
      if (args.length === 0) return match
      const arg = args.shift()
      switch (match) {
        case "%o":
          return JSON.stringify(arg)
        case "%s":
          return String(arg)
        case "%d":
          return Number(arg).toString()
        case "%j":
          return JSON.stringify(arg)
        default:
          return match
      }
    })
  }

  get debug() {
    return this._debug
  }

  get warn() {
    return this._warn
  }

  get error() {
    return this._error
  }
}
