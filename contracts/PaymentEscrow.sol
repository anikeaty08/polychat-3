// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PaymentEscrow
 * @dev Smart contract for server-verified payments on Polygon Amoy
 * Allows users to make payments that can be verified by the server
 */
contract PaymentEscrow {
    address public owner;
    address public serverAddress;
    
    struct Payment {
        address payer;
        uint256 amount;
        uint256 timestamp;
        bool verified;
        string metadata;
    }
    
    mapping(bytes32 => Payment) public payments;
    mapping(address => uint256) public totalPayments;
    
    event PaymentCreated(
        bytes32 indexed paymentId,
        address indexed payer,
        uint256 amount,
        uint256 timestamp
    );
    
    event PaymentVerified(
        bytes32 indexed paymentId,
        address indexed payer,
        uint256 amount
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier onlyServer() {
        require(msg.sender == serverAddress, "Only server can verify");
        _;
    }
    
    constructor(address _serverAddress) {
        owner = msg.sender;
        serverAddress = _serverAddress;
    }
    
    /**
     * @dev Create a payment record
     * @param paymentId Unique identifier for the payment
     * @param metadata Additional payment metadata
     */
    function createPayment(
        bytes32 paymentId,
        string memory metadata
    ) external payable {
        require(msg.value > 0, "Payment amount must be greater than 0");
        require(payments[paymentId].payer == address(0), "Payment ID already exists");
        
        payments[paymentId] = Payment({
            payer: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            verified: false,
            metadata: metadata
        });
        
        totalPayments[msg.sender] += msg.value;
        
        emit PaymentCreated(paymentId, msg.sender, msg.value, block.timestamp);
    }
    
    /**
     * @dev Verify a payment (only callable by server)
     * @param paymentId The payment ID to verify
     */
    function verifyPayment(bytes32 paymentId) external onlyServer {
        Payment storage payment = payments[paymentId];
        require(payment.payer != address(0), "Payment does not exist");
        require(!payment.verified, "Payment already verified");
        
        payment.verified = true;
        
        emit PaymentVerified(paymentId, payment.payer, payment.amount);
    }
    
    /**
     * @dev Get payment details
     * @param paymentId The payment ID to query
     */
    function getPayment(bytes32 paymentId) external view returns (
        address payer,
        uint256 amount,
        uint256 timestamp,
        bool verified,
        string memory metadata
    ) {
        Payment memory payment = payments[paymentId];
        return (
            payment.payer,
            payment.amount,
            payment.timestamp,
            payment.verified,
            payment.metadata
        );
    }
    
    /**
     * @dev Update server address (only owner)
     * @param _serverAddress New server address
     */
    function setServerAddress(address _serverAddress) external onlyOwner {
        require(_serverAddress != address(0), "Invalid server address");
        serverAddress = _serverAddress;
    }
    
    /**
     * @dev Withdraw funds (only owner)
     */
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}



