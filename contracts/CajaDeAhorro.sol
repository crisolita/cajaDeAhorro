// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;
import '@openzeppelin/contracts/access/AccessControl.sol';
import {Errors} from './utils/Errors.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import "hardhat/console.sol";

contract CajaDeAhorro is AccessControl {
    event SettedEmployees(uint date, address[] Employees);
    event RemovedEmployee(uint date, address Employee);
    event SettedEmployee(uint date, address Employee);
    event RemovedEmployees(uint date, address[] Employees);
    event SavingAdded(address indexed employee,uint amount,uint totalAmountOfIncentives, uint date);
    event IncentivesAdded(address[] Employees,uint amount, uint date);
    event SavingRetired(address indexed exEmployee,uint amount,uint date);
    event CreditGranted(address indexed Employee,Credit c,uint date);
    event CreditPaid(address indexed Employee,uint amount, Credit c,uint date);
    event WalletChanged(address lastWallet,address newWallet, uint date );
    uint incentivePercentage;
    uint interestPercentage;
    uint public maxCreditPercentage;
    uint totalAmountOfSavings;
    uint totalAmountOfIncentivesPaid;
    uint totalAmountOfIncentivesToPay;
    uint public maxAmountOfSaving;
    uint interestDecimals=100000000;

    address stableCoinAddress;
   mapping(address => Saving) Savings;
    mapping(address => uint) IncentivesToPay;
    mapping(address=>Credit) Credits;
    mapping(address => bool) employeesToPayStatus;
    struct Saving {
    bool isEmployed;
    uint balance;
    uint earned;
    uint lastTimeAddSaving;
    uint lastTimeActive;
    }
    struct Credit {
    uint amount;
    uint interest;
    uint lastTimeUpdate;
    }
    address[] EmployeesToPay;


    /**
 * @notice Initializes the contract with the given parameters for incentives, interest, credit limits, and stablecoin address.
 * Grants the deployer the default admin role.
 * @param _incentivePercentage The percentage used to calculate incentives for employees (max 100%).
 * @param _interestPercentage The annual interest rate percentage for credits (max 100%).
 * @param _maxCreditPercentage The maximum allowable credit as a percentage of savings (max 100%).
 * @param _stableCoinAddress The address of the stablecoin used for savings and credits.
 * @param _maxAmountOfSaving The maximum amount that can be saved in the contract.
 */
    constructor( uint _incentivePercentage,
    uint _interestPercentage,
    uint _maxCreditPercentage,address _stableCoinAddress,uint _maxAmountOfSaving) {
        require(_stableCoinAddress!=address(0),Errors.AddressZero());
        require(_incentivePercentage<=100,Errors.WrongPercentage());
        require(_interestPercentage<=100,Errors.WrongPercentage());
        require(_maxCreditPercentage<=100,Errors.WrongPercentage());

        _grantRole(DEFAULT_ADMIN_ROLE,msg.sender);
        stableCoinAddress=_stableCoinAddress;
        incentivePercentage=_incentivePercentage;
        interestPercentage=_interestPercentage;
        maxCreditPercentage=_maxCreditPercentage;
        maxAmountOfSaving=_maxAmountOfSaving;
    }
    ///Modifiers
     /// @notice Restricts access to admins only
    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE,msg.sender),Errors.NotAdmin());
        _;
    }

     /// @notice Restricts access to employees only
      modifier onlyEmployees() {
        require(Savings[msg.sender].isEmployed,Errors.NotEmployed());
        _;
    }

    /// @notice Updates credit interest based on the last update time
    modifier updateInterest() {
        Credits[msg.sender].interest+=Credits[msg.sender].amount*interestPercentage*(block.timestamp-Credits[msg.sender].lastTimeUpdate)/interestDecimals;
        Credits[msg.sender].lastTimeUpdate=block.timestamp;
        _;
    }
    /// admin functions

    /// @notice Sets a list of employees as active
    /// @param _Employees List of employee addresses to set
    function setEmployees(address[] memory _Employees) external onlyAdmin()  {
        for (uint256 i=0;i<_Employees.length;i++) {
            Savings[_Employees[i]].isEmployed=true;
        }
        emit SettedEmployees(block.timestamp,_Employees);
    }

    /// @notice Removes an employee from active status
    /// @param _Employee Address of the employee to remove
       function removeEmployee(address _Employee) external onlyAdmin()  {
            Savings[_Employee].isEmployed=false;
        
        emit RemovedEmployee(block.timestamp, _Employee);


    } 
     /// @notice Sets a single employee as active
    /// @param _Employee Address of the employee to set
      function setEmployee(address _Employee) external onlyAdmin()  {
            Savings[_Employee].isEmployed=true;
        
        emit SettedEmployee(block.timestamp,_Employee);
    }

    /// @notice Removes multiple employees from active status
    /// @param _Employees List of employee addresses to remove
       function removeEmployees(address[] memory _Employees) external onlyAdmin()  {
         for (uint256 i=0;i<_Employees.length;i++) {
            Savings[_Employees[i]].isEmployed=false;
        }
        emit RemovedEmployees(block.timestamp, _Employees);

    }

      /// @notice Sets the maximum percentage of credit allowed
    /// @param _maxPercentage New max credit percentage
    function setMaxCreditPercentage(uint _maxPercentage) public onlyAdmin() {
        require(_maxPercentage<=100,Errors.WrongPercentage());
        maxCreditPercentage=_maxPercentage;
    }

       /// @notice Sets the maximum amount allowed for savings
    /// @param _maxAmountSaving New maximum savings amo
     function setMaxAmountOfSaving(uint _maxAmountSaving) public onlyAdmin() {
        maxAmountOfSaving=_maxAmountSaving;
    }

     /// @notice Sets the address of the stablecoin used for transactions
    /// @param _stableaddress Address of the stablecoin contrac
    function setStableCoin(address _stableaddress) public onlyAdmin() {
        stableCoinAddress=_stableaddress;
    } 

     /// @notice Sets the incentive percentage applied to savings
    /// @param _incentivePercentage New incentive percentage
    function setIncentivePercentage(uint _incentivePercentage) public onlyAdmin() {
        require(_incentivePercentage<=100,Errors.WrongPercentage());

        incentivePercentage=_incentivePercentage;
    }

      /// @notice Sets the interest rate for credit
    /// @param _interestPercentage New interest percentage
     function setInterestPercentage(uint _interestPercentage) public onlyAdmin() {
        require(_interestPercentage<=100,Errors.WrongPercentage());
        interestPercentage=_interestPercentage;
    }

    /// @notice Set interest decimals
    /// @param _decimals newDecimals to interest value
    function setInterestDecimals(uint _decimals) external onlyAdmin() {
        interestDecimals=_decimals;
    }

    /// @notice Adds incentives for all employees in the EmployeesToPay list
    /// @param amount Total incentive amount to be distributed
    function addIncentives(uint amount) external onlyAdmin() {
    require(amount>=totalAmountOfIncentivesToPay,Errors.NotEnoughAmountOfIncentives());
    uint256 balanceInStableCoin=IERC20(stableCoinAddress).balanceOf(msg.sender);
    require(balanceInStableCoin>=amount,Errors.NotEnoughBalance());	
      require(
			ERC20(stableCoinAddress).transferFrom(
				msg.sender,
				address(this),
				amount
			),
			Errors.TransferFailed()
		);
    totalAmountOfIncentivesPaid+=totalAmountOfIncentivesToPay;
    emit IncentivesAdded(EmployeesToPay, totalAmountOfIncentivesToPay, block.timestamp);
    totalAmountOfIncentivesToPay=0;
    for(uint i=0;i<EmployeesToPay.length;i++) {
        Savings[EmployeesToPay[i]].earned+=IncentivesToPay[EmployeesToPay[i]];
        delete IncentivesToPay[EmployeesToPay[i]];
        delete employeesToPayStatus[EmployeesToPay[i]];
    }
    delete EmployeesToPay;
    }


    /// @notice Allows an admin to change a employee registered wallet
    /// @param _newWallet New wallet address to register
    /// @param _lastWallet New wallet address to register
    function changeEmployeeWallet(address _lastWallet, address _newWallet) external onlyAdmin() {
        require(block.timestamp-Savings[_lastWallet].lastTimeActive>= 365 days,Errors.WalletIsActiveYet());
        Savings[_newWallet]=Savings[_lastWallet];
        Credits[_newWallet]=Credits[_lastWallet];
        if(employeesToPayStatus[_lastWallet]) {
            IncentivesToPay[_newWallet]=IncentivesToPay[_lastWallet];
            employeesToPayStatus[_newWallet]=true;
            delete IncentivesToPay[_lastWallet];
            delete employeesToPayStatus[_lastWallet];
        }
        delete Savings[_lastWallet];
        delete Credits[_lastWallet];
        emit WalletChanged(_lastWallet,_newWallet,block.timestamp);

    }
       
    //   regular employess functions

    
    /// @notice Allows an employee to change their registered wallet
    /// @param _newWallet New wallet address to register
    function changeMyOwnWallet(address _newWallet) public onlyEmployees() {
        Savings[_newWallet]=Savings[msg.sender];
        Credits[_newWallet]=Credits[msg.sender];
        if(employeesToPayStatus[msg.sender]) {
            IncentivesToPay[_newWallet]=IncentivesToPay[msg.sender];
            employeesToPayStatus[_newWallet]=true;
            delete IncentivesToPay[msg.sender];
            delete employeesToPayStatus[msg.sender];
        }
        delete Savings[msg.sender];
        delete Credits[msg.sender];
        emit WalletChanged(msg.sender,_newWallet,block.timestamp);
    }

    /// @notice Allows an employee or an admin add savings to the contract
    /// @param amount Amount of stablecoin to save
    /// @param from The wallet to add the saving amount
    function addSavings(uint amount, address from) external  {
    require(Savings[from].isEmployed || hasRole(DEFAULT_ADMIN_ROLE,msg.sender),Errors.NotAdminOrNotEmployed());
    uint256 balanceInStableCoin=IERC20(stableCoinAddress).balanceOf(from);		
    require(balanceInStableCoin>=amount,Errors.NotEnoughBalance());
    require(maxAmountOfSaving>=Savings[from].balance+amount,Errors.ExceedAmountOfSaving());
    require(
			ERC20(stableCoinAddress).transferFrom(
				from,
				address(this),
				amount
			),
			Errors.TransferFailed()
		);
    totalAmountOfSavings+=amount;
    Savings[from].balance+=amount;
    Savings[from].lastTimeAddSaving=block.timestamp;
    Savings[from].lastTimeActive=block.timestamp;
    totalAmountOfIncentivesToPay+=amount*incentivePercentage/100;
    IncentivesToPay[from]+=amount*incentivePercentage/100;
    if (!employeesToPayStatus[from]) {
    EmployeesToPay.push(from);
    employeesToPayStatus[from] = true;
    }
    emit SavingAdded(from, amount,totalAmountOfIncentivesToPay, block.timestamp); 
    }

  
    /// @notice When an employee is fired they can withdraw their savings
    function withdrawSaving() updateInterest() public {
        require(!Savings[msg.sender].isEmployed,Errors.IsStillEmployed());
        require(Savings[msg.sender].balance>0,Errors.NotEnoughBalance());
        require(IncentivesToPay[msg.sender]==0,Errors.IncentivesAreNotPayYet());
        require((Savings[msg.sender].balance+Savings[msg.sender].earned)>=(Credits[msg.sender].amount+Credits[msg.sender].interest),Errors.CreditTooLarge());
         uint amount;
        if(Credits[msg.sender].amount>0) {
            amount=Savings[msg.sender].balance + Savings[msg.sender].earned-Credits[msg.sender].interest;
            require(
			ERC20(stableCoinAddress).transfer(
        msg.sender,
        amount
    ),
			Errors.TransferFailed()
		);
        delete Credits[msg.sender];
           
        } else {
            amount=Savings[msg.sender].balance + Savings[msg.sender].earned;
        require(
			ERC20(stableCoinAddress).transfer(
        msg.sender,
        amount
    ),
			Errors.TransferFailed()
		);
        }
        totalAmountOfSavings-=Savings[msg.sender].balance;
        emit SavingRetired(msg.sender,amount,block.timestamp);
        delete Savings[msg.sender];
    }

    /// @notice An employee can obtained a loan from the contract until a percentage
    /// @param _amount Amount of loan 
    function getCredit(uint _amount) public onlyEmployees() updateInterest() {
        require(_amount<=((Savings[msg.sender].balance+Savings[msg.sender].earned)*maxCreditPercentage/100-Credits[msg.sender].amount-Credits[msg.sender].interest),Errors.AmountExceedsAllow());
        require(
			ERC20(stableCoinAddress).transfer(
        msg.sender,
        _amount
        ),
			Errors.TransferFailed()
		);
        if (Credits[msg.sender].amount==0 && Credits[msg.sender].interest==0) {
            Credit memory c=Credit(_amount,0,block.timestamp);
            Credits[msg.sender]=c;
        } else {
            Credit memory c=Credit(Credits[msg.sender].amount+_amount,Credits[msg.sender].interest,block.timestamp);
            Credits[msg.sender]=c;
        }
            Savings[msg.sender].balance-=_amount;
            Savings[msg.sender].lastTimeActive=block.timestamp;
            totalAmountOfSavings-=_amount;
        emit CreditGranted(msg.sender, Credits[msg.sender],block.timestamp);
    }
    
    /// @notice Pay an amount to reduce the interest and the loan
    /// @param amount Amount of stablecoin to send to the contract to pay the credit
    function payCredit(uint amount) public onlyEmployees() updateInterest()  {
         require(
			ERC20(stableCoinAddress).transferFrom(
				msg.sender,
				address(this),
				amount
			),
			Errors.TransferFailed()
		); 
        if(amount>=(Credits[msg.sender].amount+Credits[msg.sender].interest)) {
           
            uint newAmount=amount-Credits[msg.sender].interest;
            Credits[msg.sender].interest=0;
            Credits[msg.sender].amount=0;
             totalAmountOfSavings+=newAmount;
            Savings[msg.sender].balance+=newAmount;
            Savings[msg.sender].lastTimeAddSaving=block.timestamp;
            console.log(newAmount);
        } else if(amount>=Credits[msg.sender].interest) {
            uint newAmount=amount-Credits[msg.sender].interest;
              totalAmountOfSavings+=newAmount;
            Savings[msg.sender].balance+=newAmount;
            Savings[msg.sender].lastTimeAddSaving=block.timestamp;
            Credits[msg.sender].amount-=newAmount;
            Credits[msg.sender].interest=0;
            
        } else if(amount<=Credits[msg.sender].interest) {
            console.log("Soy menor");
            Credits[msg.sender].interest-=amount;
            console.log(Credits[msg.sender].amount);
            console.log(Credits[msg.sender].interest);
        }
      
         Savings[msg.sender].lastTimeActive=block.timestamp;
        emit CreditPaid(msg.sender,amount, Credits[msg.sender],block.timestamp);
    }

    /// @notice Function to update the last time active of an employee to avoid loose their savings or wallet
    function keepActive() public onlyEmployees() {
        Savings[msg.sender].lastTimeActive=block.timestamp;
    }

 
    // view functions

    /// @notice Gets the total amount of incentives that have been paid out
    /// @return totalAmountOfIncentivesPaid The total amount of incentives paid
    function getTotalAmountOfIncentivesPaid() public view returns (uint) {
        return totalAmountOfIncentivesPaid;
    }

    /// @notice Gets the total amount of incentives that are still to be paid
    /// @return totalAmountOfIncentivesToPay The total amount of incentives to pay
     function getTotalAmountOfIncentivesToPay() public view returns (uint) {
        return totalAmountOfIncentivesToPay;
    }

    /// @notice Gets the balance of an employee's savings
    /// @param employee The address of the employee
    /// @return balance the savings balance of the specified employee
    function getBalance(address employee) public view returns (uint) {
        return Savings[employee].balance;
    }

    /// @notice Gets the total earned incentives of an employee
    /// @param employee The address of the employee
    /// @return earned The earned incentives of the specified employee
    function getEarnedIncentive(address employee) public view returns (uint) {
        return Savings[employee].earned;
    }

    /// @notice Gets the last time the employee was active in the system
    /// @param employee The address of the employee
    /// @return timestamp The timestamp of the employee's last active time
    function getLastTimeActive(address employee) public view returns(uint) {
        return Savings[employee].lastTimeActive;
    }

      /// @notice Gets the current balance of an employee's credit
    /// @param employee The address of the employee
    /// @return creditBalance The current credit balance of the specified employee
    function getCreditBalance(address employee) public view returns(uint) {
        return Credits[employee].amount;
    }

       /// @notice Gets the total balance of an employee's credit interest
    /// @param employee The address of the employee
    /// @return creditInterestBalance The total interest balance accrued on the employee's credit
     function getCreditInterestBalance(address employee) public view returns(uint) {
        return Credits[employee].interest+(Credits[employee].amount*interestPercentage*(block.timestamp-Credits[employee].lastTimeUpdate)/interestDecimals);
    }


    /// @notice Gets the last time the interest on an employee's credit was updated
    /// @param employee The address of the employee
    /// @return timestamp The timestamp of the last interest update on the employee's credit
    function getLastTimeUpdateInterestCredit(address employee) public view  returns(uint) {
        return Credits[employee].lastTimeUpdate;
    }

    /// @notice Calculates the remaining credit amount that an employee can still use
    /// @param employee The address of the employee
    /// @return leftoverCredit The available credit amount left for the specified employee
     function getLeftoverMaxCredit(address employee) public view  returns(uint) {
       
        return (Savings[employee].balance+Savings[employee].earned)*maxCreditPercentage/100-Credits[employee].amount-Credits[employee].interest;
    }


    /// @notice Checks if an address is currently an employee
    /// @param employee The address to check
    /// @return bool True if the address is an employee, false otherwise
    function isEmployee(address employee) public view returns(bool) {
        return Savings[employee].isEmployed;
    }

}