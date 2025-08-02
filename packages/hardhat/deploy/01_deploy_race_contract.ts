import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the "Race" contract for the Tapnad Bitcoin vs Ethereum racing game
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployRaceContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Set your wallet address as the organizer for demo control
  const DEMO_ORGANIZER = "0x9A00D0828743a8D94D995FC6e5A6BF50B71f256F";

  await deploy("Race", {
    from: deployer,
    // Constructor arguments: organizer address (set to your demo wallet)
    args: [DEMO_ORGANIZER],
    log: true,
    autoMine: true,
  });

  // Get the deployed contract to interact with it after deploying.
  const raceContract = await hre.ethers.getContract<Contract>("Race", deployer);
  console.log("🏁 Race contract deployed! Organizer:", await raceContract.organizer());
  console.log("🎮 Game state:", await raceContract.gameState());
};

export default deployRaceContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags Race
deployRaceContract.tags = ["Race"];
