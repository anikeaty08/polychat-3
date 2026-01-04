// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PolychatMessaging
 * @dev Smart contract for on-chain messaging on Polygon Amoy
 */
contract PolychatMessaging {
    address public owner;
    
    struct Message {
        address sender;
        address receiver;
        string content;
        string messageType; // text, image, video, file, audio
        string ipfsHash;
        uint256 timestamp;
        bool exists;
    }
    
    struct Conversation {
        address participant1;
        address participant2;
        uint256 createdAt;
        uint256 lastMessageAt;
        bool exists;
    }
    
    mapping(bytes32 => Message) public messages;
    mapping(bytes32 => Conversation) public conversations;
    mapping(address => bytes32[]) public userConversations;
    mapping(bytes32 => bytes32[]) public conversationMessages;
    
    event MessageSent(
        bytes32 indexed messageId,
        address indexed sender,
        address indexed receiver,
        string content,
        string messageType,
        uint256 timestamp
    );
    
    event ConversationCreated(
        bytes32 indexed conversationId,
        address indexed participant1,
        address indexed participant2,
        uint256 timestamp
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Create or get a conversation between two users
     */
    function createConversation(address participant1, address participant2) external returns (bytes32) {
        require(participant1 != address(0) && participant2 != address(0), "Invalid addresses");
        require(participant1 != participant2, "Cannot create conversation with self");
        
        // Generate conversation ID (deterministic)
        bytes32 conversationId = keccak256(abi.encodePacked(
            participant1 < participant2 ? participant1 : participant2,
            participant1 < participant2 ? participant2 : participant1
        ));
        
        if (!conversations[conversationId].exists) {
            conversations[conversationId] = Conversation({
                participant1: participant1,
                participant2: participant2,
                createdAt: block.timestamp,
                lastMessageAt: block.timestamp,
                exists: true
            });
            
            userConversations[participant1].push(conversationId);
            userConversations[participant2].push(conversationId);
            
            emit ConversationCreated(conversationId, participant1, participant2, block.timestamp);
        }
        
        return conversationId;
    }
    
    /**
     * @dev Send a message on-chain
     */
    function sendMessage(
        bytes32 conversationId,
        address receiver,
        string memory content,
        string memory messageType,
        string memory ipfsHash
    ) external returns (bytes32) {
        require(conversations[conversationId].exists, "Conversation does not exist");
        require(
            conversations[conversationId].participant1 == msg.sender ||
            conversations[conversationId].participant2 == msg.sender,
            "Not a participant"
        );
        require(
            conversations[conversationId].participant1 == receiver ||
            conversations[conversationId].participant2 == receiver,
            "Invalid receiver"
        );
        
        bytes32 messageId = keccak256(abi.encodePacked(
            conversationId,
            msg.sender,
            receiver,
            block.timestamp,
            block.number
        ));
        
        messages[messageId] = Message({
            sender: msg.sender,
            receiver: receiver,
            content: content,
            messageType: messageType,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            exists: true
        });
        
        conversationMessages[conversationId].push(messageId);
        conversations[conversationId].lastMessageAt = block.timestamp;
        
        emit MessageSent(messageId, msg.sender, receiver, content, messageType, block.timestamp);
        
        return messageId;
    }
    
    /**
     * @dev Get conversation ID for two users
     */
    function getConversationId(address user1, address user2) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            user1 < user2 ? user1 : user2,
            user1 < user2 ? user2 : user1
        ));
    }
    
    /**
     * @dev Get message count in a conversation
     */
    function getMessageCount(bytes32 conversationId) external view returns (uint256) {
        return conversationMessages[conversationId].length;
    }
    
    /**
     * @dev Get message IDs in a conversation (with pagination)
     */
    function getMessageIds(bytes32 conversationId, uint256 offset, uint256 limit) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        bytes32[] memory allMessages = conversationMessages[conversationId];
        uint256 length = allMessages.length;
        
        if (offset >= length) {
            return new bytes32[](0);
        }
        
        uint256 end = offset + limit;
        if (end > length) {
            end = length;
        }
        
        bytes32[] memory result = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = allMessages[length - 1 - i]; // Reverse order (newest first)
        }
        
        return result;
    }
}



