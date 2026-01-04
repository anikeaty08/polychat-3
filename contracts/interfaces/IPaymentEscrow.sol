// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPaymentEscrow {
    function createPayment(bytes32 paymentId, string memory metadata) external payable;
    function verifyPayment(bytes32 paymentId) external;
    function getPayment(bytes32 paymentId) external view returns (
        address payer,
        uint256 amount,
        uint256 timestamp,
        bool verified,
        string memory metadata
    );
}



