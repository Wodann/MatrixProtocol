// SPDX-License-Identifier: GPL-3.0-only

// Copy from https://github.com/Uniswap/v2-core/blob/master/contracts/interfaces/IUniswapV2Callee.sol under terms of GPL-3.0

pragma solidity >=0.5.0;

interface IUniswapV2Callee {
    function uniswapV2Call(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
}
