module.exports = {
	name: 'testView2',
	view:{},
	config: {
		something: [
			{ _vid: 'q1', _flexo:{type: 'read', scheme: ['testUsers', 'login']}, itemName:'q1'},
			{ _vid: 'w2', _flexo:{type: 'read', scheme: ['testUsers', 'role']}, itemName:'w2'},
			{ _vid: 'e3', _flexo:{type: 'read', scheme: ['testUsers', 'name']}, itemName:'e3'},
			{ _vid: 'r4', _flexo:{type: 'read', scheme: ['testUsers', 'lastname']}, itemName:'r4'},
			{ _vid: 't5', _flexo:{type: 'read', scheme: ['testUsers', 'position']}, itemName:'t5'},
			{ _vid: 'y6', _flexo:{type: 'read', scheme: ['testUsers', 'company']}, itemName:'y6'},
			{ _vid: 'u7', _flexo:{type: 'read', scheme: ['testUsers', 'hash']}, itemName:'u7'},
			{ _vid: 'i8', _flexo:{type: 'read', scheme: ['testUsers', 'salt']}, itemName:'i8'},
			{ _vid: 'o9', _flexo:{type: 'read', scheme: ['testUsers', '_id']}, itemName:'o9'},
			{ _vid: 'p10', _flexo:{type: 'read', scheme: ['testUsers', 'tsUpdate']}, itemName:'p10'}
		]
	}
};