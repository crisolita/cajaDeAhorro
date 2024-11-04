import { task } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import 'hardhat-gas-reporter';
import '@nomiclabs/hardhat-etherscan';  
import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();


import { HardhatUserConfig } from 'hardhat/types';

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.27',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: `https://polygon-mainnet.g.alchemy.com/v2/Wg8E8VyQ80iNWoyXwWuSJO0UygiQjLWg`,
        blockNumber: 63636326,
      },
    },
    testnet: {
      url: "https://rpc.ankr.com/xdc_testnet",
      chainId: 51,
      accounts: [process.env.PRIV_KEY as string]
    },
  },
};

export default config;