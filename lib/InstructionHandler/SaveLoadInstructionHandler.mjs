import { VariableWidthInstructionHandler } from "./VariableWidthInstructionHandler.mjs"

/**
 * @abstract
 * @template {import("../Z80Registers.mjs").Z80Registers8b | import("../Z80Registers.mjs").Z80Registers16b} T
 * @extends {VariableWidthInstructionHandler<T>}
 */
export class SaveLoadInstructionHandler extends VariableWidthInstructionHandler {
    /**
     *
     * @param {import("../DataWalker.mjs").DataWalker} dw
     * @param {import("../DecompileContext.mjs").DecompileContext} context
     * @returns
     */
    get(dw, context) {
        const di = super.get(dw, context)
        context.addMemoryLocation(+di.arguments[0])
        return di
    }
}