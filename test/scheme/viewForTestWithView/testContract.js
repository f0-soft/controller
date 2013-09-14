module.exports = {
	name: 'testContract',
	config: {
		co01: { _vid: 'co1', _flexo: {type: 'read', scheme: ['testContract', '_id']} },
		co02: { _vid: 'co2', _flexo: {type: 'read', scheme: ['testContract', 'tsUpdate']} },
		co03: { _vid: 'co3', _flexo: {type: 'modify', scheme: ['testContract', 'date']} },
		co04: { _vid: 'co4', _flexo: {type: 'modify', scheme: ['testContract', 'index']} },
		co05: { _vid: 'co5', _flexo: {type: 'modify', scheme: ['testContract', 'customer_id']} },
		co06: { _vid: 'co6', _flexo: {type: 'create', scheme: ['testContract', 'date']} },
		co07: { _vid: 'co7', _flexo: {type: 'create', scheme: ['testContract', 'index']} },
		co08: { _vid: 'co8', _flexo: {type: 'create', scheme: ['testContract', 'customer_id']} }/*,
		co09: { _vid: 'co9', _flexo: {type: 'delete', scheme: ['testContract']} }*/
	},
	root: 'testContract'
};
