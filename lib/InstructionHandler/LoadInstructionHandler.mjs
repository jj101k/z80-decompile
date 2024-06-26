import { SaveLoadInstructionHandler } from "./SaveLoadInstructionHandler.mjs"

/**
 * @template {import("../Z80Registers.mjs").Z80Registers8b | import("../Z80Registers.mjs").Z80Registers16b} T
 * @extends {SaveLoadInstructionHandler<T>}
 */
export class LoadInstructionHandler extends SaveLoadInstructionHandler {
    /**
     *
     * @param {import("../DataWalker.mjs").DataWalker} dw
     * @param {import("../DecompileContext.mjs").DecompileContext} context
     * @returns
     */
    get(dw, context) {
        const di = super.get(dw, context)
        const state = this.getState(context)
        const v = state.getMemoryValue(+di.arguments[0])
        state.storeRegisterValue(this.register, v)
        return di
    }
}