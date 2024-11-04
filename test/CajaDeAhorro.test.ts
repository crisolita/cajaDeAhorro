import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";


describe("CajaDeAhorro", function () {
  let cajaDeAhorro: Contract;

  let admin: SignerWithAddress;
  let nonAdmin: SignerWithAddress;
  let employee:SignerWithAddress;
  let employee2:SignerWithAddress;
  let employee3:SignerWithAddress;
  let employee4:SignerWithAddress;
  let employee5:SignerWithAddress;
  let employee6:SignerWithAddress;
  let employee7:SignerWithAddress;
  let employee8:SignerWithAddress;
  let employee9:SignerWithAddress;
  let newWallet:SignerWithAddress;







  let fakeUsdt:Contract;
  
  const incentivePercentage = 20;
  const interestPercentage = 5;
  const maxCreditPercentage = 60;
  const maxAmount = ethers.utils.parseEther("1000");
  before(async function () {
    [admin,nonAdmin,employee,employee2,employee3,employee4,employee5,employee6,employee7,employee8,employee9,newWallet]  = await ethers.getSigners();


     const CajaDeAhorro = await ethers.getContractFactory("CajaDeAhorro");
    const FakeUSDT= await ethers.getContractFactory("FakeUSDT");
    fakeUsdt= await FakeUSDT.deploy(ethers.utils.parseEther("1000"),18);
    cajaDeAhorro = await CajaDeAhorro.connect(admin).deploy(
      incentivePercentage,
      interestPercentage,
      maxCreditPercentage,
      fakeUsdt.address,
      maxAmount
    );

    await cajaDeAhorro.connect(admin).deployed();
  });

  it("Debería desplegar el contrato correctamente", async function () {
    expect(cajaDeAhorro.address).to.properAddress;
  });
  it("should fail if _stableCoinAddress is address(0) in the constructor", async function () {
    const CajaDeAhorro = await ethers.getContractFactory("CajaDeAhorro");

    const maxAmount = ethers.utils.parseEther("1000");
    await expect(
        CajaDeAhorro.deploy(incentivePercentage, interestPercentage, maxCreditPercentage, ethers.constants.AddressZero, maxAmount)
    ).to.be.revertedWith("AddressZero");
});

it("should fail if _incentivePercentage is greater than 100 in the constructor", async function () {
  const CajaDeAhorro = await ethers.getContractFactory("CajaDeAhorro");

  const usdtAddress = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; 
    await expect(
        CajaDeAhorro.deploy(101, interestPercentage, maxCreditPercentage, usdtAddress, maxAmount)
    ).to.be.revertedWith("WrongPercentage");
});

it("should fail if _interestPercentage is greater than 100 in the constructor", async function () {
  const CajaDeAhorro = await ethers.getContractFactory("CajaDeAhorro");

  const usdtAddress = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; 
    await expect(
        CajaDeAhorro.deploy(incentivePercentage, 101, maxCreditPercentage, usdtAddress, maxAmount)
    ).to.be.revertedWith("WrongPercentage");
});

it("should fail if _maxCreditPercentage is greater than 100 in the constructor", async function () {
  const CajaDeAhorro = await ethers.getContractFactory("CajaDeAhorro");

  const usdtAddress = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; 
    await expect(
        CajaDeAhorro.deploy(incentivePercentage, interestPercentage, 101, usdtAddress, maxAmount)
    ).to.be.revertedWith("WrongPercentage");
});

it("should allow only admin to set employees", async function () {
  
    const employees = [employee.address];
    await cajaDeAhorro.connect(admin).setEmployees(employees);
    const isEmployed = await cajaDeAhorro.getBalance(employee.address);
    expect(isEmployed).to.equal(0); 

    await expect(cajaDeAhorro.connect(nonAdmin).setEmployees(employees)).to.be.revertedWith("NotAdmin");
});

it("should allow only admin to remove employees", async function () {
    const employees = [employee.address];
    await cajaDeAhorro.connect(admin).setEmployees(employees);

    await cajaDeAhorro.connect(admin).removeEmployees(employees);
    const isEmployed = await cajaDeAhorro.getBalance(employee.address);
    expect(isEmployed).to.equal(0); 

    await expect(cajaDeAhorro.connect(nonAdmin).removeEmployees(employees)).to.be.revertedWith("NotAdmin");
});

it("should fail if non-admin tries to call setMaxCreditPercentage", async function () {
    await expect(cajaDeAhorro.connect(nonAdmin).setMaxCreditPercentage(50)).to.be.revertedWith("NotAdmin");
});

it("should set max credit percentage if called by admin", async function () {
    await cajaDeAhorro.connect(admin).setMaxCreditPercentage(50);
    const maxCreditPercentage = await cajaDeAhorro.maxCreditPercentage();
    expect(maxCreditPercentage).to.equal(50);
});

it("should fail if setMaxCreditPercentage is greater than 100", async function () {
    await expect(cajaDeAhorro.connect(admin).setMaxCreditPercentage(101)).to.be.revertedWith("WrongPercentage");
});

it("should allow only admin to call setMaxAmountOfSaving", async function () {
    await cajaDeAhorro.connect(admin).setMaxAmountOfSaving(ethers.utils.parseEther("1000"));
    const newMaxAmount = await cajaDeAhorro.maxAmountOfSaving();
    expect(newMaxAmount).to.equal(ethers.utils.parseEther("1000"));

    await expect(cajaDeAhorro.connect(nonAdmin).setMaxAmountOfSaving(ethers.utils.parseEther("1000"))).to.be.revertedWith("NotAdmin");
});
it("should allow an employee to save an amount up to maxAmountOfSaving", async function () {
  await cajaDeAhorro.connect(admin).setEmployees([employee.address]);
  
  const depositAmount = ethers.utils.parseEther("500");
  await fakeUsdt.connect(admin).mint(employee.address,depositAmount)
  await fakeUsdt.connect(employee).approve(cajaDeAhorro.address, depositAmount);

  await cajaDeAhorro.connect(employee).addSavings(depositAmount,employee.address);
  const balance = await cajaDeAhorro.getBalance(employee.address);

  expect(balance).to.equal(depositAmount);
});

it("should fail if employee tries to save more than maxAmountOfSaving", async function () {
  await cajaDeAhorro.connect(admin).setEmployees([employee.address]);
  
  const depositAmount = ethers.utils.parseEther("2000"); // Exceeds maxAmountOfSaving
  await fakeUsdt.connect(admin).mint(employee.address,depositAmount)
  await fakeUsdt.connect(employee).approve(cajaDeAhorro.address, depositAmount);

  await expect(cajaDeAhorro.connect(employee).addSavings(depositAmount,employee.address)).to.be.revertedWith('ExceedAmountOfSaving()');
});



it("should distribute incentive correctly upon saving", async function () {
  await cajaDeAhorro.connect(admin).setEmployees([employee2.address,employee3.address]);

  const depositAmount = ethers.utils.parseEther("500");
  const depositAmount2 = ethers.utils.parseEther("1000");

  await fakeUsdt.connect(admin).mint(employee2.address,depositAmount)

  const expectedIncentive = depositAmount.mul(incentivePercentage).div(100);

  await fakeUsdt.connect(employee2).approve(cajaDeAhorro.address, depositAmount);
  await fakeUsdt.connect(employee3).approve(cajaDeAhorro.address, depositAmount2);

  await cajaDeAhorro.connect(admin).addSavings(depositAmount,employee2.address);

  await fakeUsdt.connect(admin).mint(employee3.address,depositAmount2)

  const expectedIncentive2 = depositAmount2.mul(incentivePercentage).div(100);
  console.log(ethers.utils.formatEther(expectedIncentive),"primer expected incentive")
  console.log(ethers.utils.formatEther(expectedIncentive2),"segundo expected incentive")
  await fakeUsdt.connect(employee3).approve(cajaDeAhorro.address, depositAmount2);
  await cajaDeAhorro.connect(employee3).addSavings(depositAmount2,employee3.address);
  await fakeUsdt.connect(admin).approve(cajaDeAhorro.address, ethers.utils.parseEther("400"));

  await expect(cajaDeAhorro.connect(admin).addIncentives(ethers.utils.parseEther("200"))).to.be.revertedWith('NotEnoughAmountOfIncentives()');
  await cajaDeAhorro.addIncentives(ethers.utils.parseEther("400")); 
  const incentiveBalance = await cajaDeAhorro.getEarnedIncentive(employee2.address);
  const incentiveBalance2 = await cajaDeAhorro.getEarnedIncentive(employee3.address);
  console.log(ethers.utils.formatEther(incentiveBalance),"primer incentive")
  console.log(ethers.utils.formatEther(incentiveBalance2),"segundo incentive")

  expect(incentiveBalance).to.equal(expectedIncentive);
  expect(incentiveBalance2).to.equal(expectedIncentive2);

});

it("should fail if an employee without sufficient balance tries to save", async function () {
  await cajaDeAhorro.connect(admin).setEmployees([employee.address]);

  const depositAmount = ethers.utils.parseEther("5000"); // Exceeds employee's balance

  await fakeUsdt.connect(employee).approve(cajaDeAhorro.address, depositAmount);

  await expect(cajaDeAhorro.connect(admin).addSavings(depositAmount,employee.address)).to.be.revertedWith("NotEnoughBalance()");
});

it("should calculate interest correctly after a certain period", async function () {
  await cajaDeAhorro.connect(admin).setEmployees([employee4.address]);

  const depositAmount = ethers.utils.parseEther("500");
  await fakeUsdt.connect(admin).mint(employee4.address,depositAmount)


  await fakeUsdt.connect(employee4).approve(cajaDeAhorro.address, depositAmount);
  await cajaDeAhorro.connect(employee4).addSavings(depositAmount,employee4.address);

  await cajaDeAhorro.connect(employee4).getCredit(ethers.utils.parseEther("200"));
  const expectedInterest = ethers.utils.parseEther("200").mul(interestPercentage).mul(86400 * 30).div(100000000);
  
  await ethers.provider.send("evm_increaseTime", [86400 * 30]); // 30 days
  await ethers.provider.send("evm_mine",[]);

  const interestBalance = await cajaDeAhorro.getCreditInterestBalance(employee4.address);
  expect(interestBalance).to.equal(expectedInterest);
});




it("should revert if non-employee or admin tries to save", async function () {
  const depositAmount = ethers.utils.parseEther("500");
  await fakeUsdt.connect(admin).mint(nonAdmin.address, depositAmount);
  await fakeUsdt.connect(nonAdmin).approve(cajaDeAhorro.address, depositAmount);

  await expect(cajaDeAhorro.connect(nonAdmin).addSavings(depositAmount,nonAdmin.address)).to.be.revertedWith('NotAdminOrNotEmployed()');
});

it("should calculate the leftover credit amount correctly based on maxCreditPercentage", async function () {
  await cajaDeAhorro.connect(admin).setEmployees([employee5.address]);

  const depositAmount = ethers.utils.parseEther("500");
  await fakeUsdt.connect(admin).mint(employee5.address,depositAmount)
  await fakeUsdt.connect(employee5).approve(cajaDeAhorro.address, depositAmount);
  await cajaDeAhorro.connect(employee5).addSavings(depositAmount,employee5.address);
  const maxCreditPercentage=50;
  const maxCredit = await cajaDeAhorro.getLeftoverMaxCredit(employee5.address);
  const expectedMaxCredit = depositAmount.mul(maxCreditPercentage).div(100);
    
  expect(maxCredit).to.equal(expectedMaxCredit);
});

it("should allow admin to add multiple employees at once", async function () {
  await cajaDeAhorro.connect(admin).setEmployees([employee.address, employee2.address]);

  const isEmployee1 = await cajaDeAhorro.isEmployee(employee.address);
  const isEmployee2 = await cajaDeAhorro.isEmployee(employee2.address);

  expect(isEmployee1).to.be.true;
  expect(isEmployee2).to.be.true;
});


it("should revert if non-employee tries to getCredit incentive", async function () {
  const depositAmount = ethers.utils.parseEther("500");
  await expect(cajaDeAhorro.connect(admin).getCredit(5000)).to.be.revertedWith("NotEmployed()");
});

it("should accumulate incentives correctly across multiple savings", async function () {
  await cajaDeAhorro.connect(admin).setEmployees([employee6.address]);

  const firstDeposit = ethers.utils.parseEther("300");
  const secondDeposit = ethers.utils.parseEther("200");
  await fakeUsdt.connect(admin).mint(employee6.address, ethers.utils.parseEther("500"))
  await fakeUsdt.connect(employee6).approve(cajaDeAhorro.address, firstDeposit);
  await cajaDeAhorro.connect(employee6).addSavings(firstDeposit,employee6.address);

  await fakeUsdt.connect(employee6).approve(cajaDeAhorro.address, secondDeposit);
  await cajaDeAhorro.connect(employee6).addSavings(secondDeposit,employee6.address);

  const totalIncentive = firstDeposit.add(secondDeposit).mul(incentivePercentage).div(100);
  let totalNeededIncentives= await cajaDeAhorro.getTotalAmountOfIncentivesToPay();
  console.log(totalNeededIncentives)
  await fakeUsdt.connect(admin).approve(cajaDeAhorro.address, totalNeededIncentives);
  await cajaDeAhorro.connect(admin).addIncentives(totalNeededIncentives)
  const incentiveBalance = await cajaDeAhorro.getEarnedIncentive(employee6.address);
  totalNeededIncentives= await cajaDeAhorro.getTotalAmountOfIncentivesToPay();
  expect(incentiveBalance).to.equal(totalIncentive);
  expect(totalNeededIncentives).to.equal(0);

});

it("should revert if non-admin tries to set employee status", async function () {
  await expect(cajaDeAhorro.connect(nonAdmin).setEmployees([employee.address])).to.be.revertedWith("NotAdmin");
});

it("should allow admin to remove an employee", async function () {
  await cajaDeAhorro.connect(admin).setEmployee(employee.address);

  await cajaDeAhorro.connect(admin).removeEmployee(employee.address);

  const isEmployee = await cajaDeAhorro.isEmployee(employee.address);
  expect(isEmployee).to.be.false;
});

it("should allow only admin to update maxAmountOfSaving", async function () {
  const newMaxAmount = ethers.utils.parseEther("2000");

  await cajaDeAhorro.connect(admin).setMaxAmountOfSaving(newMaxAmount);
  const updatedMaxAmount = await cajaDeAhorro.maxAmountOfSaving();

  expect(updatedMaxAmount).to.equal(newMaxAmount);
});
it("Withdraw with pending credit", async function () {
  await cajaDeAhorro.connect(admin).setEmployee(employee7.address);

  await fakeUsdt.connect(admin).mint(employee7.address,ethers.utils.parseEther("500"))
  await fakeUsdt.connect(employee7).approve(cajaDeAhorro.address, ethers.utils.parseEther("50"));
  await cajaDeAhorro.connect(employee7).addSavings(ethers.utils.parseEther("50"),employee7.address);

  await cajaDeAhorro.connect(employee7).getCredit(ethers.utils.parseEther("25"));
  await fakeUsdt.connect(admin).approve(cajaDeAhorro.address,await cajaDeAhorro.getTotalAmountOfIncentivesToPay())
  await cajaDeAhorro.connect(admin).addIncentives(await cajaDeAhorro.getTotalAmountOfIncentivesToPay());
  // Dismiss the employee to allow withdrawal
  await cajaDeAhorro.connect(admin).removeEmployee(employee7.address);
  const interest=await cajaDeAhorro.getCreditInterestBalance(employee7.address)
  const totalWithdraw=ethers.utils.parseEther("25").add(ethers.utils.parseEther("10").sub(interest))
  await expect(cajaDeAhorro.connect(employee7).withdrawSaving())
      .to.emit(cajaDeAhorro, "SavingRetired")
      .withArgs(employee7.address,"34999995000000000000","1732804585" ); 
  expect(await cajaDeAhorro.getBalance(employee7.address)).to.equal(0);
});

it("Failed withdrawal when still employed", async function () {
  await fakeUsdt.connect(admin).mint(employee6.address,ethers.utils.parseEther("50"))
  await fakeUsdt.connect(employee6).approve(cajaDeAhorro.address, ethers.utils.parseEther("50"));
  await cajaDeAhorro.connect(employee6).addSavings(ethers.utils.parseEther("50"),employee6.address);

  await expect(cajaDeAhorro.connect(employee6).withdrawSaving())
      .to.be.revertedWith("IsStillEmployed()");
});

it("Failed withdrawal due to unpaid incentives", async function () {
  await cajaDeAhorro.connect(admin).setEmployee(employee8.address);

  await fakeUsdt.connect(admin).mint(employee8.address,ethers.utils.parseEther("50"))
  await fakeUsdt.connect(employee8).approve(cajaDeAhorro.address, ethers.utils.parseEther("50"));
  await cajaDeAhorro.connect(employee8).addSavings(ethers.utils.parseEther("50"),employee8.address);
  await cajaDeAhorro.connect(admin).removeEmployees([employee8.address]);

  await expect(cajaDeAhorro.connect(employee8).withdrawSaving())
      .to.be.revertedWith("IncentivesAreNotPayYet");
});

it("Failed withdrawal when balance is less than credit + interest", async function () {
  await cajaDeAhorro.connect(admin).setEmployees([employee9.address]);
  await fakeUsdt.mint(employee9.address,ethers.utils.parseEther("50"))
  await fakeUsdt.connect(employee9).approve(cajaDeAhorro.address, ethers.utils.parseEther("50"));
  await cajaDeAhorro.connect(employee9).addSavings(ethers.utils.parseEther("50"),employee9.address);
  await cajaDeAhorro.connect(employee9).getCredit(ethers.utils.parseEther("25"));
  await cajaDeAhorro.connect(admin).removeEmployees([employee9.address]);
  await fakeUsdt.connect(admin).approve(cajaDeAhorro.address, ethers.utils.parseEther("50"));

  await cajaDeAhorro.connect(admin).addIncentives(ethers.utils.parseEther("50"))
  await ethers.provider.send("evm_increaseTime", [86400 * 300000]); 
  await ethers.provider.send("evm_mine",[]);

  await expect(cajaDeAhorro.connect(employee9).withdrawSaving())
      .to.be.revertedWith("CreditTooLarge");
});
it("Should pay off the exact credit and interest without excess", async function () {
  const balance=await cajaDeAhorro.getBalance(employee6.address)
  const isempl=await cajaDeAhorro.isEmployee(employee6.address)
  const tx= await cajaDeAhorro.connect(employee6).getCredit(ethers.utils.parseEther("20"))
  await ethers.provider.send("evm_increaseTime", [86400 * 30]); 
  await ethers.provider.send("evm_mine",[]);
  const interes= await cajaDeAhorro.getCreditInterestBalance(employee6.address);
  console.log(ethers.utils.formatEther(interes),"interes")
  const creditBalanceBefore= await cajaDeAhorro.getCreditBalance(employee6.address)
  expect(creditBalanceBefore).to.equal(ethers.utils.parseEther("20"));
  expect(Number(interes.add(creditBalanceBefore))).to.be.greaterThan(Number(interes))
  await fakeUsdt.mint(employee6.address,interes.add("3000000000000"))
  await fakeUsdt.connect(employee6).approve(cajaDeAhorro.address,interes.add(creditBalanceBefore).add("3000000000000"))
  await cajaDeAhorro.connect(employee6).payCredit(interes.add(creditBalanceBefore).add("3000000000000"));
  const creditBalance = await cajaDeAhorro.getCreditBalance(employee6.address);
  const interesAfter=await cajaDeAhorro.getCreditInterestBalance(employee6.address)
  const savingsBalance = await cajaDeAhorro.getBalance(employee6.address);
  expect(interesAfter).to.equal(0)
  expect(creditBalance).to.equal(0);
  expect(savingsBalance).to.equal(ethers.utils.parseEther("550"));
});
it("Should only reduce interest with payment less than interest", async function () {
  const tx= await cajaDeAhorro.connect(employee6).getCredit(ethers.utils.parseEther("25"))
  await ethers.provider.send("evm_increaseTime", [86400 * 30]); 
  await ethers.provider.send("evm_mine",[]);
  const interes= await cajaDeAhorro.getCreditInterestBalance(employee6.address);
  console.log(ethers.utils.formatEther(interes),"interes")
  const creditBalanceBefore= await cajaDeAhorro.getCreditBalance(employee6.address)
  expect(creditBalanceBefore).to.equal(ethers.utils.parseEther("25"));
  await fakeUsdt.mint(employee6.address,interes.add("3000000000000"))
  await fakeUsdt.connect(employee6).approve(cajaDeAhorro.address,interes.add(creditBalanceBefore).add("3000000000000"))
  console.log("interes",ethers.utils.formatEther(interes))
  await cajaDeAhorro.connect(employee6).payCredit(ethers.utils.parseEther("3"));
  const interestBalance = await cajaDeAhorro.getCreditInterestBalance(employee6.address);
   console.log("interes despues",interestBalance)
   expect(interestBalance).to.be.above(0);
   expect(interestBalance).to.be.lt(interes);
});
it("Should reduce credit amount with underpayment, leaving balance", async function () {
  const tx= await cajaDeAhorro.connect(employee6).getCredit(ethers.utils.parseEther("20"))
  await ethers.provider.send("evm_increaseTime", [86400 * 30]); 
  await ethers.provider.send("evm_mine",[]);
  const interes= await cajaDeAhorro.getCreditInterestBalance(employee6.address);
  console.log(ethers.utils.formatEther(interes),"interes")
  const savingBalanceBefore= await cajaDeAhorro.getBalance(employee6.address)
  const creditBalanceBefore= await cajaDeAhorro.getCreditBalance(employee6.address)
  expect(creditBalanceBefore).to.equal(ethers.utils.parseEther("45"));
  await fakeUsdt.mint(employee6.address,interes.add("3000000000000"))
  await fakeUsdt.connect(employee6).approve(cajaDeAhorro.address,interes.add(creditBalanceBefore).add("3000000000000"))
  await cajaDeAhorro.connect(employee6).payCredit(ethers.utils.parseEther("15"));
  const creditBalance = await cajaDeAhorro.getCreditBalance(employee6.address);
  const savingBalance=await cajaDeAhorro.getBalance(employee6.address)
  expect(Number(savingBalance)).to.be.greaterThan(Number(savingBalanceBefore))
  expect(creditBalance).to.be.above(0);
});
it("should allow employee to change their wallet", async function () {
  const oldSaving=await cajaDeAhorro.getBalance(employee6.address);
  const oldCredit=await cajaDeAhorro.getCreditBalance(employee6.address)
  // Change wallet to newWallet by employee
  await cajaDeAhorro.connect(employee6).changeMyOwnWallet(newWallet.address);

  const newCredit = await cajaDeAhorro.getCreditBalance(newWallet.address);
  expect(newCredit).to.equal(oldCredit);

  const newEmployeeStatus = await cajaDeAhorro.isEmployee(newWallet.address);
  expect(newEmployeeStatus).to.be.true;

 const newSaving= await cajaDeAhorro.getBalance(newWallet.address);
 expect(newSaving).to.equal(oldSaving)

  const oldEmployeeStatus = await cajaDeAhorro.isEmployee(employee6.address);
  expect(oldEmployeeStatus).to.be.false;
  const incentives = await cajaDeAhorro.getEarnedIncentive(newWallet.address);
  expect(incentives).to.be.gt(0);

  // Verify old wallet incentives are cleared
  const oldIncentives = await cajaDeAhorro.getEarnedIncentive(employee6.address);
  expect(oldIncentives).to.equal(0);
});
it("should allow admin to change an employee’s wallet", async function () {
  // Employee requests credit to create initial credit data
  await cajaDeAhorro.connect(newWallet).getCredit(ethers.utils.parseEther("100"));

  // Admin changes employee's wallet to newWallet
  await expect(cajaDeAhorro.connect(admin).changeEmployeeWallet(newWallet.address, employee6.address)).to.be.revertedWith('WalletIsActiveYet()')
  await ethers.provider.send("evm_increaseTime", [86400 * 366]); 
  await ethers.provider.send("evm_mine",[]);
  let oldCredit = await cajaDeAhorro.getCreditBalance(newWallet.address);
  await cajaDeAhorro.connect(admin).changeEmployeeWallet(newWallet.address, employee6.address);

  // Verify new wallet has correct data transferred
  const newCredit = await cajaDeAhorro.getCreditBalance(employee6.address);
  expect(newCredit).to.equal(oldCredit);

  const newEmployeeStatus = await cajaDeAhorro.isEmployee(employee6.address);
  expect(newEmployeeStatus).to.be.true;

  // Verify old wallet data is deleted
   oldCredit = await cajaDeAhorro.getCreditBalance(newWallet.address);

  expect(oldCredit).to.equal(0);

  const oldEmployeeStatus = await cajaDeAhorro.isEmployee(newWallet.address);
  expect(oldEmployeeStatus).to.be.false;
});

  
});
