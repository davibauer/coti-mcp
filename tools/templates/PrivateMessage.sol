// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "coti-contracts/contracts/utils/mpc/MpcCore.sol";

/**
 * @title Private Message Contract for COTI Blockchain
 * @notice Stores a full history of encrypted messages per sender-recipient pair using COTI MPC.
 * @dev Each message is encrypted specifically for the recipient's address.
 *      Only the recipient can decrypt messages using their own AES key.
 *
 * MPC Types Used:
 * - utString: User-encrypted string (on-chain storage, per recipient)
 * - gtString: General encrypted string (intermediate processing)
 * - ctString: Ciphertext string (returned to caller for decryption)
 * - itString: Input ciphertext string (provided by sender)
 */
contract PrivateMessage {
    // sender => recipient => index => encrypted message
    mapping(address => mapping(address => mapping(uint256 => utString))) private _messages;
    // sender => recipient => message count
    mapping(address => mapping(address => uint256)) private _messageCount;
    // recipient => list of unique senders
    mapping(address => address[]) private _senders;
    // sender => recipient => already tracked
    mapping(address => mapping(address => bool)) private _hasSent;

    /**
     * @notice Send an encrypted message to a specific recipient
     * @param recipient The address of the message recipient
     * @param value The encrypted message input (built client-side with buildStringInputText)
     */
    function sendMessage(address recipient, itString calldata value) external {
        if (!_hasSent[msg.sender][recipient]) {
            _senders[recipient].push(msg.sender);
            _hasSent[msg.sender][recipient] = true;
        }
        uint256 index = _messageCount[msg.sender][recipient];
        gtString memory msg_ = MpcCore.validateCiphertext(value);
        _messages[msg.sender][recipient][index] = MpcCore.offBoardCombined(msg_, recipient);
        _messageCount[msg.sender][recipient] = index + 1;
    }

    /**
     * @notice Read a message sent to you by a specific sender
     * @param sender The address of the message sender
     * @param index The index of the message (0-based)
     * @return The ciphertext that can be decrypted by the caller using their AES key
     */
    function readMessage(address sender, uint256 index) public view returns (ctString memory) {
        return _messages[sender][msg.sender][index].userCiphertext;
    }

    /**
     * @notice Get the number of messages sent to you by a specific sender
     * @param sender The address of the message sender
     * @return The number of messages from sender to msg.sender
     */
    function getMessageCount(address sender) public view returns (uint256) {
        return _messageCount[sender][msg.sender];
    }

    /**
     * @notice Get all addresses that have sent you at least one message
     * @return Array of sender addresses
     */
    function getSenders() public view returns (address[] memory) {
        return _senders[msg.sender];
    }
}
