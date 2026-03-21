// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IdentityRegistry {
    struct AgentRecord {
        uint256 tokenId;
        string name;
        string description;
        string metadataURI;
        bool registered;
    }

    uint256 private _nextTokenId = 1;
    mapping(address => AgentRecord) private _agents;

    event AgentRegistered(address indexed agent, uint256 indexed tokenId, string name);

    function registerAgent(
        string calldata name,
        string calldata description,
        string calldata metadataURI
    ) external returns (uint256 tokenId) {
        require(!_agents[msg.sender].registered, "Already registered");

        tokenId = _nextTokenId++;
        _agents[msg.sender] = AgentRecord({
            tokenId: tokenId,
            name: name,
            description: description,
            metadataURI: metadataURI,
            registered: true
        });

        emit AgentRegistered(msg.sender, tokenId, name);
    }

    function getAgent(address agent)
        external
        view
        returns (string memory name, string memory description, bool registered)
    {
        AgentRecord storage record = _agents[agent];
        return (record.name, record.description, record.registered);
    }
}
