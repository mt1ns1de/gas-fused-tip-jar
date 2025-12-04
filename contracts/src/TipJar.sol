// contracts/src/TipJar.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TipJar {
    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    address public owner;
    uint256 public maxGasPriceWei;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event Tipped(address indexed from, uint256 amount, string message);
    event Withdrawn(address indexed to, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error NotOwner();
    error GasPriceTooHigh();
    error NoTips();
    error WithdrawFailed();

    /*//////////////////////////////////////////////////////////////
                               CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _owner, uint256 _maxGasPriceWei) {
        owner = _owner;
        maxGasPriceWei = _maxGasPriceWei;
    }

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier withinGasCap() {
        // чек газа нужен только для входящих tip'ов
        if (tx.gasprice > maxGasPriceWei) revert GasPriceTooHigh();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               TIPPING
    //////////////////////////////////////////////////////////////*/

    receive() external payable withinGasCap {
        // пустое сообщение, но всё равно логируем
        emit Tipped(msg.sender, msg.value, "");
    }

    function tip(string calldata message) external payable withinGasCap {
        emit Tipped(msg.sender, msg.value, message);
    }

    /*//////////////////////////////////////////////////////////////
                               WITHDRAW
    //////////////////////////////////////////////////////////////*/

    /// @notice Выводит весь баланс банки на адрес владельца.
    /// @dev Здесь НЕТ проверки gas price — owner всегда может забрать средства.
    function withdraw() external onlyOwner {
        uint256 amount = address(this).balance;
        if (amount == 0) revert NoTips();

        (bool ok, ) = payable(owner).call{value: amount}("");
        if (!ok) revert WithdrawFailed();

        emit Withdrawn(owner, amount);
    }
}
