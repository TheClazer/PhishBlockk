// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test, console } from "forge-std/Test.sol";
import { ReputationSystem } from "../contracts/ReputationSystem.sol";
import { MockERC20 } from "./PhishBlockRegistry.test.sol";

contract ReputationSystemTest is Test {
    ReputationSystem public reputationSystem;
    MockERC20 public mockToken;

    address public owner;
    address public user1;
    address public user2;
    address public user3;
    address public attacker;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        attacker = makeAddr("attacker");

        // Deploy mock token
        mockToken = new MockERC20();

        // Deploy reputation system
        reputationSystem = new ReputationSystem(address(mockToken));

        // Setup initial reputation for users
        reputationSystem.updateReputation(user1, 50, true);
        reputationSystem.updateReputation(user2, 30, true);
        reputationSystem.updateReputation(user3, 20, true);

        // Mint tokens to users
        mockToken.mint(user1, 10000 * 10**18);
        mockToken.mint(user2, 10000 * 10**18);
        mockToken.mint(user3, 10000 * 10**18);
    }

    function testInitialState() public {
        assertEq(reputationSystem.getUserReputation(owner), 100);
        assertEq(reputationSystem.getUserReputation(user1), 50);
        assertEq(reputationSystem.getUserReputation(user2), 30);
        assertEq(reputationSystem.getUserReputation(user3), 20);
    }

    function testDepositStake() public {
        uint256 stakeAmount = 1000 * 10**18;
        uint256 lockPeriod = 30 days;

        vm.startPrank(user1);
        mockToken.approve(address(reputationSystem), stakeAmount);
        reputationSystem.depositStake(
            stakeAmount,
            lockPeriod,
            ReputationSystem.StakeType.Report
        );
        vm.stopPrank();

        assertEq(reputationSystem.getUserStakeCount(user1), 1);
        
        (
            uint256 amount,
            uint256 timestamp,
            uint256 lockPeriodReturned,
            ReputationSystem.StakeType stakeType,
            bool active,
            uint256 reputationMultiplier
        ) = reputationSystem.getUserStake(user1, 1);

        assertEq(amount, stakeAmount);
        assertEq(lockPeriodReturned, lockPeriod);
        assertEq(uint256(stakeType), uint256(ReputationSystem.StakeType.Report));
        assertTrue(active);
        assertEq(reputationMultiplier, 150); // 1.5x multiplier for Report stake
    }

    function testWithdrawStakeAfterLockPeriod() public {
        uint256 stakeAmount = 1000 * 10**18;
        uint256 lockPeriod = 1 days;

        // Deposit stake
        vm.startPrank(user1);
        mockToken.approve(address(reputationSystem), stakeAmount);
        reputationSystem.depositStake(
            stakeAmount,
            lockPeriod,
            ReputationSystem.StakeType.Report
        );
        vm.stopPrank();

        // Fast forward time past lock period
        vm.warp(block.timestamp + lockPeriod + 1);

        uint256 initialBalance = mockToken.balanceOf(user1);

        // Withdraw stake
        vm.prank(user1);
        reputationSystem.withdrawStake(1);

        uint256 finalBalance = mockToken.balanceOf(user1);
        assertEq(finalBalance, initialBalance + stakeAmount);
        assertEq(reputationSystem.getUserStakeCount(user1), 0);
    }

    function testWithdrawStakeBeforeLockPeriod() public {
        uint256 stakeAmount = 1000 * 10**18;
        uint256 lockPeriod = 30 days;

        // Deposit stake
        vm.startPrank(user1);
        mockToken.approve(address(reputationSystem), stakeAmount);
        reputationSystem.depositStake(
            stakeAmount,
            lockPeriod,
            ReputationSystem.StakeType.Report
        );
        vm.stopPrank();

        uint256 initialBalance = mockToken.balanceOf(user1);

        // Try to withdraw before lock period (should incur penalty)
        vm.prank(user1);
        reputationSystem.withdrawStake(1);

        uint256 finalBalance = mockToken.balanceOf(user1);
        uint256 expectedReturn = stakeAmount - (stakeAmount * 10) / 100; // 10% penalty
        assertEq(finalBalance, initialBalance + expectedReturn);
    }

    function testUpdateReputation() public {
        uint256 initialReputation = reputationSystem.getUserReputation(user1);
        
        // Update reputation positively
        reputationSystem.updateReputation(user1, 10, true);
        assertEq(reputationSystem.getUserReputation(user1), initialReputation + 10);

        // Update reputation negatively
        reputationSystem.updateReputation(user1, -5, false);
        assertEq(reputationSystem.getUserReputation(user1), initialReputation + 5);
    }

    function testTierUpgrade() public {
        // User starts with Bronze tier (0-49 reputation)
        (
            ,,,
            ReputationSystem.ReputationTier tier,
            ,,,,
        ) = reputationSystem.getUserProfile(user1);
        assertEq(uint256(tier), uint256(ReputationSystem.ReputationTier.Bronze));

        // Increase reputation to Silver tier (50+)
        reputationSystem.updateReputation(user1, 20, true);
        
        (
            ,,,
            ReputationSystem.ReputationTier newTier,
            ,,,,
        ) = reputationSystem.getUserProfile(user1);
        assertEq(uint256(newTier), uint256(ReputationSystem.ReputationTier.Silver));
    }

    function testSlashUser() public {
        uint256 stakeAmount = 1000 * 10**18;
        uint256 lockPeriod = 30 days;

        // Deposit stake
        vm.startPrank(user1);
        mockToken.approve(address(reputationSystem), stakeAmount);
        reputationSystem.depositStake(
            stakeAmount,
            lockPeriod,
            ReputationSystem.StakeType.Report
        );
        vm.stopPrank();

        uint256 initialBalance = mockToken.balanceOf(user1);

        // Slash user
        reputationSystem.slashUser(user1, 1, "Malicious behavior");

        // Check that stake was reduced
        (
            uint256 amount,
            ,,,,
        ) = reputationSystem.getUserStake(user1, 1);
        
        uint256 expectedAmount = stakeAmount - (stakeAmount * 10) / 100; // 10% slashing
        assertEq(amount, expectedAmount);
    }

    function testClaimRewards() public {
        // Add pending rewards
        reputationSystem.emergencyUpdatePendingRewards(user1, 100 * 10**18);

        uint256 initialBalance = mockToken.balanceOf(user1);

        // Claim rewards
        vm.prank(user1);
        reputationSystem.claimRewards();

        uint256 finalBalance = mockToken.balanceOf(user1);
        assertEq(finalBalance, initialBalance + 100 * 10**18);
        assertEq(reputationSystem.getPendingRewards(user1), 0);
    }

    function testRewardClaimCooldown() public {
        // Add pending rewards
        reputationSystem.emergencyUpdatePendingRewards(user1, 100 * 10**18);

        // Claim rewards
        vm.prank(user1);
        reputationSystem.claimRewards();

        // Try to claim again immediately (should fail)
        vm.prank(user1);
        vm.expectRevert("Claim cooldown not reached");
        reputationSystem.claimRewards();

        // Fast forward time past cooldown
        vm.warp(block.timestamp + 1 days + 1);

        // Add more rewards and claim again
        reputationSystem.emergencyUpdatePendingRewards(user1, 50 * 10**18);
        vm.prank(user1);
        reputationSystem.claimRewards();
    }

    function testInsufficientReputationToStake() public {
        // User with low reputation tries to stake
        vm.startPrank(attacker);
        mockToken.approve(address(reputationSystem), 1000 * 10**18);
        vm.expectRevert("Insufficient reputation to stake");
        reputationSystem.depositStake(
            1000 * 10**18,
            30 days,
            ReputationSystem.StakeType.Report
        );
        vm.stopPrank();
    }

    function testMinimumStakeAmount() public {
        uint256 minAmount = 99 * 10**18; // Below minimum

        vm.startPrank(user1);
        mockToken.approve(address(reputationSystem), minAmount);
        vm.expectRevert("Amount below minimum stake");
        reputationSystem.depositStake(
            minAmount,
            30 days,
            ReputationSystem.StakeType.Report
        );
        vm.stopPrank();
    }

    function testMaximumStakesPerUser() public {
        uint256 stakeAmount = 100 * 10**18;
        uint256 lockPeriod = 30 days;

        vm.startPrank(user1);
        mockToken.approve(address(reputationSystem), stakeAmount * 11); // Enough for 11 stakes

        // Deposit 10 stakes (should work)
        for (uint256 i = 0; i < 10; i++) {
            reputationSystem.depositStake(
                stakeAmount,
                lockPeriod,
                ReputationSystem.StakeType.Report
            );
        }

        // 11th stake should fail
        vm.expectRevert("Maximum stakes per user exceeded");
        reputationSystem.depositStake(
            stakeAmount,
            lockPeriod,
            ReputationSystem.StakeType.Report
        );
        vm.stopPrank();
    }

    function testPauseFunctionality() public {
        reputationSystem.pause();

        vm.startPrank(user1);
        mockToken.approve(address(reputationSystem), 1000 * 10**18);
        vm.expectRevert();
        reputationSystem.depositStake(
            1000 * 10**18,
            30 days,
            ReputationSystem.StakeType.Report
        );
        vm.stopPrank();

        reputationSystem.unpause();

        // Should work after unpause
        vm.startPrank(user1);
        mockToken.approve(address(reputationSystem), 1000 * 10**18);
        reputationSystem.depositStake(
            1000 * 10**18,
            30 days,
            ReputationSystem.StakeType.Report
        );
        vm.stopPrank();
    }

    function testEmergencyFunctions() public {
        // Update tier threshold
        reputationSystem.updateTierThreshold(ReputationSystem.ReputationTier.Silver, 100);
        
        // Update tier multiplier
        reputationSystem.updateTierMultiplier(ReputationSystem.ReputationTier.Silver, 150);
        
        // Update stake type multiplier
        reputationSystem.updateStakeTypeMultiplier(ReputationSystem.StakeType.Report, 200);
        
        // All should succeed without reverting
        assertTrue(true);
    }
}
