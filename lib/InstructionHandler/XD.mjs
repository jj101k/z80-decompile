import { BitView } from "../BitView.mjs"
import { addHlIxIy, arOpR } from "../CodeDecompiler.mjs"
import { DataWalker } from "../DataWalker.mjs"
import { DecompileWalker } from "../DecompileWalker.mjs"
import { DecomposedInstruction } from "./DecomposedInstruction.mjs"
import { InstructionHandler } from "./InstructionHandler.mjs"
import { SaveLoadInstructionHandler } from "./SaveLoadInstructionHandler.mjs"
import { TrivialInstructionHandler } from "./TrivialInstructionHandler.mjs"
import { Uint16InstructionHandler } from "./Uint16InstructionHandler.mjs"
import { UpdateMemoryRegisterInstructionHandler } from "./UpdateMemoryRegisterInstructionHandler.mjs"
import { XDCB } from "./XDCB.mjs"

/**
 * @abstract
 */
export class XD extends InstructionHandler {
    /**
     * @abstract
     * @protected
     * @type {string}
     */
    offsetRegister

    /**
     * These don't require further decoding but may take args
     *
     * @protected
     * @readonly
     * @type {Record<number, InstructionHandler>}
     */
    get simpleOpcodes() {
        return {
            [0x21]: new UpdateMemoryRegisterInstructionHandler(`LD ${this.offsetRegister}, nn`, this.offsetRegister),
            [0x22]: new SaveLoadInstructionHandler(`LD (nn), ${this.offsetRegister}`),
            [0x23]: new TrivialInstructionHandler(`INC ${this.offsetRegister}`),
            [0x2a]: new SaveLoadInstructionHandler(`LD ${this.offsetRegister}, (nn)`),
            [0x36]: new TrivialInstructionHandler(`LD (${this.offsetRegister}+d), n`),
            [0xb0]: new TrivialInstructionHandler("OR B"),
            [0xcb]: new XDCB(this.offsetRegister),
            [0xe1]: new Uint16InstructionHandler(`LD ${this.offsetRegister}, (SP)`),
            [0xe5]: new TrivialInstructionHandler(`PUSH ${this.offsetRegister}`),
            [0xe3]: new TrivialInstructionHandler(`EX (SP), ${this.offsetRegister}`),
        }
    }

    /**
     * @protected
     * @param {DataWalker} dw
     * @param {DecompileWalker} context
     * @returns {DecomposedInstruction | undefined | null}
     */
    get(dw, context) {
        const nnx = new BitView(dw.uint8())

        if(this.simpleOpcodes[nnx.n]) {
            return this.simpleOpcodes[nnx.n].resolve(dw, context)
        }

        switch (nnx.pre) {
            case 0: { // 0x0-3
                const r = addHlIxIy(nnx, this.offsetRegister)
                if (r) {
                    return r
                }

                if (this.isToMemory(nnx) && (nnx.b3 & 0b110) == 0b100) { // 0x.d34-5
                    const op = (nnx.b3 & 1) ? "DEC" : "INC"
                    return new DecomposedInstruction(`${op} (${this.offsetRegister}+d)`, dw)
                }

                break
            }
            case 1: { // 0x4-7
                if (this.isFromRegister(nnx)) {
                    const r = this.reg(nnx.b3)
                    return new DecomposedInstruction(`LD (${this.offsetRegister}+d), ${r}`, dw)
                } else if (this.isToRegister(nnx)) {
                    const r = this.reg(nnx.a3)
                    return new DecomposedInstruction(`LD ${r}, (${this.offsetRegister}+d)`, dw)
                }
                break
            }
            case 2: { // 0x8-b
                if (this.isFromMemory(nnx)) { // 0x?e, 0x?6
                    const op = arOpR[nnx.a3]
                    return new DecomposedInstruction(`${op} (${this.offsetRegister}+d)`, dw)
                }
                break
            }
            case 3: { // 0x.d c-f
                // Nothing here currently
                break
            }
        }

        return undefined
    }
}