module.exports = {
	name: 'testManagerCustomer',
	config: {
		mcu01: { _vid: 'mcu1', _flexo: {type: 'read', scheme: ['testManager', '_id', 'manager_id', 'contract-manager'] } },
		mcu02: { _vid: 'mcu2', _flexo: {type: 'read', scheme: ['testManager', 'tsUpdate', 'manager_id', 'contract-manager'] } },
		mcu03: { _vid: 'mcu3', _flexo: {type: 'read', scheme: ['testManager', 'name', 'manager_id', 'contract-manager'] } },
		mcu04: { _vid: 'mcu4', _flexo: {type: 'read', scheme: ['testManager', 'lastName', 'manager_id', 'contract-manager'] } },
		mcu05: { _vid: 'mcu5', _flexo: {type: 'read', scheme: ['testCustomer', '_id'] } },
		mcu06: { _vid: 'mcu6', _flexo: {type: 'read', scheme: ['testCustomer', 'tsUpdate']} },
		mcu07: { _vid: 'mcu7', _flexo: {type: 'read', scheme: ['testCustomer', 'name']} }
	},
	root: 'testCustomer'
};
