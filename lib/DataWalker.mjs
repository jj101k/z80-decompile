/**
 *
 */
export class DataWalker {
    #dv
    offset = 0

    /**
     *
     */
    get length() {
        return this.#dv.byteLength
    }
    /**
     *
     * @param {Buffer} contents
     */
    constructor(contents) {
        this.#dv = new DataView(contents.buffer, contents.byteOffset, contents.byteLength)
    }
    /**
     *
     * @returns
     */
    int8() {
        return this.#dv.getInt8(this.offset++)
    }
    /**
     *
     * @returns
     */
    inspect() {
        return this.inspectAt(this.offset, 4)
    }
    /**
     *
     * @param {number} offset
     * @param {number} length
     * @returns
     */
    inspectAt(offset, length) {
        /**
         * @type {number[]}
         */
        const values = []
        try {
            for(let i = 0; i < length; i++) {
                values.push(this.#dv.getUint8(offset + i))
            }
        } catch(e) {
            if(!(e instanceof RangeError)) {
                throw e
            }
        }
        return values
    }
    /**
     *
     * @returns
     */
    peekUint8() {
        return this.#dv.getUint8(this.offset)
    }
    /**
     *
     * @returns
     */
    uint16() {
        const a = this.#dv.getUint16(this.offset, true)
        this.offset += 16 / 8
        return a
    }
    /**
     *
     * @returns
     */
    uint8() {
        return this.#dv.getUint8(this.offset++)
    }
}