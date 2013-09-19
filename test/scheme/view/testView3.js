module.exports = {
	name: 'testView3',
	view:{},
	config: {
		something: [
			{ _vid: 'q8', _flexo:{type: 'create', scheme: ['testUsers', 'login']}},
			{ _vid: 'w7', _flexo:{type: 'create', scheme: ['testUsers', 'role']}},
			{ _vid: 'e6', _flexo:{type: 'create', scheme: ['testUsers', 'name']}},
			{ _vid: 'r5', _flexo:{type: 'create', scheme: ['testUsers', 'lastname']}},
			{ _vid: 't4', _flexo:{type: 'create', scheme: ['testUsers', 'position']}},
			{ _vid: 'y3', _flexo:{type: 'create', scheme: ['testUsers', 'company']}},
			{ _vid: 'u2', _flexo:{type: 'create', scheme: ['testUsers', 'hash']}},
			{ _vid: 'i1', _flexo:{type: 'create', scheme: ['testUsers', 'salt']}}
		],
		button:[
			{ _vid: 'a9', _flexo:{type: 'create', scheme: ['testUsers']}, itemName:'a9'}
		]
	}
};