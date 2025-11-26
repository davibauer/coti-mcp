// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "coti-contracts/contracts/utils/mpc/MpcCore.sol";

/**
 * @title Private Message Storage for COTI Blockchain
 * @notice This is a simple template for storing encrypted messages on COTI
 * @dev Uses COTI's confidential types (utString, ctString) for encrypted message storage
 *
 * Key Features:
 * - Per-user encrypted message storage using COTI's MPC (Multi-Party Computation)
 * - Messages are encrypted and can only be read by the user who wrote them
 * - Uses utString (user encrypted string) for storage and ctString for reading
 *
 * MPC Types Used:
 * - utString: User-encrypted string (stored on-chain)
 * - gtString: General encrypted string (intermediate processing)
 * - ctString: Ciphertext string (returned to users)
 * - itString: Input ciphertext string (for writing)
 */
contract Message {
    utString private _message;

    constructor() {
        gtString memory message_ = MpcCore.setPublicString("");
        _message = MpcCore.offBoardCombined(message_, msg.sender);
    }

    function read() public view returns (ctString memory) {
        return _message.userCiphertext;
    }

    function write(itString calldata value) external {
        gtString memory message_ = MpcCore.validateCiphertext(value);
        _message = MpcCore.offBoardCombined(message_, msg.sender);
    }
}
