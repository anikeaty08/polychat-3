// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PolychatCalls
 * @dev Smart contract for on-chain call records on Polygon Amoy
 */
contract PolychatCalls {
    address public owner;
    
    enum CallType { Audio, Video }
    enum CallStatus { Initiated, Ringing, Answered, Completed, Missed, Declined, Cancelled }
    
    struct Call {
        address caller;
        address receiver;
        CallType callType;
        CallStatus status;
        uint256 startedAt;
        uint256 endedAt;
        uint256 duration; // in seconds
        string recordingIpfsHash;
        bool exists;
    }
    
    mapping(bytes32 => Call) public calls;
    mapping(address => bytes32[]) public userCalls;
    
    event CallInitiated(
        bytes32 indexed callId,
        address indexed caller,
        address indexed receiver,
        CallType callType,
        uint256 timestamp
    );
    
    event CallStatusChanged(
        bytes32 indexed callId,
        CallStatus status,
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
     * @dev Initiate a call
     */
    function initiateCall(
        address receiver,
        CallType callType
    ) external returns (bytes32) {
        require(receiver != address(0), "Invalid receiver");
        require(receiver != msg.sender, "Cannot call self");
        
        bytes32 callId = keccak256(abi.encodePacked(
            msg.sender,
            receiver,
            block.timestamp,
            block.number
        ));
        
        calls[callId] = Call({
            caller: msg.sender,
            receiver: receiver,
            callType: callType,
            status: CallStatus.Initiated,
            startedAt: block.timestamp,
            endedAt: 0,
            duration: 0,
            recordingIpfsHash: "",
            exists: true
        });
        
        userCalls[msg.sender].push(callId);
        userCalls[receiver].push(callId);
        
        emit CallInitiated(callId, msg.sender, receiver, callType, block.timestamp);
        
        return callId;
    }
    
    /**
     * @dev Update call status
     */
    function updateCallStatus(bytes32 callId, CallStatus status) external {
        require(calls[callId].exists, "Call does not exist");
        require(
            calls[callId].caller == msg.sender || calls[callId].receiver == msg.sender,
            "Not authorized"
        );
        
        Call storage call = calls[callId];
        call.status = status;
        
        if (status == CallStatus.Answered) {
            call.startedAt = block.timestamp;
        } else if (status == CallStatus.Completed || status == CallStatus.Missed || status == CallStatus.Declined) {
            call.endedAt = block.timestamp;
            if (call.startedAt > 0) {
                call.duration = block.timestamp - call.startedAt;
            }
        }
        
        emit CallStatusChanged(callId, status, block.timestamp);
    }
    
    /**
     * @dev Get user's call history
     */
    function getUserCalls(address user) external view returns (bytes32[] memory) {
        return userCalls[user];
    }
    
    /**
     * @dev Get call details
     */
    function getCall(bytes32 callId) external view returns (
        address caller,
        address receiver,
        CallType callType,
        CallStatus status,
        uint256 startedAt,
        uint256 endedAt,
        uint256 duration
    ) {
        require(calls[callId].exists, "Call does not exist");
        Call memory call = calls[callId];
        return (
            call.caller,
            call.receiver,
            call.callType,
            call.status,
            call.startedAt,
            call.endedAt,
            call.duration
        );
    }
}



