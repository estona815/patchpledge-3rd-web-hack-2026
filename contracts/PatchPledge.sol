// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PatchPledge
/// @notice Local-EVM prototype: a sponsor escrows a bounty, a worker commits
/// evidence by hash, and two independent reviewers authorize payment.
contract PatchPledge {
    struct Bounty {
        address sponsor;
        address worker;
        address reviewerA;
        address reviewerB;
        bytes32 taskHash;
        bytes32 proofHash;
        uint256 amount;
        uint64 deadline;
        uint8 approvals;
        bool submitted;
        bool paid;
        bool refunded;
    }

    uint256 public nextId;
    mapping(uint256 => Bounty) public bounties;
    mapping(uint256 => mapping(address => bool)) public voted;

    event BountyOpened(uint256 indexed id, address indexed sponsor, uint256 amount, bytes32 taskHash);
    event EvidenceSubmitted(uint256 indexed id, address indexed worker, bytes32 proofHash);
    event ApprovalRecorded(uint256 indexed id, address indexed reviewer, uint8 approvals);
    event BountyPaid(uint256 indexed id, address indexed worker, uint256 amount);
    event BountyRefunded(uint256 indexed id, address indexed sponsor, uint256 amount);

    function openBounty(
        bytes32 taskHash,
        address reviewerA,
        address reviewerB,
        uint64 deadline
    ) external payable returns (uint256 id) {
        require(msg.value > 0, "Deposit required");
        require(taskHash != bytes32(0), "Task hash required");
        require(deadline > block.timestamp, "Future deadline required");
        require(reviewerA != address(0) && reviewerB != address(0), "Reviewers required");
        require(reviewerA != reviewerB, "Reviewers must differ");
        require(reviewerA != msg.sender && reviewerB != msg.sender, "Sponsor cannot review");

        id = nextId++;
        Bounty storage bounty = bounties[id];
        bounty.sponsor = msg.sender;
        bounty.reviewerA = reviewerA;
        bounty.reviewerB = reviewerB;
        bounty.taskHash = taskHash;
        bounty.amount = msg.value;
        bounty.deadline = deadline;
        emit BountyOpened(id, msg.sender, msg.value, taskHash);
    }

    function submitEvidence(uint256 id, bytes32 proofHash) external {
        require(id < nextId, "Unknown bounty");
        Bounty storage bounty = bounties[id];
        require(block.timestamp <= bounty.deadline, "Deadline passed");
        require(!bounty.submitted && !bounty.refunded, "Submission closed");
        require(proofHash != bytes32(0), "Proof hash required");
        require(msg.sender != bounty.sponsor && msg.sender != bounty.reviewerA
            && msg.sender != bounty.reviewerB, "Independent worker required");

        bounty.worker = msg.sender;
        bounty.proofHash = proofHash;
        bounty.submitted = true;
        emit EvidenceSubmitted(id, msg.sender, proofHash);
    }

    function approve(uint256 id) external {
        require(id < nextId, "Unknown bounty");
        Bounty storage bounty = bounties[id];
        require(block.timestamp <= bounty.deadline, "Deadline passed");
        require(bounty.submitted && !bounty.paid && !bounty.refunded, "Not reviewable");
        require(msg.sender == bounty.reviewerA || msg.sender == bounty.reviewerB,
            "Only assigned reviewers");
        require(!voted[id][msg.sender], "Already voted");

        voted[id][msg.sender] = true;
        bounty.approvals += 1;
        emit ApprovalRecorded(id, msg.sender, bounty.approvals);

        if (bounty.approvals == 2) {
            bounty.paid = true;
            (bool ok, ) = bounty.worker.call{value: bounty.amount}("");
            require(ok, "Payout failed");
            emit BountyPaid(id, bounty.worker, bounty.amount);
        }
    }

    function refund(uint256 id) external {
        require(id < nextId, "Unknown bounty");
        Bounty storage bounty = bounties[id];
        require(msg.sender == bounty.sponsor, "Only sponsor");
        require(block.timestamp > bounty.deadline, "Not expired");
        require(!bounty.paid && !bounty.refunded, "Already settled");

        bounty.refunded = true;
        (bool ok, ) = bounty.sponsor.call{value: bounty.amount}("");
        require(ok, "Refund failed");
        emit BountyRefunded(id, bounty.sponsor, bounty.amount);
    }
}
