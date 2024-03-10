import { BitView } from "../BitView.mjs"
import { addHlIxIy, arOpR } from "../CodeDecompiler.mjs"
import { DataWalker } from "../DataWalker.mjs"
import { DecompileWalker } from "../DecompileWalker.mjs"
import { hlIndirect } from "../registerRef.mjs"
import { hlR, rpR } from "../rpR.mjs"
import { CB } from "./CB.mjs"
import { CallInstructionHandler } from "./CallInstructionHandler.mjs"
import { DD } from "./DD.mjs"
import { DecomposedInstruction } from "./DecomposedInstruction.mjs"
import { ED } from "./ED.mjs"
import { FD } from "./FD.mjs"
import { InstructionHandler } from "./InstructionHandler.mjs"
import { RelCondJumpInstructionHandler } from "./RelCondJumpInstructionHandler.mjs"
import { RelUncondJumpInstructionHandler } from "./RelUncondJumpInstructionHandler.mjs"
import { SaveLoadHLInstructionHandler } from "./SaveLoadHLInstructionHandler.mjs"
import { SaveLoadInstructionHandler } from "./SaveLoadInstructionHandler.mjs"
import { TrivialInstructionHandler } from "./TrivialInstructionHandler.mjs"
import { Uint8InstructionHandler } from "./Uint8InstructionHandler.mjs"
import { UncondJumpInstructionHandler } from "./UncondJumpInstructionHandler.mjs"
import { UpdateMemoryRegisterInstructionHandler } from "./UpdateMemoryRegisterInstructionHandler.mjs"

/**
 *
 */
export class Initial extends InstructionHandler {
    /**
     * These don't require further decoding but may take args
     *
     * @protected
     * @readonly
     * @type {Record<number, InstructionHandler>}
     */
    get simpleOpcodes() {
        return {
            [0x00]: new TrivialInstructionHandler("NOP"),
            [0x02]: new TrivialInstructionHandler("LD (BC), A"),
            [0x07]: new TrivialInstructionHandler("RLCA"),
            [0x08]: new TrivialInstructionHandler("EX AF, AF'"),
            [0x0a]: new TrivialInstructionHandler("LD A, (BC)"),
            [0x0f]: new TrivialInstructionHandler("RRCA"),
            [0x10]: new RelCondJumpInstructionHandler("DJNZ e"),
            [0x12]: new TrivialInstructionHandler("LD (DE), A"),
            [0x17]: new TrivialInstructionHandler("RLA"),
            [0x18]: new RelUncondJumpInstructionHandler("JR e"),
            [0x1a]: new TrivialInstructionHandler("LD A, (DE)"),
            [0x1f]: new TrivialInstructionHandler("RRA"),
            [0x20]: new RelCondJumpInstructionHandler("JR NZ, e"),
            [0x21]: new UpdateMemoryRegisterInstructionHandler("LD HL, nn", "HL"),
            [0x22]: new SaveLoadInstructionHandler("LD (nn), HL"),
            [0x27]: new TrivialInstructionHandler("DAA"),
            [0x28]: new RelCondJumpInstructionHandler("JR Z, e"),
            [0x2a]: new SaveLoadHLInstructionHandler("LD HL, (nn)"),
            [0x2f]: new TrivialInstructionHandler("CPL"),
            [0x30]: new RelCondJumpInstructionHandler("JR NC, e"),
            [0x31]: new UpdateMemoryRegisterInstructionHandler("LD SP, nn", "SP"),
            [0x32]: new SaveLoadInstructionHandler("LD (nn), A"),
            [0x36]: new Uint8InstructionHandler("LD (HL), n"),
            [0x37]: new TrivialInstructionHandler("SCF"),
            [0x38]: new RelCondJumpInstructionHandler("JR C, e"),
            [0x3a]: new SaveLoadInstructionHandler("LD A, (nn)"),
            [0x3f]: new TrivialInstructionHandler("CCF"),
            [0xc3]: new UncondJumpInstructionHandler("JP a"),
            [0xc9]: new TrivialInstructionHandler("RET").withAction((dw, context) => {
                context.unknownJump = true
            }),
            [0xcb]: new CB(),
            [0xcd]: new CallInstructionHandler("CALL a"),
            [0xd3]: new Uint8InstructionHandler("OUT (n), A"),
            [0xd9]: new TrivialInstructionHandler("EXX"),
            [0xdb]: new Uint8InstructionHandler("IN A, (n)"),
            [0xdd]: new DD(),
            [0xe1]: new TrivialInstructionHandler("POP HL").withAction((dw, context) => {
                context.clearHLValue()
            }),
            [0xe3]: new TrivialInstructionHandler("EX (SP), HL"),
            [0xe9]: new TrivialInstructionHandler("JP (HL)").withAction((dw, context) => {
                context.addJumpToHL()
            }),
            [0xeb]: new TrivialInstructionHandler("EX DE, HL"),
            [0xed]: new ED(),
            [0xf3]: new TrivialInstructionHandler("DI"),
            [0xf9]: new TrivialInstructionHandler("LD SP, HL").withAction((dw, context) => {
                if(context.activeHLValue !== null) {
                    context.store16BitRegisterValue("SP", context.activeHLValue)
                }
            }),
            [0xfb]: new TrivialInstructionHandler("EI"),
            [0xfd]: new FD(),
        }
    }

    /**
     * This decodes based on rules
     *
     * @protected
     * @param {DataWalker} dw
     * @param {DecompileWalker} context
     * @returns {DecomposedInstruction | undefined | null}
     */
    get(dw, context) {
        const n = new BitView(dw.uint8())
        if(this.simpleOpcodes[n.n]) {
            return this.simpleOpcodes[n.n].resolve(dw, context)
        }

        switch(n.pre) {
            case 0b00: { // 0x0-0x3
                const r = addHlIxIy(n, "HL")
                if(r) {
                    return r
                }

                if(n.b4 == 0b0001) { // 0x01 11 [21] 31
                    return new DecomposedInstruction(`LD ${rpR[n.a2]}, nn`, dw)
                } else if((n.b3 & 0b110) == 0b100) {
                    const op = (n.b3 & 1) ? "DEC" : "INC"
                    const r = this.reg(n.a3)
                    return new DecomposedInstruction(`${op} ${r}`)
                } else if(n.b3 == 0b011) {
                    // 16-bit arithmetic
                    const rp = rpR[n.a2]
                    const arithmeticOpR = {
                        [0b0011]: "INC",
                        [0b1011]: "DEC",
                    }
                    if(n.b4 in arithmeticOpR) {
                        return new DecomposedInstruction(`${arithmeticOpR[n.b4]} ${rp}`)
                    }
                } else if(n.a3 != hlIndirect && n.b3 == hlIndirect) {
                    const d = this.reg(n.a3)
                    return new DecomposedInstruction(`LD ${d}, n`, dw)
                }
                break
            }
            case 0b01: { // 0x4-0x7
                if(n.a3 != hlIndirect && n.b3 == hlIndirect) {
                    const d = this.reg(n.a3)
                    if(context.activeHLValue) {
                        context.addMemoryLocation(context.activeHLValue)
                    }
                    return new DecomposedInstruction(`LD ${d}, (HL)`)
                } else if(n.a3 == hlIndirect && n.b3 != hlIndirect) {
                    const s = this.reg(n.b3)
                    if(context.activeHLValue) {
                        context.addMemoryLocation(context.activeHLValue)
                    }
                    return new DecomposedInstruction(`LD (HL), ${s}`)
                } else if(n.a3 != hlIndirect && n.b3 != hlIndirect) {
                    const s = this.reg(n.b3)
                    const d = this.reg(n.a3)
                    return new DecomposedInstruction(`LD ${d}, ${s}`)
                }
                break
            }
            case 0b10: { // 0x8-0xb
                const op = arOpR[n.a3]
                const r = this.reg(n.b3)

                return new DecomposedInstruction(`${op} ${r}`)
            }
            case 0b11: { // 0xc-0xf
                if(n.b4 == 0b0001 && n.a2 != hlR) { // 0xc1, d1, [e1], f1
                    return new DecomposedInstruction(`POP ${rpR[n.a2]}`)
                } else if(n.b4 == 0b0101) {
                    return new DecomposedInstruction(`PUSH ${rpR[n.a2]}`)
                } else if(n.b3 == 0b111) { // 0x[c-f]f; 0[c-f]7
                    return new DecomposedInstruction(`RST ${n.a3 << 3}h`)
                }
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

                if(n.b3 == 0b000) {
                    return new DecomposedInstruction(`RET ${fR[n.a3]}`)
                } else if(n.b3 == 0b010) {
                    const di = new DecomposedInstruction(`JP ${fR[n.a3]} a`, dw)
                    context.addTarget(di.arguments[0])
                    return di
                } else if(n.b3 == 0b100) {
                    const di = new DecomposedInstruction(`CALL ${fR[n.a3]} a`, dw)
                    context.addTarget(di.arguments[0], "fn")
                    return di
                } else if(n.b3 == hlIndirect) {
                    // 8-bit arithmetic & logic
                    const op = arOpR[n.a3]
                    return new DecomposedInstruction(`${op} n`, dw)
                }
                break
            }
        }

        return null
    }
}