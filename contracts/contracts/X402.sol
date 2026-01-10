// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * X402 Micropayments Contract
 *
 * HTTP 402 Payment Required primitive for /vibe services
 *
 * Enables:
 * - Pay-per-request for Claude Code services (ping.money, etc.)
 * - Instant settlement to service providers
 * - Transparent fee structure
 * - Withdrawal to user wallets
 *
 * Deployed on Base L2 for low fees
 */
contract X402Micropayments is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;

    struct Payment {
        address payer;
        address recipient;
        uint256 amount;
        string service;
        bytes32 requestId;
        uint256 timestamp;
        bool withdrawn;
    }

    // Mapping: requestId => Payment
    mapping(bytes32 => Payment) public payments;

    // Mapping: recipient => balance
    mapping(address => uint256) public balances;

    // Platform fee (basis points, e.g., 250 = 2.5%)
    uint256 public platformFeeBps = 250; // 2.5% default

    // Fee collector address
    address public feeCollector;

    // Events
    event PaymentMade(
        bytes32 indexed requestId,
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        string service
    );

    event PaymentWithdrawn(
        address indexed recipient,
        uint256 amount
    );

    event FeeCollected(
        address indexed collector,
        uint256 amount
    );

    constructor(address _usdcAddress, address _feeCollector) Ownable(msg.sender) {
        usdc = IERC20(_usdcAddress);
        feeCollector = _feeCollector;
    }

    /**
     * Pay for a service request
     *
     * @param recipient - Service provider address
     * @param amount - Amount in USDC (6 decimals)
     * @param service - Service identifier (e.g., "ping.expert.websockets")
     * @param requestId - Unique request identifier
     */
    function payForRequest(
        address recipient,
        uint256 amount,
        string calldata service,
        bytes32 requestId
    ) external nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(payments[requestId].payer == address(0), "Request already paid");

        // Transfer USDC from payer to contract
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "USDC transfer failed"
        );

        // Calculate platform fee
        uint256 fee = (amount * platformFeeBps) / 10000;
        uint256 recipientAmount = amount - fee;

        // Store payment record
        payments[requestId] = Payment({
            payer: msg.sender,
            recipient: recipient,
            amount: amount,
            service: service,
            requestId: requestId,
            timestamp: block.timestamp,
            withdrawn: false
        });

        // Credit recipient balance
        balances[recipient] += recipientAmount;

        // Credit fee collector
        balances[feeCollector] += fee;

        emit PaymentMade(requestId, msg.sender, recipient, amount, service);
    }

    /**
     * Withdraw accumulated balance
     */
    function withdraw() external nonReentrant {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "No balance to withdraw");

        balances[msg.sender] = 0;

        require(
            usdc.transfer(msg.sender, balance),
            "USDC transfer failed"
        );

        emit PaymentWithdrawn(msg.sender, balance);
    }

    /**
     * Withdraw specific amount
     */
    function withdrawAmount(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;

        require(
            usdc.transfer(msg.sender, amount),
            "USDC transfer failed"
        );

        emit PaymentWithdrawn(msg.sender, amount);
    }

    /**
     * Get payment details
     */
    function getPayment(bytes32 requestId) external view returns (Payment memory) {
        return payments[requestId];
    }

    /**
     * Get balance for an address
     */
    function getBalance(address account) external view returns (uint256) {
        return balances[account];
    }

    /**
     * Update platform fee (only owner)
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee cannot exceed 10%");
        platformFeeBps = newFeeBps;
    }

    /**
     * Update fee collector (only owner)
     */
    function setFeeCollector(address newCollector) external onlyOwner {
        require(newCollector != address(0), "Invalid collector");
        feeCollector = newCollector;
    }

    /**
     * Emergency withdrawal (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdc.balanceOf(address(this));
        require(usdc.transfer(owner(), balance), "Transfer failed");
    }
}
