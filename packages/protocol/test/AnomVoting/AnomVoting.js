
const { abiEncoder, note, proof, secp256k1 } = require('aztec.js');


const DividendComputation = artifacts.require('./contracts/ACE/validators/dividendComputation/DividendComputationInterface');
const IERC20 = artifacts.require('openzeppelin-solidity/contracts/token/ERC20/IERC20.sol');


const DividendComputation_Address = require('../../build/contracts/DividendComputation.json').networks["1234"].address;
const ERC20_Address = require('../../build/contracts/ERC20Mintable.json').networks["1234"].address;


console.log('ERC20 Address', ERC20_Address);
console.log('Dividend Address', DividendComputation_Address);


contract('ZKERC20', async (accounts) => {

    let erc20, dividendProof, za, zb, dividendAccounts

    beforeEach(async () => {

        erc20 = await IERC20.at(ERC20_Address);

        /*k = [90, 4, 50]
        za = 100
        zb = 5

        Interest rate = 5%


            note A and B
        prove B is 5% of A
        A = k1 = 90
        B = k2 = 4

        k3 = k1*zb - k2*za

        k3 = 90*5 - 4*100


        50 = 90*5 - 4*100
        50 = 450 - 400
        50 = 50*/


        dividendAccounts = [...new Array(3)].map(() => secp256k1.generateAccount());

        let totalShares = 200
        let myShares = 20
        za = 100;
        zb = 10;
        let dif = totalShares * zb - myShares * za

        const noteValues = [totalShares, myShares, dif];


        notes = [
            ...dividendAccounts.map(({ publicKey }, i) => note.create(publicKey, noteValues[i])),
        ];
        // we will prove that account account account b (200) owns 5/100 (zb/za) of account a (200)
        // 50 is the difference between the two relationships (0 = 200*5 - 10*100)


        dividendProof = proof.dividendComputation.constructProof(notes, za, zb, accounts[1])

        console.log('Dividend proof constructed: ', dividendProof)
    })

    it('commit to vote', async () => {



    })
})
