## ZKDAO
Zero Knowledge DAO - cast anonymous votes (uses the [AZTEC Cryptography Engine + Proofs](https://www.aztecprotocol.com/)).

[Created at #ETHParis](https://devpost.com/software/zkdao).

### How it works
We represent a share in the DAO as an AZTEC ZK-note and represent a "vote" as a ZK proof of a % of that balance.

We can use the totalSupply of the original ERC20 share token to calculate the number of votes required to pass a proposal.  
We then repurpose the *dividend* proof to prove that a shareholder "votes" a % of the totalSupply of available votes,  
**without revealing** their total number of shares nor **their identity** (notes can be transferred anonymously).

### Experiment
Our proof-of-concept is a contract and a test suite which proves the concept.

 - [ZKDAO.sol](https://github.com/simonDos/ZKDAO/blob/master/packages/protocol/contracts/votes/ZKDAO.sol)
 - [unit tests](https://github.com/simonDos/ZKDAO/blob/master/packages/protocol/test/AnomVoting/AnomVoting.js)

We haven't slept, make a Github issue if you'd like to play / chat further.

Liam Zebedee (**[@liamzebedee](https://github.com/liamzebedee)**), Simon Dosch (**[@simonDos](https://github.com/simonDos)**), Max Niemzik (**[@ethyla](https://github.com/ethyla)**)
