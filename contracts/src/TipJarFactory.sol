// contracts/src/TipJarFactory.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TipJar.sol";

contract TipJarFactory {
    event JarCreated(address indexed owner, address jar);

    function createJar(uint256 _maxGasPriceWei) external returns (address jar) {
        jar = address(new TipJar(msg.sender, _maxGasPriceWei));
        emit JarCreated(msg.sender, jar);
    }
}
