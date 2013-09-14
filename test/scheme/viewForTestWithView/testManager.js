module.exports = {
	name: 'testManager',
	config: {
		m01: { _vid: 'm1', _flexo: {type: 'read', scheme: ['testManager', '_id']}},
		m02: { _vid: 'm2', _flexo: {type: 'read', scheme: ['testManager', 'tsUpdate']} },
		m03: { _vid: 'm3', _flexo: {type: 'modify', scheme: ['testManager', 'name']} },
		m04: { _vid: 'm4', _flexo: {type: 'modify', scheme: ['testManager', 'lastName']} },
		m05: { _vid: 'm5', _flexo: {type: 'create', scheme: ['testManager', 'name']} },
		m06: { _vid: 'm6', _flexo: {type: 'create', scheme: ['testManager', 'lastName']} }/*,
		m07: { _vid: 'm7', _flexo: {type: 'delete', scheme: ['testManeger']} } */
	},
	root:'testManager'
};
