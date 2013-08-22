module.exports = {
	name: 'testView5',
	view:{},
	config: {
		something: [
			{ _vid: 'q1', _flexo:{type: 'read', scheme: ['testUsers', '_id']}, itemName:'q1'},
			{ _vid: 'w2', _flexo:{type: 'read', scheme: ['testUsers', 'tsUpdate']}, itemName:'w2'}
		],
		button:[
			{ _vid: 'a9', _flexo:{type: 'delete', scheme: ['testUsers']}, itemName:'a9'}
		]
	}
};


