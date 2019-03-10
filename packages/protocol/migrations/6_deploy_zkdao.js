/* global artifacts */
const {constants: {DAI_ADDRESS, ERC20_SCALING_FACTOR}} = require('@aztec/dev-utils');
const {isUndefined} = require('lodash');

const ACE = artifacts.require('./ACE.sol');
const ERC20Mintable = artifacts.require('./ERC20Mintable.sol');
const ZKDAO = artifacts.require('./ZKDAO.sol');
const ZKERC20 = artifacts.require('./ZKERC20.sol');

module.exports = (deployer, network) => {
    if (isUndefined(ACE) || isUndefined(ACE.address)) {
        console.log('Please deploy the ACE contract first');
        process.exit(1);
    }

    /* eslint-disable no-new */
    new Promise(() => {
        return deployer.deploy(
            ZKDAO,
            ACE.address,
            ACE.address, // TODO
            ZKERC20.address,
            200
        );
    })
};
