// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * Vibe Escrow Contract
 *
 * Escrow for peer-to-peer service transactions
 * (e.g., ping.money expert marketplace)
 *
 * Flow:
 * 1. Asker deposits USDC
 * 2. Expert provides answer
 * 3. Asker approves (funds released) or disputes
 * 4. Dispute resolution by arbiter
 *
 * Integration with /vibe social graph for reputation
 */
contract VibeEscrow is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;

    enum EscrowStatus {
        Active,
        Completed,
        Disputed,
        Refunded,
        Cancelled
    }

    struct Escrow {
        bytes32 id;
        address asker;
        address expert;
        uint256 amount;
        uint256 platformFee;
        string question;
        string service; // e.g., "ping.expert"
        EscrowStatus status;
        uint256 createdAt;
        uint256 expiresAt;
        address arbiter;
    }

    // Mapping: escrowId => Escrow
    mapping(bytes32 => Escrow) public escrows;

    // Platform fee (basis points)
    uint256 public platformFeeBps = 250; // 2.5%

    // Fee collector
    address public feeCollector;

    // Default arbiter for disputes
    address public defaultArbiter;

    // Timeout period (seconds)
    uint256 public timeoutPeriod = 48 hours;

    // Events
    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed asker,
        address indexed expert,
        uint256 amount,
        string question
    );

    event EscrowCompleted(
        bytes32 indexed escrowId,
        address indexed expert,
        uint256 amount
    );

    event EscrowDisputed(
        bytes32 indexed escrowId,
        address indexed disputedBy
    );

    event EscrowRefunded(
        bytes32 indexed escrowId,
        address indexed asker,
        uint256 amount
    );

    event EscrowCancelled(
        bytes32 indexed escrowId
    );

    constructor(
        address _usdcAddress,
        address _feeCollector,
        address _defaultArbiter
    ) Ownable(msg.sender) {
        usdc = IERC20(_usdcAddress);
        feeCollector = _feeCollector;
        defaultArbiter = _defaultArbiter;
    }

    /**
     * Create escrow for a service request
     */
    function createEscrow(
        address expert,
        uint256 amount,
        string calldata question,
        string calldata service,
        bytes32 escrowId
    ) external nonReentrant {
        require(expert != address(0), "Invalid expert");
        require(expert != msg.sender, "Cannot create escrow with yourself");
        require(amount > 0, "Amount must be > 0");
        require(escrows[escrowId].asker == address(0), "Escrow already exists");

        // Transfer USDC from asker to contract
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "USDC transfer failed"
        );

        // Calculate platform fee
        uint256 fee = (amount * platformFeeBps) / 10000;

        // Create escrow
        escrows[escrowId] = Escrow({
            id: escrowId,
            asker: msg.sender,
            expert: expert,
            amount: amount,
            platformFee: fee,
            question: question,
            service: service,
            status: EscrowStatus.Active,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + timeoutPeriod,
            arbiter: defaultArbiter
        });

        emit EscrowCreated(escrowId, msg.sender, expert, amount, question);
    }

    /**
     * Complete escrow (asker approves answer)
     */
    function completeEscrow(bytes32 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];

        require(escrow.asker == msg.sender, "Only asker can complete");
        require(escrow.status == EscrowStatus.Active, "Escrow not active");

        escrow.status = EscrowStatus.Completed;

        uint256 expertAmount = escrow.amount - escrow.platformFee;

        // Transfer to expert
        require(
            usdc.transfer(escrow.expert, expertAmount),
            "Expert transfer failed"
        );

        // Transfer fee to collector
        require(
            usdc.transfer(feeCollector, escrow.platformFee),
            "Fee transfer failed"
        );

        emit EscrowCompleted(escrowId, escrow.expert, expertAmount);
    }

    /**
     * Auto-complete after timeout (expert wins)
     */
    function autoCompleteEscrow(bytes32 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];

        require(escrow.status == EscrowStatus.Active, "Escrow not active");
        require(block.timestamp >= escrow.expiresAt, "Timeout not reached");

        escrow.status = EscrowStatus.Completed;

        uint256 expertAmount = escrow.amount - escrow.platformFee;

        require(
            usdc.transfer(escrow.expert, expertAmount),
            "Expert transfer failed"
        );

        require(
            usdc.transfer(feeCollector, escrow.platformFee),
            "Fee transfer failed"
        );

        emit EscrowCompleted(escrowId, escrow.expert, expertAmount);
    }

    /**
     * Dispute escrow
     */
    function disputeEscrow(bytes32 escrowId) external {
        Escrow storage escrow = escrows[escrowId];

        require(
            escrow.asker == msg.sender || escrow.expert == msg.sender,
            "Only parties can dispute"
        );
        require(escrow.status == EscrowStatus.Active, "Escrow not active");

        escrow.status = EscrowStatus.Disputed;

        emit EscrowDisputed(escrowId, msg.sender);
    }

    /**
     * Resolve dispute (arbiter only)
     */
    function resolveDispute(
        bytes32 escrowId,
        bool favorExpert
    ) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];

        require(msg.sender == escrow.arbiter, "Only arbiter can resolve");
        require(escrow.status == EscrowStatus.Disputed, "Not disputed");

        if (favorExpert) {
            escrow.status = EscrowStatus.Completed;
            uint256 expertAmount = escrow.amount - escrow.platformFee;

            require(
                usdc.transfer(escrow.expert, expertAmount),
                "Expert transfer failed"
            );

            require(
                usdc.transfer(feeCollector, escrow.platformFee),
                "Fee transfer failed"
            );

            emit EscrowCompleted(escrowId, escrow.expert, expertAmount);
        } else {
            escrow.status = EscrowStatus.Refunded;

            require(
                usdc.transfer(escrow.asker, escrow.amount),
                "Refund failed"
            );

            emit EscrowRefunded(escrowId, escrow.asker, escrow.amount);
        }
    }

    /**
     * Cancel escrow before expert accepts
     */
    function cancelEscrow(bytes32 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];

        require(escrow.asker == msg.sender, "Only asker can cancel");
        require(escrow.status == EscrowStatus.Active, "Escrow not active");
        require(
            block.timestamp < escrow.createdAt + 1 hours,
            "Cannot cancel after 1 hour"
        );

        escrow.status = EscrowStatus.Cancelled;

        require(
            usdc.transfer(escrow.asker, escrow.amount),
            "Refund failed"
        );

        emit EscrowCancelled(escrowId);
    }

    /**
     * Get escrow details
     */
    function getEscrow(bytes32 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
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
     * Update default arbiter (only owner)
     */
    function setDefaultArbiter(address newArbiter) external onlyOwner {
        require(newArbiter != address(0), "Invalid arbiter");
        defaultArbiter = newArbiter;
    }
}
