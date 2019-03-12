const BN = require('bn.js');

const {
    proof,
    abiEncoder,
    secp256k1,
    note,
// eslint-disable-next-line import/no-unresolved
} = require('aztec.js');

const {outputCoder, inputCoder} = abiEncoder;

const ERC20Mintable = artifacts.require('./contracts/ERC20/ERC20Mintable');

const network_id = require('../../truffle-config').networks.development.network_id;

const ZKDAO = artifacts.require('./contracts/votes/ZKDAO.sol')
const ZKERC20 = artifacts.require('./contracts/votes/ZKERC20.sol')
const NoteRegistry = artifacts.require('./contracts/votes/NoteRegistry.sol')
const ACE = artifacts.require('./contracts/ACE/ACE.sol')
const JoinSplit = artifacts.require('./contracts/ACE/validators/joinSplit/JoinSplit');

const DividendComputation_Address = require('../../build/contracts/DividendComputation.json').networks[network_id].address;
const ERC20_Address = require('../../build/contracts/ERC20Mintable.json').networks[network_id].address;
const ZKDAO_Address = require('../../build/contracts/ZKDAO.json').networks[network_id].address;
const ZKERC20_Address = require('../../build/contracts/ZKERC20.json').networks[network_id].address;
const ACE_Address = require('../../build/contracts/ACE.json').networks[network_id].address;
const JoinSplit_Address = require('../../build/contracts/JoinSplit.json').networks[network_id].address;


console.log('ERC20 Address', ERC20_Address);
console.log('Dividend Address', DividendComputation_Address);


contract('ZKDAO', async (accounts) => {


    let erc20, dividendProof, za, zb, dividendAccounts, zkdao, noteRegistry, ace, joinSplit, zkerc20, proofData_encoded
    const tokensTransferred = new BN(100000);

    let proposal_id = 0

    before(async () => {

        console.log('This test expects all contracts to already have been migrated and will use the deployed contracts')

        erc20 = await ERC20Mintable.at(ERC20_Address);

        zkdao = await ZKDAO.at(ZKDAO_Address);

        zkerc20 = await ZKERC20.at(ZKERC20_Address);

        let noteRegistry_address = await zkerc20.noteRegistry()
        noteRegistry = await NoteRegistry.at(noteRegistry_address)

        ace = await ACE.at(ACE_Address)
        joinSplit = await JoinSplit.at(JoinSplit_Address)

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


    })

    let aztecAccounts;
    let notes;
    let scalingFactor;
    let proofOutputs;
    const publicOwner = accounts[0];


    it('generates a dividend proof', async () => {
        dividendAccounts = [...new Array(3)].map(() => secp256k1.generateAccount());

        let totalShares = 200
        let myShares = 20
        za = 100;
        zb = 10;
        let dif = totalShares * zb - myShares * za

        const noteValues = [totalShares, myShares, dif];


        let divnotes = [
            ...dividendAccounts.map(({publicKey}, i) => note.create(publicKey, noteValues[i])),
        ];
        // we will prove that account account account b (200) owns 5/100 (zb/za) of account a (200)
        // 50 is the difference between the two relationships (0 = 200*5 - 10*100)


        dividendProof = proof.dividendComputation.constructProof(divnotes, za, zb, accounts[1])
        const {
            proofData,
            challenge,
        } = dividendProof;

        // console.log({ za, zb })
        // console.log(dividendProof)

        const proofDataFormatted = [proofData.slice(0, 6)].concat([proofData.slice(6, 12), proofData.slice(12, 18)]);


        const inputNotes = divnotes.slice(0, 1);
        const outputNotes = divnotes.slice(1, 3);
        const inputOwners = inputNotes.map(m => m.owner);
        const outputOwners = outputNotes.map(n => n.owner);


        const data = abiEncoder.inputCoder.dividendComputation(
            proofDataFormatted,
            challenge,
            za,
            zb,
            inputOwners,
            outputOwners,
            outputNotes
        );

        // console.log(data)

        // console.log('Dividend proof constructed: ', dividendProof)
    })

    aztecAccounts = [...new Array(2)].map(() => secp256k1.generateAccount());

    let mintAmount = 20;
    notes = [
        ...aztecAccounts.map(({publicKey}, i) => note.create(publicKey, i * mintAmount)),
        //...aztecAccounts.map(({publicKey}, i) => note.create(publicKey, 20)),
    ];

    it('allocates zkshares', async () => {

        //await ace.setCommonReferenceString(CRS);

        let proofs = []


        proofs[0] = proof.joinSplit.encodeJoinSplitTransaction({
            inputNotes: [],
            outputNotes: notes.slice(0, 2),
            senderAddress: accounts[0],
            inputNoteOwners: [
                aztecAccounts[0],
                aztecAccounts[0]
            ],
            publicOwner,
            kPublic: -1 * mintAmount,
            aztecAddress: joinSplit.address,
        });

        scalingFactor = new BN(10);
        await Promise.all(accounts.map(account => erc20.mint(
            account,
            scalingFactor.mul(tokensTransferred),
            {from: accounts[0], gas: 4700000}
        )));

        await Promise.all(accounts.map(account => erc20.approve(
            noteRegistry.address,
            scalingFactor.mul(tokensTransferred),
            {from: account, gas: 4700000}
        ))); // approving tokens


        proofOutputs = proofs.map(({expectedOutput}) => outputCoder.getProofOutput(expectedOutput, 0));
        const proofHashes = proofOutputs.map(proofOutput => outputCoder.hashProofOutput(proofOutput));
        await noteRegistry.publicApprove(
            proofHashes[0],
            mintAmount,
            {from: accounts[0]}
        );

        await zkerc20.confidentialTransfer(
            proofs[0].proofData
        )

    })

    it.skip('can transfer notes again', async () => {
        let input = {
            inputNotes: notes.slice(0, 2),
            outputNotes: notes.slice(2, 4),
            senderAddress: accounts[0],
            inputNoteOwners: [
                aztecAccounts[0],
                aztecAccounts[0]
            ],
            publicOwner,
            kPublic: 0,
            aztecAddress: joinSplit.address,
        }

        //console.log(input)

        let transferProof = proof.joinSplit.encodeJoinSplitTransaction(input);

        //console.log(transferProof);

        await zkerc20.confidentialTransfer(
            transferProof.proofData
        )
    })

    it('can do a dividend proof', async () => {

        let totalShares = 200
        let myShares = 20

        let dividendProof = makeVoteProof(totalShares, notes[1], myShares)

        //console.log('Dividend proof constructed: ', dividendProof)
    })

    it('creates new proposal', async () => {

        /*
        function makeProposal(
            uint votingTimeInBlocks,
            string memory _reason,
            uint _requested_amount,
            address _requestee
        ) public returns (uint id) {

        uint REVEAL_PERIOD_LENGTH = 10;
         */

        proposal_id = (await zkdao.proposalCounter());

        await zkdao.makeProposal(
            0,
            "A great proposal",
            100,
            accounts[2]
        );


    })


    it('can commit to vote', async () => {

        // simply commit the hash of the encoded proof

        let totalShares = 200
        let myShares = 20

        proofData_encoded = makeVoteProof(totalShares, notes[1], myShares)

        let commit_hash = await zkdao.getVoteHash(proposal_id, proofData_encoded)

        await zkdao.commitVote(commit_hash, notes[1].noteHash)

    })

    it('can validate proofData', async () => {

        //console.log(proofData_encoded)

        let r = await zkdao.validateVoteProof(proofData_encoded)

        //console.log(r);
    })



    it('can reveal the vote', async () => {

        await zkdao.revealVote(proposal_id, proofData_encoded)

    })


    function makeVoteProof(totalShares, ourNote, myShares) {

        // we do this because we want to always have the perfect ratio
        za = totalShares;
        zb = myShares;

        let dif = totalShares * zb - myShares * za

        const noteValues = [totalShares, myShares, dif];

        const totalSharesNote = note.create(secp256k1.generateAccount().publicKey, noteValues[0])
        const difNote = note.create(secp256k1.generateAccount().publicKey, noteValues[2])

        let divnotes = [
            totalSharesNote,
            // use the one that actually has 20 :D
            ourNote,
            difNote
        ];
        // we will prove that account account account b (200) owns 5/100 (zb/za) of account a (200)
        // 50 is the difference between the two relationships (0 = 200*5 - 10*100)


        dividendProof = proof.dividendComputation.constructProof(divnotes, za, zb, accounts[0])


        // format

        let proofDataRaw = dividendProof.proofData;

        const proofDataRawFormatted = [proofDataRaw.slice(0, 6)].concat([proofDataRaw.slice(6, 12), proofDataRaw.slice(12, 18)]);

        const inputNotes = divnotes.slice(0, 1);
        const outputNotes = divnotes.slice(1, 3);

        const inputOwners = inputNotes.map(m => m.owner);
        const outputOwners = outputNotes.map(n => n.owner);

        return abiEncoder.inputCoder.dividendComputation(
            proofDataRawFormatted,
            dividendProof.challenge,
            za,
            zb,
            inputOwners,
            outputOwners,
            outputNotes
        );
    }
})
