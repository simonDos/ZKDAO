pragma solidity >=0.5.0 <0.6.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

/**
 * @title ERC20Mintable
 * @dev ERC20 minting logic
 * Sourced from OpenZeppelin and thoroughly butchered to remove security guards.
 * Anybody can mint - STRICTLY FOR TEST PURPOSES
 */
contract ERC20Mintable is ERC20 {

    constructor() public {
        // ad hard coded notes here

        mint(0xe375639d0Fa6feC13e6F00A09A3D3BAcf18A354F, 70);
        mint(0x7344F4BC96fb01f57488cEC936AFc20bA8CD8FD6, 30);

        // total supply
        mint(msg.sender, 100);
    }

    /**
    * @dev Function to mint tokens
    * @param _to The address that will receive the minted tokens.
    * @param _value The amount of tokens to mint.
    * @return A boolean that indicates if the operation was successful.
    */
    function mint(address _to, uint256 _value) public returns (bool) {
        _mint(_to, _value);
        return true;
    }
}
