import { BitView } from "../BitView.mjs"
import { DecomposedInstruction } from "../DecomposedInstruction/DecomposedInstruction.mjs"
import { Utilities } from "../Utilities.mjs"
import { Z80Registers16b, Z80Registers8b } from "../Z80Registers.mjs"
import { hlR, rpR } from "../rpR.mjs"
import { CopyRegisterInstructionHandler } from "./CopyRegisterInstructionHandler.mjs"
import { InstructionHandler } from "./InstructionHandler.mjs"
import { LoadInstructionHandler } from "./LoadInstructionHandler.mjs"
import { SaveInstructionHandler } from "./SaveInstructionHandler.mjs"
import { TrivialInstructionHandler } from "./TrivialInstructionHandler.mjs"

/**
 * @extends {InstructionHandler<import("../DecomposedInstruction/DecomposedInstruction.mjs").DecomposedInstruction>}
 */
export class EDInstructionHandler extends InstructionHandler {
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
            [0x47]: new CopyRegisterInstructionHandler(Z80Registers8b.I, Z80Registers8b.A),
            [0x4f]: new CopyRegisterInstructionHandler(Z80Registers8b.R, Z80Registers8b.A),
            [0x57]: new CopyRegisterInstructionHandler(Z80Registers8b.A, Z80Registers8b.I),
            [0x5f]: new CopyRegisterInstructionHandler(Z80Registers8b.A, Z80Registers8b.R),
            [0xb0]: new TrivialInstructionHandler("LDIR", (dw, context) => {
                // Immediately not so trivial
                let de = context.s16.getRegisterValue(Z80Registers16b.DE)
                let hl = context.s16.getRegisterValue(Z80Registers16b.HL)
                let bc = context.s16.getRegisterValue(Z80Registers16b.BC)
                if(!Utilities.isNumber(bc)) {
                    context.s16.storeRegisterValue(Z80Registers16b.HL, null)
                    context.s16.storeRegisterValue(Z80Registers16b.DE, null)
                } else {
                    bc = bc || 65536
                    if(Utilities.isNumber(hl) && Utilities.isNumber(de)) {
                        for(let i = 0; i < bc; i++) {
                            const v = context.s8.getMemoryValue(hl)
                            context.s8.storeMemoryValue(de, v)
                            hl++
                            de++
                        }
                        context.s16.storeRegisterValue(Z80Registers16b.HL, hl)
                        context.s16.storeRegisterValue(Z80Registers16b.DE, de)
                    } else if(Utilities.isNumber(hl)) {
                        context.s16.storeRegisterValue(Z80Registers16b.HL, hl + bc)
                    } else if(Utilities.isNumber(de)) {
                        context.s16.storeRegisterValue(Z80Registers16b.DE, de + bc)
                    }
                }
                context.s16.storeRegisterValue(Z80Registers16b.BC, 0)
            }),
            [0xb8]: new TrivialInstructionHandler("LDDR"),
        }
    }

    /**
     * @protected
     * @param {import("../DataWalker.mjs").DataWalker} dw
     * @param {import("../DecompileContext.mjs").DecompileContext} context
     * @returns {DecomposedInstruction | null | undefined}
     */
    get(dw, context) {
        const nn = dw.uint8()
        if(this.simpleOpcodes[nn]) {
            return this.simpleOpcodes[nn].resolve(dw, context)
        }
        const nnx = new BitView(nn)
        switch(nnx.pre) {
            case 0x01: { // 0x4-0x7
                if(nnx.b3 == 0b010) {
                    // 4a 42 5a 52 6a 62 7a 72
                    // 16-bit arithmetic
                    const op = (nnx.a3 & 0b1) ? "ADC" : "SBC"
                    /**
                     * @type {import("../Types.mjs").IntRange<0, 3>}
                     */
                    const rpRef = nnx.a3 >> 1 // Top 2 bits of a3
                    const rp = rpR[rpRef]
                    return new DecomposedInstruction(`${op} HL, ${rp}`)
                } else if(nnx.a2 != hlR && nnx.b4 == 0b0011) {
                    // 43 53 73
                    // 16-bit load
                    const rp = rpR[nnx.a2]
                    return new SaveInstructionHandler(`LD (a), ${rp}`, rp).resolve(dw, context)
                } else if(nnx.a2 != hlR && nnx.b4 == 0b1011) {
                    // 4B 5B 7B
                    // 16-bit load
                    // Not 0x6B (non-standard)
                    const rp = rpR[nnx.a2]
                    return new LoadInstructionHandler(`LD ${rp}, (a)`, rp).resolve(dw, context)
                }
            }
        }

        return null
    }
}