module.exports = {
	name: 'testView2',
	view:{},
	config: {
		something: [
			{ _vid: 'q1', _flexo:{type: 'read', scheme: ['testUsers', 'login']}},
			{ _vid: 'w2', _flexo:{type: 'read', scheme: ['testUsers', 'role']}},
			{ _vid: 'e3', _flexo:{type: 'read', scheme: ['testUsers', 'name']}},
			{ _vid: 'r4', _flexo:{type: 'read', scheme: ['testUsers', 'lastname']}},
			{ _vid: 't5', _flexo:{type: 'read', scheme: ['testUsers', 'position']}},
			{ _vid: 'y6', _flexo:{type: 'read', scheme: ['testUsers', 'company']}},
			{ _vid: 'u7', _flexo:{type: 'read', scheme: ['testUsers', 'hash']}},
			{ _vid: 'i8', _flexo:{type: 'read', scheme: ['testUsers', 'salt']}},
			{ _vid: 'o9', _flexo:{type: 'read', scheme: ['testUsers', '_id']}},
			{ _vid: 'p10', _flexo:{type: 'read', scheme: ['testUsers', 'tsUpdate']}}
		]
	}
};