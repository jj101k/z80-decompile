import {TrivialInstructionHandler} from "./TrivialInstructionHandler.mjs"
import {InstructionHandler} from "./InstructionHandler.mjs"
import {DataWalker} from "../DataWalker.mjs"
import {BitView} from "../BitView.mjs"
import { rpR, hlR } from "../rpR.mjs"
import {DecomposedInstruction} from "./DecomposedInstruction.mjs"
import {DecompileWalker} from "../DecompileWalker.mjs"

/**
 *
 */
export class ED extends InstructionHandler {
    /**
     * These don't require further decoding but may take args
     *
     * @protected
     * @readonly
     * @type {Record<number, InstructionHandler>}
     */
    get simpleOpcodes() {
        return {
            [0x44]: new TrivialInstructionHandler("NEG"),
            [0x47]: new TrivialInstructionHandler("LD I, A"),
            [0x4f]: new TrivialInstructionHandler("LD R, A"),
            [0x57]: new TrivialInstructionHandler("LD A, I"),
            [0x5f]: new TrivialInstructionHandler("LD A, R"),
            [0xb0]: new TrivialInstructionHandler("LDIR"),
            [0xb8]: new TrivialInstructionHandler("LDDR"),
        }
    }

    /**
     * @abstract
     * @param {DataWalker} dw
     * @param {DecompileWalker} context
     * @returns {DecomposedInstruction | undefined}
     */
    get(dw, context) {
        const nn = dw.uint8()
        if(this.simpleOpcodes[nn]) {
            return this.simpleOpcodes[nn].get(dw, context)
        }
        const nnx = new BitView(nn)
        switch(nnx.pre) {
            case 0x01: { // 0x4-0x7
                if(nnx.b3 == 0b010) {
                    // 4a 42 5a 52 6a 62 7a 72
                    // 16-bit arithmetic
                    const op = (nnx.a3 & 0b1) ? "ADC" : "SBC"
                    const rp = rpR[nnx.a3 & 0b011]
                    return new DecomposedInstruction(`${op} HL, ${rp}`)
                } else if(nnx.a2 != hlR && nnx.b4 == 0b0011) {
                    // 43 53 73
                    // 16-bit load
                    const rp = rpR[nnx.a2]
                    return new DecomposedInstruction(`LD (a), ${rp}`, dw)
                } else if(nnx.a2 != hlR && nnx.b4 == 0b1011) {
                    // 4B 5B 7B
                    // 16-bit load
                    const rp = rpR[nnx.a2]
                    return new DecomposedInstruction(`LD ${rp}, (a)`, dw)
                }
            }
        }

        return null
    }
}