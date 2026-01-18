// contracts/test/TipJar.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {TipJar} from "../src/TipJar.sol";

contract TipJarTest is Test {
    TipJar internal jar;
    address internal owner = address(0xABCD);
    address internal tipper = address(0xBEEF);

    function setUp() public {
        jar = new TipJar(owner, 1 gwei);
        vm.deal(tipper, 1 ether);
    }

    function testReceiveTipWithinCap() public {
        vm.txGasPrice(1 gwei);
        vm.prank(tipper);
        (bool ok, ) = address(jar).call{value: 0.1 ether}("");
        assertTrue(ok);
        assertEq(address(jar).balance, 0.1 ether);
    }

    function testReceiveTipAboveCapReverts() public {
        vm.txGasPrice(2 gwei);
        vm.prank(tipper);
        vm.expectRevert(TipJar.GasPriceTooHigh.selector);
        address(jar).call{value: 0.1 ether}("");
    }

    function testTipWithMessage() public {
        vm.txGasPrice(1 gwei);
        vm.prank(tipper);
        jar.tip{value: 0.2 ether}("hello");
        assertEq(address(jar).balance, 0.2 ether);
    }

    function testWithdrawByOwner() public {
        vm.txGasPrice(1 gwei);
        vm.prank(tipper);
        jar.tip{value: 0.3 ether}("yo");

        uint256 ownerStart = owner.balance;

        vm.prank(owner);
        jar.withdraw();

        assertEq(address(jar).balance, 0);
        assertEq(owner.balance, ownerStart + 0.3 ether);
    }

    function testWithdrawNonOwnerReverts() public {
        vm.txGasPrice(1 gwei);
        vm.prank(tipper);
        jar.tip{value: 0.3 ether}("yo");

        vm.prank(tipper);
        vm.expectRevert(TipJar.NotOwner.selector);
        jar.withdraw();
    }

    function testWithdrawNoTipsReverts() public {
        vm.prank(owner);
        vm.expectRevert(TipJar.NoTips.selector);
        jar.withdraw();
    }
}
