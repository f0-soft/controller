module.exports = {
	name: 'testView4',
	template: '',
	config: {
		something: [
			{ _vid: 's10', _flexo:{type: 'read', scheme: ['testUsers', 'tsUpdate']}, itemName:'s10'},
			{ _vid: 'a9', _flexo:{type: 'read', scheme: ['testUsers', '_id']}, itemName:'a9'},
			{ _vid: 'q8', _flexo:{type: 'modify', scheme: ['testUsers', 'login']}, itemName:'q8'},
			{ _vid: 'w7', _flexo:{type: 'modify', scheme: ['testUsers', 'role']}, itemName:'w7'},
			{ _vid: 'e6', _flexo:{type: 'modify', scheme: ['testUsers', 'name']}, itemName:'e6'},
			{ _vid: 'r5', _flexo:{type: 'modify', scheme: ['testUsers', 'lastname']}, itemName:'r5'},
			{ _vid: 't4', _flexo:{type: 'modify', scheme: ['testUsers', 'position']}, itemName:'t4'},
			{ _vid: 'y3', _flexo:{type: 'modify', scheme: ['testUsers', 'company']}, itemName:'y3'},
			{ _vid: 'u2', _flexo:{type: 'modify', scheme: ['testUsers', 'hash']}, itemName:'u2'},
			{ _vid: 'i1', _flexo:{type: 'modify', scheme: ['testUsers', 'salt']}, itemName:'i1'}
		]
	}
};


