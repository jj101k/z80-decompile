import { UnknownValue } from "./UnknownValue.mjs"

/**
 *
 */
export class UnknownMemoryValue extends UnknownValue {
    /**
     * @readonly
     */
    address
    /**
     * @readonly
     */
    fromPoint
    /**
     * @readonly
     */
    length

    /**
     *
     */
    get bytes() {
        /**
         * @type {UnknownMemoryValue[]}
         */
        const bytes = []
        for(let i = 0; i < this.length; i++) {
            bytes.push(new UnknownMemoryValue(this.address + i, 1, this.fromPoint))
        }
        return bytes
    }

    /**
     *
     * @param {number} address
     * @param {number} length
     * @param {number} fromPoint
     */
    constructor(address, length, fromPoint) {
        super()
        this.address = address
        this.fromPoint = fromPoint
        this.length = length
    }

    /**
     *
     * @param {Record<number, string>} labels
     * @returns {string}
     */
    toString(labels = {}) {
        return `(${this.addr(this.address, labels)}{${this.length}})@${this.addr(this.fromPoint, labels)}`
    }
}
