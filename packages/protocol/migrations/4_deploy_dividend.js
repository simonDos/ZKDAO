/* global artifacts */
const ACE = artifacts.require('./ACE.sol');
const Dividend = artifacts.require('./DividendComputation.sol');
const DividendComputationInterface = artifacts.require('./DividendComputationInterface.sol');

Dividend.abi = DividendComputationInterface.abi;

module.exports = (deployer) => {
    return deployer.deploy(Dividend).then(async ({ address: dividendAddress }) => {
        const proofId = 2;
        const isBalanced = false;
        const ace = await ACE.at(ACE.address);
        await ace.setProof(proofId, dividendAddress, isBalanced);
    });
};
