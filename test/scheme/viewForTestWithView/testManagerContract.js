module.exports = {
	name: 'testManagerContract',
	config: {
		mco01: { _vid: 'mco1', _flexo: {type: 'read', scheme: ['testManager', '_id', 'manager_id', 'contract-manager'] } },
		mco02: { _vid: 'mco2', _flexo: {type: 'read', scheme: ['testManager', 'tsUpdate', 'manager_id', 'contract-manager'] } },
		mco03: { _vid: 'mco3', _flexo: {type: 'read', scheme: ['testManager', 'name', 'manager_id', 'contract-manager'] } },
		mco04: { _vid: 'mco4', _flexo: {type: 'read', scheme: ['testManager', 'lastName', 'manager_id', 'contract-manager'] } },
		mco05: { _vid: 'mco5', _flexo: {type: 'read', scheme: ['testContract', '_id'] } },
		mco06: { _vid: 'mco6', _flexo: {type: 'read', scheme: ['testContract', 'index']} },
		mco07: { _vid: 'mco7', _flexo: {type: 'read', scheme: ['testContract', 'customer_id']} }
	},
	root: 'testContract'
};
