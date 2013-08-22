module.exports = {
	name: 'testView3',
	view:{},
	config: {
		something: [
			{ _vid: 'q8', _flexo:{type: 'create', scheme: ['testUsers', 'login']}, itemName:'q8'},
			{ _vid: 'w7', _flexo:{type: 'create', scheme: ['testUsers', 'role']}, itemName:'w7'},
			{ _vid: 'e6', _flexo:{type: 'create', scheme: ['testUsers', 'name']}, itemName:'e6'},
			{ _vid: 'r5', _flexo:{type: 'create', scheme: ['testUsers', 'lastname']}, itemName:'r5'},
			{ _vid: 't4', _flexo:{type: 'create', scheme: ['testUsers', 'position']}, itemName:'t4'},
			{ _vid: 'y3', _flexo:{type: 'create', scheme: ['testUsers', 'company']}, itemName:'y3'},
			{ _vid: 'u2', _flexo:{type: 'create', scheme: ['testUsers', 'hash']}, itemName:'u2'},
			{ _vid: 'i1', _flexo:{type: 'create', scheme: ['testUsers', 'salt']}, itemName:'i1'}
		],
		button:[
			{ _vid: 'a9', _flexo:{type: 'create', scheme: ['testUsers']}, itemName:'a9'}
		]
	}
};