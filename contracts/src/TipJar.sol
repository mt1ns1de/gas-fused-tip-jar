// contracts/src/TipJar.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Gas-capped tip jar
/// @notice Accepts tips only when tx.gasprice is below or equal to a configured cap.
/// @dev The owner can always withdraw the full balance regardless of gas price.
contract TipJar {
    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Address that controls the jar and can withdraw funds.
    address public owner;

    /// @notice Maximum gas price (in wei) at which incoming tips are accepted.
    uint256 public maxGasPriceWei;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted whenever a tip is received.
    event Tipped(address indexed from, uint256 amount, string message);

    /// @notice Emitted when the owner withdraws funds from the jar.
    event Withdrawn(address indexed to, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @notice Thrown when a non-owner calls an owner-only function.
    error NotOwner();

    /// @notice Thrown when the gas price of a tx exceeds maxGasPriceWei for a tip.
    error GasPriceTooHigh();

    /// @notice Thrown when withdraw is called but there is no balance to withdraw.
    error NoTips();

    /// @notice Thrown when the low-level call in withdraw fails.
    error WithdrawFailed();

    /*//////////////////////////////////////////////////////////////
                               CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @param _owner Address of the jar owner.
    /// @param _maxGasPriceWei Gas price cap (in wei) for incoming tips.
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
        // Gas price checks are applied only for incoming tips.
        if (tx.gasprice > maxGasPriceWei) revert GasPriceTooHigh();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               TIPPING
    //////////////////////////////////////////////////////////////*/

    /// @notice Receive plain ETH tips with no message.
    receive() external payable withinGasCap {
        emit Tipped(msg.sender, msg.value, "");
    }

    /// @notice Receive a tip with an attached message.
    /// @param message Free-form string message from the tipper.
    function tip(string calldata message) external payable withinGasCap {
        emit Tipped(msg.sender, msg.value, message);
    }

    /*//////////////////////////////////////////////////////////////
                               WITHDRAW
    //////////////////////////////////////////////////////////////*/

    /// @notice Withdraws the entire jar balance to the owner address.
    /// @dev There is no gas price check on withdraw; the owner should always be able to recover funds.
    function withdraw() external onlyOwner {
        uint256 amount = address(this).balance;
        if (amount == 0) revert NoTips();

        (bool ok, ) = payable(owner).call{value: amount}("");
        if (!ok) revert WithdrawFailed();

        emit Withdrawn(owner, amount);
    }
}
