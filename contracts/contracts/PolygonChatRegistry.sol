// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PolygonChatRegistry
/// @notice Stores lightweight identity and conversation metadata for a Polygon/Lighthouse chat app.
contract PolygonChatRegistry {
    struct Profile {
        string username;
        string displayName;
        string bio;
        string avatarCid;
        bool exists;
    }

    struct ConversationMeta {
        bytes32 conversationId;
        address userA;
        address userB;
        string latestCid;
        uint256 messageCount;
        uint256 updatedAt;
    }

    mapping(address => Profile) private profiles;
    mapping(string => address) private usernameOwner;
    mapping(address => mapping(address => bool)) private blocked;
    mapping(bytes32 => ConversationMeta) private conversations;

    event ProfileCreated(address indexed owner, string username);
    event ProfileUpdated(address indexed owner, string avatarCid, string bio, string displayName);
    event UsernameChanged(address indexed owner, string oldUsername, string newUsername);
    event BlockStatusChanged(address indexed owner, address indexed target, bool isBlocked);
    event MessagePointerUpdated(
        bytes32 indexed conversationId,
        address indexed sender,
        address indexed recipient,
        string cid,
        bytes32 contentHash,
        uint256 messageCount
    );

    error UsernameAlreadyTaken();
    error UsernameInvalid();
    error ProfileMissing();
    error CannotBlockSelf();
    error BlockedParticipant();
    error ConversationWithSelf();

    modifier onlyProfileOwner() {
        if (!profiles[msg.sender].exists) {
            revert ProfileMissing();
        }
        _;
    }

    function getProfile(address owner) external view returns (Profile memory) {
        return profiles[owner];
    }

    function ownerOfUsername(string calldata username) external view returns (address) {
        return usernameOwner[_sanitize(username)];
    }

    function getConversationMeta(bytes32 conversationId) external view returns (ConversationMeta memory) {
        return conversations[conversationId];
    }

    function isBlocked(address owner, address target) external view returns (bool) {
        return blocked[owner][target];
    }

    function registerProfile(
        string calldata username,
        string calldata avatarCid,
        string calldata bio,
        string calldata displayName
    ) external {
        _assertValidUsername(username);

        Profile storage existing = profiles[msg.sender];
        if (existing.exists) {
            revert UsernameInvalid();
        }

        string memory sanitized = _sanitize(username);
        if (usernameOwner[sanitized] != address(0)) {
            revert UsernameAlreadyTaken();
        }

        profiles[msg.sender] = Profile({
            username: sanitized,
            displayName: displayName,
            bio: bio,
            avatarCid: avatarCid,
            exists: true
        });
        usernameOwner[sanitized] = msg.sender;

        emit ProfileCreated(msg.sender, sanitized);
        emit ProfileUpdated(msg.sender, avatarCid, bio, displayName);
    }

    function updateProfile(
        string calldata avatarCid,
        string calldata bio,
        string calldata displayName
    ) external onlyProfileOwner {
        Profile storage profile = profiles[msg.sender];
        profile.avatarCid = avatarCid;
        profile.bio = bio;
        profile.displayName = displayName;

        emit ProfileUpdated(msg.sender, avatarCid, bio, displayName);
    }

    function changeUsername(string calldata newUsername) external onlyProfileOwner {
        _assertValidUsername(newUsername);
        string memory sanitized = _sanitize(newUsername);
        if (usernameOwner[sanitized] != address(0)) {
            revert UsernameAlreadyTaken();
        }

        Profile storage profile = profiles[msg.sender];
        string memory oldUsername = profile.username;
        usernameOwner[oldUsername] = address(0);

        profile.username = sanitized;
        usernameOwner[sanitized] = msg.sender;

        emit UsernameChanged(msg.sender, oldUsername, sanitized);
    }

    function setBlockStatus(address target, bool shouldBlock) external onlyProfileOwner {
        if (target == msg.sender) {
            revert CannotBlockSelf();
        }

        blocked[msg.sender][target] = shouldBlock;
        emit BlockStatusChanged(msg.sender, target, shouldBlock);
    }

    function upsertMessagePointer(
        address counterparty,
        string calldata cid,
        bytes32 contentHash
    ) external onlyProfileOwner returns (bytes32 conversationId, uint256 messageCount) {
        if (counterparty == msg.sender) {
            revert ConversationWithSelf();
        }
        if (blocked[msg.sender][counterparty] || blocked[counterparty][msg.sender]) {
            revert BlockedParticipant();
        }
        if (!profiles[counterparty].exists) {
            revert ProfileMissing();
        }
        if (bytes(cid).length == 0) {
            revert UsernameInvalid();
        }

        conversationId = _conversationId(msg.sender, counterparty);
        ConversationMeta storage convo = conversations[conversationId];

        if (convo.conversationId == bytes32(0)) {
            (address low, address high) = _orderPair(msg.sender, counterparty);
            convo.conversationId = conversationId;
            convo.userA = low;
            convo.userB = high;
        }

        convo.latestCid = cid;
        convo.messageCount += 1;
        convo.updatedAt = block.timestamp;
        messageCount = convo.messageCount;

        emit MessagePointerUpdated(conversationId, msg.sender, counterparty, cid, contentHash, messageCount);
    }

    function _assertValidUsername(string memory username) private pure {
        bytes memory data = bytes(username);
        if (data.length < 3 || data.length > 32) {
            revert UsernameInvalid();
        }
    }

    function _sanitize(string memory username) private pure returns (string memory) {
        bytes memory data = bytes(username);
        for (uint256 i = 0; i < data.length; i++) {
            bytes1 char = data[i];
            if (char >= 0x41 && char <= 0x5A) {
                data[i] = bytes1(uint8(char) + 32);
            }
        }
        return string(data);
    }

    function _conversationId(address a, address b) private pure returns (bytes32) {
        (address low, address high) = _orderPair(a, b);
        return keccak256(abi.encodePacked(low, high));
    }

    function _orderPair(address a, address b) private pure returns (address, address) {
        return a < b ? (a, b) : (b, a);
    }
}





