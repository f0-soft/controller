module.exports = {
	name: 'testView4',
	view:{},
	config: {
		something: [
			{ _vid: 's10', _flexo:{type: 'read', scheme: ['testUsers', 'tsUpdate']}},
			{ _vid: 'a9', _flexo:{type: 'read', scheme: ['testUsers', '_id']}},
			{ _vid: 'q8', _flexo:{type: 'modify', scheme: ['testUsers', 'login']}},
			{ _vid: 'w7', _flexo:{type: 'modify', scheme: ['testUsers', 'role']}},
			{ _vid: 'e6', _flexo:{type: 'modify', scheme: ['testUsers', 'name']}},
			{ _vid: 'r5', _flexo:{type: 'modify', scheme: ['testUsers', 'lastname']}},
			{ _vid: 't4', _flexo:{type: 'modify', scheme: ['testUsers', 'position']}},
			{ _vid: 'y3', _flexo:{type: 'modify', scheme: ['testUsers', 'company']}},
			{ _vid: 'u2', _flexo:{type: 'modify', scheme: ['testUsers', 'hash']}},
			{ _vid: 'i1', _flexo:{type: 'modify', scheme: ['testUsers', 'salt']}}
		]
	}
};


