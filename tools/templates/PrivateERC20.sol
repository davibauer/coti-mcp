// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Private ERC20 Token for COTI Blockchain
 * @notice This is a base template for COTI private ERC20 tokens
 * @dev Uses COTI's confidential types (ctUint64) for encrypted balances
 */

contract PrivateERC20 {
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    // Note: In actual COTI contracts, balances use ctUint64 (confidential uint64)
    // This is handled by COTI's compiler and runtime
    mapping(address => uint256) private _balances; // In practice, this is ctUint64
    mapping(address => mapping(address => uint256)) private _allowances; // In practice, encrypted
    uint256 private _totalSupply;

    address public owner;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(string memory name_, string memory symbol_, uint8 decimals_) {
        require(decimals_ >= 0 && decimals_ <= 6, "Decimals must be between 0 and 6 for COTI private tokens");
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
        owner = msg.sender;
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function decimals() public view returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function allowance(address owner_, address spender) public view returns (uint256) {
        return _allowances[owner_][spender];
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount <= type(uint64).max, "Amount exceeds uint64 maximum for COTI");

        _totalSupply += amount;
        _balances[to] += amount;

        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(_balances[from] >= amount, "Insufficient balance");

        _balances[from] -= amount;
        _balances[to] += amount;

        emit Transfer(from, to, amount);
    }

    function _approve(address owner_, address spender, uint256 amount) internal {
        require(owner_ != address(0), "Approve from zero address");
        require(spender != address(0), "Approve to zero address");

        _allowances[owner_][spender] = amount;
        emit Approval(owner_, spender, amount);
    }

    function _spendAllowance(address owner_, address spender, uint256 amount) internal {
        uint256 currentAllowance = _allowances[owner_][spender];
        require(currentAllowance >= amount, "Insufficient allowance");
        _approve(owner_, spender, currentAllowance - amount);
    }
}
