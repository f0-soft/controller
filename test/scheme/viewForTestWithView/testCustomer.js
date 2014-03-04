module.exports = {
	name: 'testCustomer',
	config: {
		cu01: { _vid: 'cu1', _flexo: {type: 'read', scheme: ['testCustomer', '_id']} },
		cu02: { _vid: 'cu2', _flexo: {type: 'read', scheme: ['testCustomer', 'tsUpdate']} },
		cu03: { _vid: 'cu3', _flexo: {type: 'modify', scheme: ['testCustomer', 'name']} },
		cu04: { _vid: 'cu4', _flexo: {type: 'modify', scheme: ['testCustomer', 'manager_id']} },
		cu05: { _vid: 'cu5', _flexo: {type: 'create', scheme: ['testCustomer', 'name']} },
		cu06: { _vid: 'cu6', _flexo: {type: 'create', scheme: ['testCustomer', 'manager_id']} }/*,
		cu07: { _vid: 'cu7', _flexo: {type: 'delete', scheme: ['testCustomer']} }*/
	},
	root: 'testCustomer'
};
