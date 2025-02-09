// SPDX-License-Identifier: Apache-2.0

// ==================== External Imports ====================

const { expect } = require('chai');

// ==================== Internal Imports ====================

const { deployContract } = require('../helpers/deploy');
const { hashAdapterName } = require('../helpers/adapterUtil');
const { ZERO_ADDRESS } = require('../helpers/constants');
const { getSigners } = require('../helpers/accountUtil');
const { snapshotBlockchain, revertBlockchain } = require('../helpers/evmUtil.js');

describe('contract IntegrationRegistry', async () => {
  const [firstAdapterName, secondAdapterName, thirdAdapterName] = ['COMPOUND', 'KYBER', 'ONEINCH'];
  const [owner, firstAdapter, secondAdapter, firstModule, secondModule, thirdModule, randomAccount] = getSigners();

  let caller;
  let irMock;

  let snapshotId;
  before(async () => {
    snapshotId = await snapshotBlockchain();
    const controller = await deployContract('Controller', [owner.address], owner);
    await controller.initialize([], [firstModule.address, secondModule.address], [], []);
    irMock = await deployContract('IntegrationRegistry', [controller.address], owner);
  });

  after(async () => {
    revertBlockchain(snapshotId);
  });

  describe('addIntegration', async () => {
    let module;
    let adapterName;
    let adapter;

    async function addIntegration() {
      return await irMock.connect(caller).addIntegration(module, adapterName, adapter);
    }

    let snapshotId;
    before(async () => {
      snapshotId = await snapshotBlockchain();
    });

    after(async () => {
      await revertBlockchain(snapshotId);
    });

    beforeEach(async () => {
      caller = owner;
      module = firstModule.address;
      adapterName = firstAdapterName;
      adapter = firstAdapter.address;
    });

    it('should have no adapter name before add', async () => {
      const existingAddress = await irMock.getIntegrationAdapter(firstModule.address, firstAdapterName);
      expect(existingAddress).eq(ZERO_ADDRESS);
    });

    it('should emit the AddIntegration event', async () => {
      await expect(addIntegration()).emit(irMock, 'AddIntegration').withArgs(module, adapter, adapterName);
    });

    it('should have correct adapter name after add', async () => {
      const retrievedAddress = await irMock.getIntegrationAdapter(firstModule.address, firstAdapterName);
      expect(retrievedAddress).eq(firstAdapter.address);
    });

    it('should revert when someone other than the owner tries to add an address', async () => {
      caller = randomAccount;
      await expect(addIntegration()).revertedWith('R5');
    });

    it('should revert when an adapter is zero address', async () => {
      adapter = ZERO_ADDRESS;
      await expect(addIntegration()).revertedWith('R3a');
    });

    it('should revert when the module is not initialized on Controller', async () => {
      module = thirdModule.address;
      await expect(addIntegration()).revertedWith('R3b');
    });

    it('should revert when the adapter is already added', async () => {
      await expect(addIntegration()).revertedWith('R3c');
    });
  });

  describe('batchAddIntegration', async () => {
    let modules;
    let adapterNames;
    let adapters;

    async function batchAddIntegration() {
      return await irMock.connect(caller).batchAddIntegration(modules, adapterNames, adapters);
    }

    beforeEach(async () => {
      caller = owner;
      modules = [firstModule.address, secondModule.address];
      adapterNames = [firstAdapterName, secondAdapterName];
      adapters = [firstAdapter.address, secondAdapter.address];
    });

    context('group 1', async () => {
      let snapshotId;
      before(async () => {
        snapshotId = await snapshotBlockchain();
      });

      after(async () => {
        await revertBlockchain(snapshotId);
      });

      it('should revert when modules length is zero', async () => {
        modules = [];
        await expect(batchAddIntegration()).revertedWith('R0a');
      });

      it('should revert when module and adapter length is a mismatch', async () => {
        modules = [firstModule.address];
        adapterNames = [firstAdapterName, secondAdapterName];
        await expect(batchAddIntegration()).revertedWith('R0b');
      });

      it('should revert when module and adapter length is a mismatch', async () => {
        adapters = [firstAdapter.address];
        await expect(batchAddIntegration()).revertedWith('R0c');
      });

      it('should reverts when an adapter is zero address', async () => {
        adapters = [firstAdapter.address, ZERO_ADDRESS];
        await expect(batchAddIntegration()).revertedWith('R3a');
      });

      it('should revert when a module is not initialized on Controller', async () => {
        modules = [firstModule.address, thirdModule.address];
        await expect(batchAddIntegration()).revertedWith('R3b');
      });

      it('should get zero address before add integrations', async () => {
        const existingFirstAddress = await irMock.getIntegrationAdapter(firstModule.address, firstAdapterName);
        const existingSecondAddress = await irMock.getIntegrationAdapter(firstModule.address, secondAdapterName);
        expect(existingFirstAddress).eq(ZERO_ADDRESS);
        expect(existingSecondAddress).eq(ZERO_ADDRESS);
      });

      it('should emit the first AddIntegration event', async () => {
        await expect(batchAddIntegration()).emit(irMock, 'AddIntegration').withArgs(modules[0], adapters[0], adapterNames[0]);
      });

      it('shoud return correct adapter address after add integrations', async () => {
        const retrievedFirstAddress = await irMock.getIntegrationAdapter(firstModule.address, firstAdapterName);
        const retrievedSecondAddress = await irMock.getIntegrationAdapter(secondModule.address, secondAdapterName);
        expect(retrievedFirstAddress).eq(firstAdapter.address);
        expect(retrievedSecondAddress).eq(secondAdapter.address);
      });

      it('should revert when someone other than the owner tries to add an address', async () => {
        caller = randomAccount;
        await expect(batchAddIntegration()).revertedWith('R5');
      });
    });

    context('group 2', async () => {
      let snapshotId;
      before(async () => {
        snapshotId = await snapshotBlockchain();
      });

      after(async () => {
        await revertBlockchain(snapshotId);
      });

      it('should emit the second AddIntegration event', async () => {
        await expect(batchAddIntegration()).emit(irMock, 'AddIntegration').withArgs(modules[1], adapters[1], adapterNames[1]);
      });

      it('should revert when the adapters are already added', async () => {
        await expect(batchAddIntegration()).revertedWith('R3c');
      });
    });
  });

  describe('removeIntegration', async () => {
    let module;
    let adapterName;

    async function removeIntegration() {
      return await irMock.connect(caller).removeIntegration(module, adapterName);
    }

    let snapshotId;
    before(async () => {
      snapshotId = await snapshotBlockchain();
      await irMock.addIntegration(firstModule.address, firstAdapterName, firstAdapter.address);
    });

    after(async () => {
      await revertBlockchain(snapshotId);
    });

    beforeEach(async () => {
      caller = owner;
      module = firstModule.address;
      adapterName = firstAdapterName;
    });

    it('should revert when someone other than the owner tries to remove an address', async () => {
      caller = randomAccount;
      await expect(removeIntegration()).revertedWith('R5');
    });

    it('should revert when the address is not currently added', async () => {
      adapterName = secondAdapterName;
      await expect(removeIntegration()).revertedWith('R2');
    });

    it('should return correct adapter address', async () => {
      const result = await irMock.getIntegrationAdapter(firstModule.address, firstAdapterName);
      expect(result).eq(firstAdapter.address);
    });

    it('should emit an RemoveIntegration event', async () => {
      const oldAdapter = await irMock.getIntegrationAdapter(module, adapterName);
      await expect(removeIntegration()).emit(irMock, 'RemoveIntegration').withArgs(module, oldAdapter, adapterName);
    });

    it('should return zero address after remove integration', async () => {
      const result = await irMock.getIntegrationAdapter(firstModule.address, secondAdapterName);
      expect(result).eq(ZERO_ADDRESS);
    });
  });

  describe('editIntegration', async () => {
    let subjectModule;
    let subjectAdapterName;
    let subjectAdapter;

    async function editIntegration() {
      return await irMock.connect(caller).editIntegration(subjectModule, subjectAdapterName, subjectAdapter);
    }

    let snapshotId;
    before(async () => {
      snapshotId = await snapshotBlockchain();
      await irMock.addIntegration(firstModule.address, firstAdapterName, firstAdapter.address);
    });

    after(async () => {
      await revertBlockchain(snapshotId);
    });

    beforeEach(async () => {
      caller = owner;
      subjectModule = firstModule.address;
      subjectAdapterName = firstAdapterName;
      subjectAdapter = firstAdapter.address;
    });

    it('should revert when someone other than the owner tries to add an address', async () => {
      caller = randomAccount;
      await expect(editIntegration()).revertedWith('R5');
    });

    it('should revert when a value is zero', async () => {
      subjectAdapter = ZERO_ADDRESS;
      await expect(editIntegration()).revertedWith('R4a');
    });

    it('should revert when the module is not initialized on Controller', async () => {
      subjectModule = thirdModule.address;
      await expect(editIntegration()).revertedWith('R4b');
    });

    it('should revert when the address is not already added', async () => {
      subjectAdapterName = thirdAdapterName;
      await expect(editIntegration()).revertedWith('R4c');
    });

    it('should return correct address before edit integrations', async () => {
      const result = await irMock.getIntegrationAdapter(firstModule.address, firstAdapterName);
      expect(result).eq(firstAdapter.address);
    });

    it('should emit an EditIntegration event', async () => {
      subjectAdapter = secondAdapter.address;
      await expect(editIntegration()).emit(irMock, 'EditIntegration').withArgs(subjectModule, subjectAdapter, subjectAdapterName);
    });

    it('edits the id to the integrations mapping to correct adapters', async () => {
      const result = await irMock.getIntegrationAdapter(firstModule.address, firstAdapterName);
      expect(result).eq(secondAdapter.address);
    });
  });

  describe('batchEditIntegration', async () => {
    let modules;
    let adapterNames;
    let adapters;

    function resetEnviroment() {
      caller = owner;
      modules = [firstModule.address, secondModule.address];
      adapterNames = [firstAdapterName, secondAdapterName];
      adapters = [firstAdapter.address, secondAdapter.address];
    }

    async function batchEditIntegration() {
      return await irMock.connect(caller).batchEditIntegration(modules, adapterNames, adapters);
    }

    let snapshotId;
    before(async () => {
      snapshotId = await snapshotBlockchain();
      resetEnviroment();
      await irMock.connect(caller).batchAddIntegration(modules, adapterNames, adapters);
    });

    after(async () => {
      await revertBlockchain(snapshotId);
    });

    beforeEach(async () => {
      resetEnviroment();
    });

    it('should revert when someone other than the owner tries to add an address', async () => {
      caller = randomAccount;
      await expect(batchEditIntegration()).revertedWith('R5');
    });

    it('should revert when modules length is zero', async () => {
      modules = [];
      await expect(batchEditIntegration()).revertedWith('R1a');
    });

    it('should revert when Module and adapter length is a mismatch', async () => {
      modules = [firstModule.address];
      adapterNames = [firstAdapterName, secondAdapterName];
      await expect(batchEditIntegration()).revertedWith('R1b');
    });

    it('should revert when module and adapter length is a mismatch', async () => {
      adapters = [firstAdapter.address];
      await expect(batchEditIntegration()).revertedWith('R1c');
    });

    it('should revert when an adapter is zero address', async () => {
      adapters = [secondAdapter.address, ZERO_ADDRESS];
      await expect(batchEditIntegration()).revertedWith('R4a');
    });

    it('should revert when a module is not initialized on Controller', async () => {
      modules = [firstModule.address, thirdModule.address];
      await expect(batchEditIntegration()).revertedWith('R4b');
    });

    it('should revert when the adapter is not added', async () => {
      adapterNames = [firstAdapterName, thirdAdapterName];
      await expect(batchEditIntegration()).revertedWith('R4c');
    });

    it('edits the ids to the integrations mapping with correct adapters', async () => {
      const existingFirstAddress = await irMock.getIntegrationAdapter(firstModule.address, firstAdapterName);
      const existingSecondAddress = await irMock.getIntegrationAdapter(secondModule.address, secondAdapterName);
      expect(existingFirstAddress).eq(firstAdapter.address);
      expect(existingSecondAddress).eq(secondAdapter.address);

      await batchEditIntegration();

      const retrievedFirstAddress = await irMock.getIntegrationAdapter(firstModule.address, firstAdapterName);
      const retrievedSecondAddress = await irMock.getIntegrationAdapter(secondModule.address, secondAdapterName);
      expect(retrievedFirstAddress).eq(firstAdapter.address);
      expect(retrievedSecondAddress).eq(secondAdapter.address);
    });

    it('should emit the first EditIntegration event', async () => {
      await expect(batchEditIntegration()).emit(irMock, 'EditIntegration').withArgs(modules[0], adapters[0], adapterNames[0]);
    });

    it('should emit the second EditIntegration event', async () => {
      await expect(batchEditIntegration()).emit(irMock, 'EditIntegration').withArgs(modules[1], adapters[1], adapterNames[1]);
    });
  });

  describe('isValidIntegration', async () => {
    let snapshotId;
    before(async () => {
      snapshotId = await snapshotBlockchain();
      await irMock.connect(owner).addIntegration(firstModule.address, firstAdapterName, firstAdapter.address);
    });

    after(async () => {
      await revertBlockchain(snapshotId);
    });

    it('should return true when ID is valid', async () => {
      const result = await irMock.isValidIntegration(firstModule.address, firstAdapterName);
      expect(result).is.true;
    });

    it('should return false when ID is invalid', async () => {
      const result = await irMock.isValidIntegration(firstModule.address, 'NotAdapterName');
      expect(result).is.false;
    });
  });

  describe('getIntegrationAdapter', async () => {
    let snapshotId;
    before(async () => {
      snapshotId = await snapshotBlockchain();
      await irMock.connect(owner).addIntegration(firstModule.address, firstAdapterName, firstAdapter.address);
    });

    after(async () => {
      await revertBlockchain(snapshotId);
    });

    it('should return correct adapter address with correct module and adapterName', async () => {
      const result = await irMock.getIntegrationAdapter(firstModule.address, firstAdapterName);
      expect(result).eq(firstAdapter.address);
    });

    it('should return zero address when module address is wrong', async () => {
      const result = await irMock.getIntegrationAdapter(secondModule.address, firstAdapterName);
      expect(result).eq(ZERO_ADDRESS);
    });

    it('should return zero address when adapterName is wrong', async () => {
      const result = await irMock.getIntegrationAdapter(firstModule.address, secondAdapterName);
      expect(result).eq(ZERO_ADDRESS);
    });

    it('should return zero address when both module and adapterName are wrong', async () => {
      const result = await irMock.getIntegrationAdapter(ZERO_ADDRESS, 'NotAdapterName');
      expect(result).eq(ZERO_ADDRESS);
    });
  });

  describe('getIntegrationAdapterWithHash', async () => {
    let snapshotId;
    before(async () => {
      snapshotId = await snapshotBlockchain();
      await irMock.connect(owner).addIntegration(firstModule.address, firstAdapterName, firstAdapter.address);
    });

    after(async () => {
      await revertBlockchain(snapshotId);
    });

    it('should return correct adapter address with correct module and adapterName', async () => {
      const result = await irMock.getIntegrationAdapterWithHash(firstModule.address, hashAdapterName(firstAdapterName));
      expect(result).eq(firstAdapter.address);
    });

    it('should return zero address when module address is wrong', async () => {
      const result = await irMock.getIntegrationAdapterWithHash(secondModule.address, hashAdapterName(firstAdapterName));
      expect(result).eq(ZERO_ADDRESS);
    });

    it('should return zero address when adapterName is wrong', async () => {
      const result = await irMock.getIntegrationAdapterWithHash(firstModule.address, hashAdapterName(secondAdapterName));
      expect(result).eq(ZERO_ADDRESS);
    });

    it('should return zero address when both module and adapterName are wrong', async () => {
      const result = await irMock.getIntegrationAdapterWithHash(ZERO_ADDRESS, hashAdapterName('NotAdapterName'));
      expect(result).eq(ZERO_ADDRESS);
    });
  });
});
