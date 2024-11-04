// SPDX-License-Identifier: MIT

pragma solidity>= 0.8.23;

abstract contract Errors {
    error NotAdmin();
    error NotEmployed();
    error CreditTooLarge();
    error NotEnoughBalance();
    error TransferFailed();
    error ExceedAmountOfSaving();
    error NotEnoughAmountOfIncentives();
    error IsStillEmployed();
    error IncentivesAreNotPayYet();
    error AmountExceedsAllow();
    error AddressZero();
    error WrongPercentage();
    error NotAdminOrNotEmployed();
    error WalletIsActiveYet();
}
