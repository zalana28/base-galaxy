// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Base Star Raider Leaderboard
/// @notice Minimal onchain high-score board for the Mini App.
///         Each player's *best* score is persisted. Anyone can submit.
contract Leaderboard {
    struct Entry {
        address player;
        uint256 score;
        uint64  timestamp;
    }

    address public owner;

    /// @notice Best score per player.
    mapping(address => uint256) public bestScore;

    /// @notice Last time a player entered a game session.
    mapping(address => uint64) public lastEntered;

    /// @notice Last 100 submissions, newest first (ring buffer).
    Entry[100] public recent;
    uint8 public head;

    event GameEntered(address indexed player, uint64 timestamp);
    event ScoreSubmitted(address indexed player, uint256 score, uint64 timestamp, bool newPersonalBest);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Record that a player has entered a game session.
    ///         No entry fee — player pays only gas.
    function enterGame() external {
        lastEntered[msg.sender] = uint64(block.timestamp);
        emit GameEntered(msg.sender, block.timestamp);
    }

    /// @notice Submit a score. Only updates the player's best if higher.
    function submitScore(uint256 score) external {
        bool isPb = score > bestScore[msg.sender];
        if (isPb) bestScore[msg.sender] = score;

        recent[head] = Entry({
            player:    msg.sender,
            score:     score,
            timestamp: uint64(block.timestamp)
        });
        head = uint8((uint256(head) + 1) % 100);

        emit ScoreSubmitted(msg.sender, score, uint64(block.timestamp), isPb);
    }

    /// @notice Returns the recent ring buffer in chronological order (newest first).
    function getRecent() external view returns (Entry[100] memory out) {
        for (uint256 i = 0; i < 100; i++) {
            uint256 idx = (uint256(head) + 99 - i) % 100;
            out[i] = recent[idx];
        }
    }
}
