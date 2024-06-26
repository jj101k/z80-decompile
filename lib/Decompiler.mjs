import * as fs from "fs"
import path from "path"
import { DataWalker } from "./DataWalker.mjs"
import { DecompileContext } from "./DecompileContext.mjs"
import { Formatter } from "./Formatter.mjs"

/**
 *
 */
export class Decompiler {
    /**
     * @readonly
     */
    static decompilerVersion = 8

    /**
     *
     */
    static includeVersion = false

    /**
     *
     * @param {string} writeFilenameSpec
     * @param {string} filename
     */
    static getWriteFilename(writeFilenameSpec, filename) {
        if(writeFilenameSpec.endsWith("/") || (fs.existsSync(writeFilenameSpec) && fs.statSync(writeFilenameSpec).isDirectory())) {
            const fileInBaseRoot = path.basename(filename).replace(/[.]tap$/, "")
            let fileOutBase

            if(this.includeVersion) {
                fileOutBase = `${fileInBaseRoot}.v${this.decompilerVersion}.txt`
            } else {
                fileOutBase = `${fileInBaseRoot}.txt`
            }
            return path.resolve(writeFilenameSpec, fileOutBase)
        } else {
            return writeFilenameSpec
        }
    }

    /**
     *
     */
    #filename

    /**
     *
     */
    #startOffset

    /**
     * @type {{dw: DataWalker, decompile: DecompileContext} | null}
     */
    #state = null

    /**
     *
     * @returns
     */
    #getContents() {
        if (!this.#filename.match(/[.]tap$/)) {
            console.warn(`WARNING: this is only for .tap files, not: ${this.#filename}`)
        }
        const size = fs.statSync(this.#filename).size
        if (size > 65536) {
            console.warn(`WARNING: this is designed for a 16-bit address space, but ${this.#filename} is larger (${size})`)
        }
        const contents = fs.readFileSync(this.#filename)
        return contents
    }

    /**
     *
     */
    #writeOut() {
        if(this.writeFilename && this.#state) {
            const fh = fs.openSync(this.writeFilename, "wx")
            for (const l of this.#state.decompile.dump()) {
                fs.writeSync(fh, l + "\n")
            }
            fs.closeSync(fh)
        } else {
            this.#writeToConsole()
        }
    }

    /**
     *
     */
    #writeToConsole() {
        if(Decompiler.includeVersion) {
            console.log("; v" + Decompiler.decompilerVersion)
        }
        if(this.#state) {
            for (const l of this.#state.decompile.dump()) {
                console.log(l)
            }
        }
    }

    /**
     *
     */
    limit = 10_000

    /**
     * @readonly
     */
    loadPoint

    /**
     *
     */
    writeFilename

    /**
     *
     */
    get state() {
        if(!this.#state) {
            const contents = this.#getContents()
            const dw = new DataWalker(contents.subarray(this.#startOffset))
            const decompile = new DecompileContext(dw, this.loadPoint)

            this.#state = {dw, decompile}
        }
        return this.#state
    }

    /**
     *
     * @param {string} filename
     * @param {number} loadPoint
     * @param {number} startOffset
     * @param {string | undefined} [writeFilenameSpec]
     */
    constructor(filename, loadPoint, startOffset, writeFilenameSpec) {
        this.writeFilename = writeFilenameSpec ?
            Decompiler.getWriteFilename(writeFilenameSpec, filename) : undefined
        this.#filename = filename
        this.loadPoint = loadPoint
        this.#startOffset = startOffset
    }

    /**
     *
     * @param {Set<number>} entryPoints
     * @param {Set<number>} memoryLocations
     */
    decode(entryPoints, memoryLocations) {
        const {decompile, dw} = this.state
        for(const entryPoint of entryPoints) {
            decompile.addTarget(entryPoint, "fn")
        }
        for(const memoryLocation of memoryLocations) {
            decompile.addMemoryLocation(memoryLocation)
        }
        let bytesParsed = 0

        /**
         *
         */
        let i = 0

        /**
         *
         */
        const traceLength = 10

        decompile.finished = false
        decompile.entryPoint = decompile.loadPoint

        /**
         * @type {number[]}
         */
        const trace = []

        for (i = 0; i < this.limit; i++) {
            const startPoint = dw.offset

            if(i >= traceLength) {
                trace.shift()
            }
            trace.push(startPoint)
            const n = decompile.decode()
            if (!n) {
                console.warn(`Last ${traceLength} PC values:`)
                for(const o of trace) {
                    console.warn(decompile.$addr(o + this.loadPoint))
                }
                dw.offset = startPoint
                const $startPoint = decompile.$addr(startPoint + this.loadPoint)
                const $entryPoint = decompile.$addr(decompile.entryPoint)
                const $dump = Formatter.$(decompile.u8(...dw.inspect()))
                throw new Error(`Cannot decode value at ${this.#filename}+${startPoint} (${$startPoint}, from ${this.#filename}@${$entryPoint}) after ${i} points (${bytesParsed} bytes) mapped: ${$dump}`)
            }
            const byteLength = decompile.lastByteLength
            if(byteLength) {
                bytesParsed += byteLength
            }
            if (decompile.finished) {
                const {functions, jumps, memoryLocations: memoryLocationsFound} =
                    decompile.outOfRangeContent
                for(const fn of functions) {
                    entryPoints.add(fn)
                }
                for(const jp of jumps) {
                    entryPoints.add(jp)
                }
                for(const memoryLocation of memoryLocationsFound) {
                    memoryLocations.add(memoryLocation)
                }
                return i
            }
        }

        return null
    }

    /**
     *
     */
    onError() {
        this.#writeToConsole()
    }

    /**
     *
     * @param includePartial
     */
    write(includePartial = false) {
        if (includePartial || this.#state?.decompile.finished) {
            this.#writeOut()
        }
    }
}