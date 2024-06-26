import { VariableWidthInstructionHandler } from "./VariableWidthInstructionHandler.mjs"

/**
 * Copying from register to register
 * @template {import("../Z80Registers.mjs").Z80Registers8b | import("../Z80Registers.mjs").Z80Registers16b} T
 * @extends {VariableWidthInstructionHandler<T>}
 */
export class CopyRegisterInstructionHandler extends VariableWidthInstructionHandler {
    /**
     *
     */
    #fromRegister
    /**
     *
     */
    get #toRegister() {
        return this.register
    }
    /**
     *
     * @protected
     * @param {import("../DataWalker.mjs").DataWalker} dw
     * @param {import("../DecompileContext.mjs").DecompileContext} context
     * @returns
     */
    get(dw, context) {
        const di = super.get(dw, context)
        const state = this.getState(context)
        state.storeRegisterValue(this.#toRegister, state.getRegisterValue(this.#fromRegister))
        return di
    }
    /**
     *
     * @param {T} toRegister
     * @param {T} fromRegister
     */
    constructor(toRegister, fromRegister) {
        super(`LD ${toRegister}, ${fromRegister}`, toRegister)
        this.#fromRegister = fromRegister
    }
}