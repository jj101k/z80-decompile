import { AnyExpression } from "../Value/index.mjs"
import { MachineStateView } from "./MachineStateView.mjs"

/**
 * @extends {MachineStateView<import("../Z80Registers.mjs").Z80Registers16b>}
 */
export class MachineStateView16b extends MachineStateView {
    /**
     * @protected
     * @param {string} register
     * @throws
     * @returns {import("../UtilityTypes.mjs").anyValue | null}
     */
    assertRegisterValue(register) {
        return this.state.assertWideRegisterValue(register)
    }

    /**
     *
     * @param {import("../Z80Registers.mjs").Z80Registers16b} register
     */
    clearRegisterValue(register) {
        return this.state.clearWideRegisterValue(register)
    }

    /**
     *
     * @param {import("../UtilityTypes.mjs").anyValue | null} address
     * @param {number} offset
     * @returns {import("../UtilityTypes.mjs").anyValue | null}
     */
    getMemoryValue(address, offset = 0) {
        return this.state.getMemoryBytes(address, 16 / 8, offset)
    }

    /**
     *
     * @param {import("../Z80Registers.mjs").Z80Registers16b} register
     * @returns {import("../UtilityTypes.mjs").anyValue | null}
     */
    getRegisterValue(register) {
        return this.state.getWideRegisterValue(register)
    }

    /**
     *
     * @param {import("../UtilityTypes.mjs").anyValue} location
     * @param {import("../UtilityTypes.mjs").anyValue | null} n
     */
    storeMemoryValue(location, n) {
        return this.state.storeMemoryBytes(location, AnyExpression.as16bit(n), 16 / 8)
    }

    /**
     *
     * @param {import("../Z80Registers.mjs").Z80Registers16b} register
     * @param {import("../UtilityTypes.mjs").anyValue | null} n
     */
    storeRegisterValue(register, n) {
        return this.state.storeWideRegisterValue(register, AnyExpression.as16bit(n))
    }
}