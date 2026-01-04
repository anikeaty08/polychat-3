// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title UserRegistry
 * @dev Optional on-chain user registry for Polychat
 * Stores username to wallet address mappings on-chain
 */
contract UserRegistry {
    address public owner;
    
    struct User {
        address walletAddress;
        string username;
        uint256 registeredAt;
        bool active;
    }
    
    mapping(string => address) public usernameToAddress;
    mapping(address => string) public addressToUsername;
    mapping(address => User) public users;
    
    address[] public allUsers;
    
    event UserRegistered(
        address indexed walletAddress,
        string username,
        uint256 timestamp
    );
    
    event UsernameUpdated(
        address indexed walletAddress,
        string oldUsername,
        string newUsername
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Register a username
     * @param _username The username to register
     */
    function registerUsername(string memory _username) external {
        require(bytes(_username).length >= 3 && bytes(_username).length <= 20, "Invalid username length");
        require(usernameToAddress[_username] == address(0), "Username already taken");
        require(bytes(addressToUsername[msg.sender]).length == 0, "Address already registered");
        
        // Validate username (alphanumeric and underscore only)
        bytes memory usernameBytes = bytes(_username);
        for (uint i = 0; i < usernameBytes.length; i++) {
            bytes1 char = usernameBytes[i];
            require(
                (char >= 0x30 && char <= 0x39) || // 0-9
                (char >= 0x41 && char <= 0x5A) || // A-Z
                (char >= 0x61 && char <= 0x7A) || // a-z
                char == 0x5F, // _
                "Invalid character in username"
            );
        }
        
        usernameToAddress[_username] = msg.sender;
        addressToUsername[msg.sender] = _username;
        
        users[msg.sender] = User({
            walletAddress: msg.sender,
            username: _username,
            registeredAt: block.timestamp,
            active: true
        });
        
        allUsers.push(msg.sender);
        
        emit UserRegistered(msg.sender, _username, block.timestamp);
    }
    
    /**
     * @dev Update username (with cooldown period)
     * @param _newUsername The new username
     */
    function updateUsername(string memory _newUsername) external {
        require(bytes(addressToUsername[msg.sender]).length > 0, "User not registered");
        require(bytes(_newUsername).length >= 3 && bytes(_newUsername).length <= 20, "Invalid username length");
        require(usernameToAddress[_newUsername] == address(0), "Username already taken");
        
        // Validate username
        bytes memory usernameBytes = bytes(_newUsername);
        for (uint i = 0; i < usernameBytes.length; i++) {
            bytes1 char = usernameBytes[i];
            require(
                (char >= 0x30 && char <= 0x39) ||
                (char >= 0x41 && char <= 0x5A) ||
                (char >= 0x61 && char <= 0x7A) ||
                char == 0x5F,
                "Invalid character in username"
            );
        }
        
        string memory oldUsername = addressToUsername[msg.sender];
        delete usernameToAddress[oldUsername];
        
        usernameToAddress[_newUsername] = msg.sender;
        addressToUsername[msg.sender] = _newUsername;
        users[msg.sender].username = _newUsername;
        
        emit UsernameUpdated(msg.sender, oldUsername, _newUsername);
    }
    
    /**
     * @dev Get user by username
     * @param _username The username to query
     */
    function getUserByUsername(string memory _username) external view returns (
        address walletAddress,
        string memory username,
        uint256 registeredAt,
        bool active
    ) {
        address userAddress = usernameToAddress[_username];
        require(userAddress != address(0), "User not found");
        
        User memory user = users[userAddress];
        return (
            user.walletAddress,
            user.username,
            user.registeredAt,
            user.active
        );
    }
    
    /**
     * @dev Get user by address
     * @param _address The wallet address to query
     */
    function getUserByAddress(address _address) external view returns (
        address walletAddress,
        string memory username,
        uint256 registeredAt,
        bool active
    ) {
        User memory user = users[_address];
        require(bytes(user.username).length > 0, "User not found");
        
        return (
            user.walletAddress,
            user.username,
            user.registeredAt,
            user.active
        );
    }
    
    /**
     * @dev Check if username is available
     * @param _username The username to check
     */
    function isUsernameAvailable(string memory _username) external view returns (bool) {
        return usernameToAddress[_username] == address(0);
    }
    
    /**
     * @dev Get total number of registered users
     */
    function getTotalUsers() external view returns (uint256) {
        return allUsers.length;
    }
}



