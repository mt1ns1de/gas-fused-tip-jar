// contracts/test/TipJarFactory.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {TipJarFactory} from "../src/TipJarFactory.sol";
import {TipJar} from "../src/TipJar.sol";

contract TipJarFactoryTest is Test {
    TipJarFactory internal factory;

    function setUp() public {
        factory = new TipJarFactory();
    }

    function testCreateJarSetsOwnerAndCap() public {
        uint256 cap = 2 gwei;

        address jarAddr = factory.createJar(cap);
        assertTrue(jarAddr != address(0));

        TipJar jar = TipJar(payable(jarAddr));

        assertEq(jar.owner(), address(this));
        assertEq(jar.maxGasPriceWei(), cap);
    }
}
