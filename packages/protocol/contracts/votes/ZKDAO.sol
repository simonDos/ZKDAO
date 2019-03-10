pragma solidity >=0.5.0 <0.6.0;

import "../ACE/ACE.sol";
import "../utils/NoteUtils.sol";
import "../ZKERC20/ZKERC20.sol";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract ZKDAO {
    using NoteUtils for bytes;
    using SafeMath for uint256;

    ACE ace;
    ERC20 funds;
    ZKERC20 shareToken;

    event Swing(
        uint swing
    );

    enum VoteStatus {
        Null,
        Committed,
        Revealed
    }

    struct Proposal {
        uint revealPeriodStart;
        uint revealPeriodEnd;
        uint tally;
        uint id;

        string reason;
        uint requested;
        address requestee;
    }

    mapping(bytes32 => VoteStatus) commits;
    mapping(bytes32 => bool) voted;
    mapping(uint => Proposal) proposals;
    uint numProposals;
    uint totalSupply;
    uint THRESHOLD;
    uint16 DIVIDEND_PROOF_ID = 2;

    event ProposalMade(uint id);
    event ProposalExecuted(uint id, uint tally);
    event VoteCommitted(bytes32 commit);
    event VoteCounted(uint _prop, uint tally);

    constructor(ACE _ace, ERC20 _funds, ZKERC20 _shareToken, uint _totalSupply) public {
        numProposals = 0;
        ace = _ace;
        funds = _funds;
        shareToken = _shareToken;

        THRESHOLD = totalSupply.div(2);
        totalSupply = _totalSupply;
    }

    function makeProposal(uint _revealPeriodStart, string memory _reason, uint _requested, address _requestee) public returns (uint id) {
        uint revealPeriodEnd = _revealPeriodStart + 1 days;

        id = numProposals++;

        Proposal memory proposal = Proposal(
            _revealPeriodStart,
            revealPeriodEnd,
            0,
            id,
            _reason,
            _requested,
            _requestee
        );
        proposals[id] = proposal;
        emit ProposalMade(id);

        return id;
    }

    function commitVote(uint _proposal, address _shareholder, bytes memory _proofData) public {
        bytes32 commit = getVoteHash(_proposal, _shareholder, _proofData);
        commits[commit] = VoteStatus.Committed;
        emit VoteCommitted(commit);
    }

    function revealVote(uint _proposal, address _shareholder, bytes memory _proofData) public {
        Proposal storage prop = proposals[_proposal];
        require(prop.revealPeriodStart != 0x0, "404_PROPOSAL");
        require(prop.revealPeriodStart > block.timestamp, "REVEAL_TOO_EARLY");
        require(prop.revealPeriodEnd < block.timestamp, "REVEAL_PERIOD_ENDED");

        bytes32 commit = getVoteHash(_proposal, _shareholder, _proofData);
        require(commits[commit] == VoteStatus.Committed, "VOTE_NOT_COMMITTED");

        (address shareholder, uint votes) = validateVoteProof(_proofData);
        require(shareholder == _shareholder, "VOTE_SHAREHOLDER_MISMATCH");

        prop.tally += votes;
        commits[commit] = VoteStatus.Revealed;
        emit VoteCounted(_proposal, prop.tally);
    }

    function executeProposal(uint _proposal) public {
        Proposal storage prop = proposals[_proposal];
        // TODO proper 50%
        require(prop.tally > THRESHOLD, "THRESHOLD_NOT_REACHED");
        require(funds.transferFrom(address(this), prop.requestee, prop.requested), "FUNDING_TRANSFER_FAILED");
        emit ProposalExecuted(_proposal, prop.tally);
    }

    function getVoteHash(uint _proposal, address _shareholder, bytes memory _proof) public returns (bytes32) {
        return keccak256(abi.encodePacked(
                _proposal,
                _shareholder,
                _proof
            ));
    }

    function extractDividendProofParams(bytes memory _proofData) public pure returns (
        uint256 za,
        uint256 zb
    ) {
        // za = uint256(bytes32(_proofData[32]));
        // zb = uint256(bytes32(_proofData[64]));

        assembly {
            za := mload(add(_proofData, 0x40))
            zb := mload(add(_proofData, 0x60))
        // inputNotes := add(proofOutput, mload(add(proofOutput, 0x20)))
        // outputNotes := add(proofOutput, mload(add(proofOutput, 0x40)))
        // publicOwner := mload(add(proofOutput, 0x60))
        // publicValue := mload(add(proofOutput, 0x80))

        // let gen_order := 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
        // let challenge := mod(calldataload(0x124), gen_order)

        // za := mod(calldataload(0x144), gen_order)
        // zb := mod(calldataload(0x164), gen_order)
        }
    }

    function validateVoteProof(bytes memory _proofData) public returns (address, uint) {
        bytes memory proofOutputs = ace.validateProof(DIVIDEND_PROOF_ID, msg.sender, _proofData);
        require(proofOutputs.length != 0, "proof invalid!");


        // require(ace.updateNoteRegistry(proofOutput, 1, address(this)), "could not update note registry!");

        (bytes memory inputNotes,
        bytes memory outputNotes,,
        //address publicOwner,
        //int256 publicValue
        ) = proofOutputs.get(0).extractProofOutput();

        // notes (A, X, B)
        // inputNotes = (totalSupply)
        // outputNotes = (X, B your zkshare certificate/note)
        (, bytes32 noteHash_totalSupply,) = inputNotes.get(0).extractNote();
        (, bytes32 noteHash_zkshare,) = outputNotes.get(0).extractNote();

        // checkNoteExists(noteHash_totalSupply);
        checkNoteExists(noteHash_zkshare);

        // bytes32 shareholder = noteHash_zkshare;


        // k_3 = (k_1)(z_b) - (k_2)(z_a)
        // zb
        (uint256 za, uint256 zb) = extractDividendProofParams(_proofData);
        uint256 temp = zb * totalSupply;
        uint256 swing = (temp).div(za);
        // uint votes = zb;

        address xx = address(this);
        // noteHash_zkshare

        emit Swing(swing);

        return (xx, swing);
    }


    function checkNoteExists(bytes32 noteHash) internal {
        // NoteRegistry.Note storage note = ace.noteRegistries(shareToken).registry(noteHash);
        // (uint8 status,
        // ,// bytes5 createdOn,
        // ,// bytes5 destroyedOn,
        // ,// address owner
        (uint8 status,,,) = shareToken.noteRegistry().registry(noteHash);
        require(status == 1, "note nonexistent or something");
    }


}
