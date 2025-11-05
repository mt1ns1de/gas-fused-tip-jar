// contracts/src/TipJar.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TipJar {
    address public owner;
    uint256 public maxGasPriceWei;

    event Tipped(address indexed from, uint256 amount, string message);

    constructor(address _owner, uint256 _maxGasPriceWei) {
        owner = _owner;
        maxGasPriceWei = _maxGasPriceWei;
    }

    receive() external payable {
        require(tx.gasprice <= maxGasPriceWei, "Gas price too high");
        emit Tipped(msg.sender, msg.value, "");
    }

    function tip(string calldata message) external payable {
        require(tx.gasprice <= maxGasPriceWei, "Gas price too high");
        emit Tipped(msg.sender, msg.value, message);
    }

    function withdraw() external {
        require(msg.sender == owner, "Not owner");
        payable(owner).transfer(address(this).balance);
    }
}
