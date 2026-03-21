// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ReputationRegistry {
    struct ReputationData {
        uint256 totalScore;
        uint256 attestationCount;
    }

    mapping(address => ReputationData) private _reputation;

    event ReputationAdded(address indexed agent, uint256 score, uint256 newTotal);

    function addReputation(
        address agent,
        uint256 score,
        string calldata /* evidence — accepted for ABI compat, not stored */
    ) external {
        _reputation[agent].totalScore += score;
        _reputation[agent].attestationCount++;

        emit ReputationAdded(agent, score, _reputation[agent].totalScore);
    }

    function getReputation(address agent)
        external
        view
        returns (uint256 score, uint256 attestationCount)
    {
        ReputationData storage data = _reputation[agent];
        if (data.attestationCount == 0) return (0, 0);
        return (data.totalScore / data.attestationCount, data.attestationCount);
    }
}
