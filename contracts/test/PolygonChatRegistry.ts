import { expect } from "chai";
import { ethers } from "hardhat";

describe("PolygonChatRegistry", () => {
  async function deployFixture() {
    const [owner, other] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("PolygonChatRegistry");
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    return { contract, owner, other };
  }

  it("registers and updates profiles", async () => {
    const { contract, owner } = await deployFixture();
    await contract
      .connect(owner)
      .registerProfile("alice", "cid://avatar", "hello", "Alice");

    const profile = await contract.getProfile(owner.address);
    expect(profile.username).to.equal("alice");

    await contract
      .connect(owner)
      .updateProfile("cid://new", "gm world", "Captain Alice");

    const updated = await contract.getProfile(owner.address);
    expect(updated.avatarCid).to.equal("cid://new");
    expect(updated.displayName).to.equal("Captain Alice");
  });

  it("blocks conversations between users", async () => {
    const { contract, owner, other } = await deployFixture();
    await contract.registerProfile("alice", "", "", "Alice");
    await contract.connect(other).registerProfile("bob", "", "", "Bob");

    await contract.setBlockStatus(other.address, true);

    await expect(
      contract.upsertMessagePointer(other.address, "cid://msg", ethers.ZeroHash)
    ).to.be.revertedWithCustomError(contract, "BlockedParticipant");
  });
});





