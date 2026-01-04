// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PolychatStatus
 * @dev Smart contract for on-chain status updates on Polygon Amoy
 */
contract PolychatStatus {
    address public owner;
    
    struct Status {
        address user;
        string text;
        string imageIpfsHash;
        uint256 timestamp;
        uint256 expiresAt;
        bool exists;
    }
    
    mapping(address => Status[]) public userStatuses;
    mapping(address => uint256) public userStatusCount;
    
    event StatusCreated(
        address indexed user,
        string text,
        string imageIpfsHash,
        uint256 timestamp,
        uint256 expiresAt
    );
    
    event StatusDeleted(
        address indexed user,
        uint256 statusIndex
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Create a new status
     */
    function createStatus(
        string memory text,
        string memory imageIpfsHash
    ) external {
        uint256 timestamp = block.timestamp;
        uint256 expiresAt = timestamp + 24 hours; // Status expires in 24 hours
        
        // Clean up expired statuses
        _cleanExpiredStatuses(msg.sender);
        
        userStatuses[msg.sender].push(Status({
            user: msg.sender,
            text: text,
            imageIpfsHash: imageIpfsHash,
            timestamp: timestamp,
            expiresAt: expiresAt,
            exists: true
        }));
        
        userStatusCount[msg.sender]++;
        
        emit StatusCreated(msg.sender, text, imageIpfsHash, timestamp, expiresAt);
    }
    
    /**
     * @dev Get user's active statuses (only non-expired)
     */
    function getUserStatuses(address user) external view returns (Status[] memory) {
        Status[] memory allStatuses = userStatuses[user];
        uint256 activeCount = 0;
        uint256 currentTime = block.timestamp;
        
        // Count active statuses (not expired)
        for (uint256 i = 0; i < allStatuses.length; i++) {
            if (allStatuses[i].exists && allStatuses[i].expiresAt > currentTime) {
                activeCount++;
            }
        }
        
        // Create array of active statuses
        Status[] memory activeStatuses = new Status[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allStatuses.length; i++) {
            if (allStatuses[i].exists && allStatuses[i].expiresAt > currentTime) {
                activeStatuses[index] = allStatuses[i];
                index++;
            }
        }
        
        return activeStatuses;
    }
    
    /**
     * @dev Clean up expired statuses for a user (can be called by anyone)
     */
    function cleanupExpiredStatuses(address user) external {
        Status[] storage statuses = userStatuses[user];
        uint256 currentTime = block.timestamp;
        
        for (uint256 i = 0; i < statuses.length; i++) {
            if (statuses[i].exists && statuses[i].expiresAt <= currentTime) {
                statuses[i].exists = false;
                userStatusCount[user]--;
            }
        }
    }
    
    /**
     * @dev Get latest status for a user (only if not expired)
     */
    function getLatestStatus(address user) external view returns (
        string memory text,
        string memory imageIpfsHash,
        uint256 timestamp,
        uint256 expiresAt,
        bool exists
    ) {
        Status[] memory statuses = userStatuses[user];
        uint256 currentTime = block.timestamp;
        
        // Find latest active status (not expired)
        for (uint256 i = statuses.length; i > 0; i--) {
            uint256 index = i - 1;
            if (statuses[index].exists && statuses[index].expiresAt > currentTime) {
                Status memory status = statuses[index];
                return (
                    status.text,
                    status.imageIpfsHash,
                    status.timestamp,
                    status.expiresAt,
                    true
                );
            }
        }
        
        return ("", "", 0, 0, false);
    }
    
    /**
     * @dev Clean up expired statuses for a user
     */
    function _cleanExpiredStatuses(address user) internal {
        Status[] storage statuses = userStatuses[user];
        
        for (uint256 i = 0; i < statuses.length; i++) {
            if (statuses[i].expiresAt <= block.timestamp) {
                statuses[i].exists = false;
            }
        }
    }
    
    /**
     * @dev Delete a specific status
     */
    function deleteStatus(uint256 statusIndex) external {
        require(statusIndex < userStatuses[msg.sender].length, "Invalid status index");
        require(userStatuses[msg.sender][statusIndex].exists, "Status does not exist");
        
        userStatuses[msg.sender][statusIndex].exists = false;
        userStatusCount[msg.sender]--;
        
        emit StatusDeleted(msg.sender, statusIndex);
    }
}

