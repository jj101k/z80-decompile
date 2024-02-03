//@ts-check
const fs = require("fs")
const [filename] = process.argv.slice(2)
const contents = fs.readFileSync(filename)

const loadPoint = 0x5e27 // From previous file

const bitR = {
    [0b01]: "BIT",
    [0b10]: "RES",
    [0b11]: "SET",
}

class DataWalker {
    #dv
    offset = 0
    /**
     *
     * @param {number} size
     */
    constructor(size) {
        this.#dv = new DataView(contents.buffer, 0, size)
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
        return this.#dv.getUint32(this.offset).toString(16).padStart(8, "0")
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
        return this.#dv.getUint16(this.offset++, true)
    }
    /**
     *
     * @returns
     */
    uint8() {
        return this.#dv.getUint8(this.offset++)
    }
}

/**
 * @abstract
 */
class FDDD {
    #dw

    /**
     * @abstract
     * @protected
     * @type {string}
     */
    offsetRegister

    /**
     *
     * @param {DataWalker} dw
     */
    constructor(dw) {
        this.#dw = dw
    }
    /**
     *
     * @returns {string | undefined | null}
     */
    try() {
        const nn = this.#dw.uint8()

        if(nn == 0x36) {
            const d = this.#dw.int8()
            const n = this.#dw.uint8()
            return `LD (${this.offsetRegister}+${d.toString(16)}), ${n.toString(16)}`
        }

        // Bit manipulation
        if(nn == 0xcb) {
            const a = this.#dw.uint8()
            const e = this.#dw.uint8()
            if((e & 0b111) == 0b110 && (e >> 6) != 0b00) {
                return `${bitR[e >> 6]} ${(e >> 3) & 0b111} (${this.offsetRegister} + ${a.toString(16)})`
            }
        }

        // 8-bit load group LD (grouped cases)
        if((nn >> 3) == 0b1110 && (nn & 0b111) != 0b110) {
            const r = nn & 0b111
            const d = this.#dw.int8()
            return `LD (${this.offsetRegister}+${d}), ${r}`
        } else if((nn & 0b1100_0111) == 0b01000110 && ((nn >> 3) & 0b111) != 0b110) {
            const r = nn & 0b111
            const d = this.#dw.int8()
            return `LD ${r}, (${this.offsetRegister}+${d})`
        }

        return null
    }
}

/**
 *
 */
class FD extends FDDD {
    offsetRegister = "IY"
}

/**
 *
 */
class DD extends FDDD {
    offsetRegister = "IX"
}

/**
 *
 * @param {number} n
 * @param {DataWalker} dw
 * @returns {string | undefined | null}
 */
const tryDecode = (n, dw) => {
    if(n == 0xfd) {
        return new FD(dw).try()
    } else if(n == 0xdd) {
        return new DD(dw).try()
    }

    const registerRef = {
        [0b111]: "A",
        [0b000]: "B",
        [0b001]: "C",
        [0b010]: "D",
        [0b011]: "E",
        [0b100]: "F",
        [0b101]: "L",
        [0b110]: "(HL)",
    }

    const opR = {
        [0b000]: "ADD",
        [0b001]: "ADC",
        [0b010]: "SUB",
        [0b011]: "SBC",
        [0b100]: "AND",
        [0b101]: "XOR",
        [0b110]: "OR",
        [0b111]: "CP",
    }

    // Bit manipulation
    if(n == 0xcb) {
        const e = dw.uint8()
        const r = registerRef[e & 0b111]
        if((e & 0b111) == 0b110 && (e >> 6) != 0b00) {
            return `${bitR[e >> 6]} ${(e >> 3) & 0b111} ${r}`
        }
    }

    // Jump/Call/Return group
    if((n & 0b1110_0111) == 0b0010_0000) {
        const fR = {
            [0b00]: "NZ",
            [0b01]: "Z",
            [0b10]: "NC",
            [0b11]: "C",
        }

        const a = dw.int8()
        return `JR ${fR[(n >> 3) & 0b11]} ${a}`
    } else if((n >> 6) == 0b11) {
        const fR = {
            [0b000]: "NZ",
            [0b001]: "Z",
            [0b010]: "NC",
            [0b011]: "C",
            [0b100]: "NP",
            [0b101]: "P",
            [0b110]: "NS",
            [0b111]: "S",
        }
        const jcrR = {
            [0b000]: "RET",
            [0b010]: "JP",
            [0b100]: "CALL",
        }

        if(jcrR[n & 0b111]) {
            if(jcrR[n & 0b111] == "RET") {
                return `${jcrR[n & 0b111]} ${fR[(n >> 3) & 0b111]}`
            } else {
                const a = dw.uint16()
                return `${jcrR[n & 0b111]} ${fR[(n >> 3) & 0b111]} ${a}`
            }
        }
    }

    // 8-bit arithmetic & logic
    if((n >> 6) == 0b10) {
        const op = opR[(n >> 3) & 0b111]
        const r = registerRef[n & 0b111]

        return `${op} ${r}`
    } else if((n >> 6) == 0b11 && (n & 0b111) == 0b110) {
        const op = opR[(n >> 3) & 0b111]
        const a = dw.uint8()
        return `${op} ${a.toString(16)}`
    } else if((n & 0b1100_0110) == 0b0000_0100) {
        const op = (n & 0b0001_0000) ? "DEC" : "INC"
        const r = registerRef[(n >> 3) & 0b111]
        return `${op} ${r}`
    }

    // 16-bit arithmetic
    if((n & 0b1100_0101) == 0b0000_0001) {
        const rpR = {
            [0b00]: "BC",
            [0b01]: "DE",
            [0b10]: "HL",
            [0b11]: "SP",
        }
        const rp = rpR[(n >> 4) & 0b11]
        const x = {
            [0b1001]: "ADD HL,",
            [0b0011]: "INC",
            [0b1011]: "DEC",
        }
        if(x[n & 0b1111]) {
            return `${x[n & 0b1111]} ${rp}`
        }
    }

    // 8-bit load group LD (grouped cases)
    if((n & 0b1100_0111) == 0b0000_0110 && (n & 0b11_1000) != 0b11_0000) {
        const d = registerRef[(n >> 3) & 0b111]
        const a = dw.uint8()
        return `LD ${d}, ${a.toString(16)}`
    } else if((n & 0b1100_0111) == 0b0100_0110 && (n & 0b11_0000) != 0b11_1000) {
        const d = registerRef[(n >> 3) & 0b111]
        return `LD ${d}, (HL)`
    } else if((n >> 3) == 0b1110 && (n & 0b111) != 0b110) {
        const s = registerRef[n & 0b111]
        return `LD (HL), ${s}`
    } else if(((n >> 6) & 0b11) == 0b01 && n != 0x76) {
        const s = registerRef[n & 0b111]
        const d = registerRef[(n >> 3) & 0b111]
        return `LD ${d}, ${s}`
    }

    return null
}

const codes = {
    [0x00]: {n: "NOP"},
    [0x01]: {a: "s", n: "LD BC, nn"},
    [0x02]: {n: "LD (BC), A"},
    [0x06]: {a: "c", n: "LD B, n"},
    [0x0a]: {n: "LD A, (BC)"},
    [0x11]: {a: "s", n: "LD DE, nn"},
    [0x12]: {n: "LD (DE), A"},
    [0x16]: {a: "c", n: "LD D, n"},
    [0x1a]: {n: "LD A, (DE)"},
    [0x20]: {a: "d", n: "JR NZ, d"},
    [0x21]: {a: "s", n: "LD HL, nn"},
    [0x31]: {a: "s", n: "LD SP, nn"},
    [0x32]: {a: "s", n: "LD (nn), A"},
    [0x36]: {a: "c", n: "LD (HL), n"},
    [0x3a]: {a: "s", n: "LD A, (nn)"},
    [0x3e]: {a: "c", n: "LD A, n"},
    [0xc1]: {n: "POP BC"},
    [0xc3]: {a: "s", n: "JP nn", o: 1},
    [0xc5]: {n: "PUSH BC"},
    [0xcd]: {a: "s", n: "CALL nn"},
    [0xd3]: {a: "c", n: "OUT (n), A"},
    [0xed47]: {n: "LD I, A"},
    [0xed4f]: {n: "LD R, A"},
    [0xed57]: {n: "LD A, I"},
    [0xed5f]: {n: "LD A, R"},
    [0xedb0]: {n: "LDIR"},
    [0xf3]: {n: "DI"},
    [0xf5]: {n: "PUSH AF"},
}

const tryCodes = {
    [0xed]: [0xb0],
}

/**
 *
 * @param {{o: any, n: string, a: any}} c
 * @param {DataWalker} dw
 * @returns
 */
const handleCode = (c, dw) => {
    let n
    if(c.a) {
        switch(c.a) {
            case "c": {
                const a = dw.uint8()
                n = c.n.replace(/n/, a.toString(16))
                break
            }
            case "d": {
                const a = dw.int8()
                n = c.n.replace(/d/, a.toString(16))
                break
            }
            case "s": {
                const a = dw.uint16()
                if(c.o) {
                    dw.offset = a - loadPoint
                }
                n = c.n.replace(/nn/, a.toString(16))
                break
            }
        }
    } else {
        n = c.n
    }
    return n
}

/**
 *
 * @param {number} startPoint
 * @param {string | undefined} n
 */
const l = (startPoint, n) => {
    if(n) {
        console.log(`${startPoint.toString(16).padStart(4, "0")}: ${n}`)
        return true
    } else {
        return false
    }
}

/**
 *
 * @param {DataWalker} dw
 * @returns
 */
const decode = (dw) => {
    const startPoint = dw.offset
    const next = dw.uint8()
    const r = tryDecode(next, dw)
    if(r) {
        return l(startPoint, r)
    }
    const c = codes[next]
    if(c) {
        return l(startPoint, handleCode(c, dw))
    }
    if(tryCodes[next]) {
        let then = dw.peekUint8()
        if(tryCodes[next].includes(then)) {
            then = dw.uint8()
            const c = codes[(next << 8) + then]
            if(c) {
                return l(startPoint, handleCode(c, dw))
            } else {
                throw new Error("internal error")
            }
        }
    }
    return false
}
const dw = new DataWalker(contents.byteLength)
dw.offset = 1
for(let i = 0; i < 100; i++) {
    const startPoint = dw.offset
    if(decode(dw) == false) {
        dw.offset = startPoint
        throw new Error(`Cannot decode value: ${dw.inspect()}`)
    }
}

// See DECOMPILER.md