// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReportRegistry
 * @dev A decentralized registry for phishing URLs and scam wallet addresses
 * Reports are anchored by deterministic bytes32 hash, with community voting
 */
contract ReportRegistry {
    struct Report {
        bytes32 reportHash;
        address reporter;
        uint256 timestamp;
        int256 voteScore; // net votes (upvotes - downvotes)
        bool exists;
    }

    struct Vote {
        bool hasVoted;
        bool isUpvote;
    }

    // Mapping from report hash to Report struct
    mapping(bytes32 => Report) public reports;
    
    // Mapping from report hash to voter address to Vote struct
    mapping(bytes32 => mapping(address => Vote)) public votes;
    
    // Array to track all report hashes
    bytes32[] public reportHashes;

    event ReportRegistered(
        bytes32 indexed reportHash,
        address indexed reporter,
        uint256 timestamp
    );

    event VoteCast(
        bytes32 indexed reportHash,
        address indexed voter,
        bool isUpvote,
        int256 newScore
    );

    event VoteChanged(
        bytes32 indexed reportHash,
        address indexed voter,
        bool isUpvote,
        int256 newScore
    );

    /**
     * @dev Register a new report by its canonical hash
     * @param reportHash The deterministic bytes32 hash of the report
     */
    function registerReport(bytes32 reportHash) external {
        require(reportHash != bytes32(0), "Invalid report hash");
        require(!reports[reportHash].exists, "Report already exists");

        reports[reportHash] = Report({
            reportHash: reportHash,
            reporter: msg.sender,
            timestamp: block.timestamp,
            voteScore: 0,
            exists: true
        });

        reportHashes.push(reportHash);

        emit ReportRegistered(reportHash, msg.sender, block.timestamp);
    }

    /**
     * @dev Cast a vote (upvote or downvote) on a report
     * @param reportHash The hash of the report to vote on
     * @param isUpvote True for upvote, false for downvote
     */
    function vote(bytes32 reportHash, bool isUpvote) external {
        require(reports[reportHash].exists, "Report does not exist");

        Vote storage userVote = votes[reportHash][msg.sender];
        Report storage report = reports[reportHash];

        if (userVote.hasVoted) {
            // User is changing their vote
            if (userVote.isUpvote != isUpvote) {
                // Remove old vote and apply new vote
                if (userVote.isUpvote) {
                    report.voteScore -= 2; // Remove upvote (+1) and add downvote (-1)
                } else {
                    report.voteScore += 2; // Remove downvote (-1) and add upvote (+1)
                }
                userVote.isUpvote = isUpvote;
                emit VoteChanged(reportHash, msg.sender, isUpvote, report.voteScore);
            }
            // If same vote, do nothing (already voted this way)
        } else {
            // New vote
            userVote.hasVoted = true;
            userVote.isUpvote = isUpvote;
            
            if (isUpvote) {
                report.voteScore += 1;
            } else {
                report.voteScore -= 1;
            }
            
            emit VoteCast(reportHash, msg.sender, isUpvote, report.voteScore);
        }
    }

    /**
     * @dev Get report details by hash
     * @param reportHash The hash of the report
     */
    function getReport(bytes32 reportHash) 
        external 
        view 
        returns (
            address reporter,
            uint256 timestamp,
            int256 voteScore,
            bool exists
        ) 
    {
        Report memory report = reports[reportHash];
        return (
            report.reporter,
            report.timestamp,
            report.voteScore,
            report.exists
        );
    }

    /**
     * @dev Get user's vote on a report
     * @param reportHash The hash of the report
     * @param voter The address of the voter
     */
    function getUserVote(bytes32 reportHash, address voter)
        external
        view
        returns (bool hasVoted, bool isUpvote)
    {
        Vote memory userVote = votes[reportHash][voter];
        return (userVote.hasVoted, userVote.isUpvote);
    }

    /**
     * @dev Get total number of registered reports
     */
    function getReportCount() external view returns (uint256) {
        return reportHashes.length;
    }

    /**
     * @dev Get report hash by index
     * @param index The index in the reportHashes array
     */
    function getReportHashByIndex(uint256 index) external view returns (bytes32) {
        require(index < reportHashes.length, "Index out of bounds");
        return reportHashes[index];
    }
}
