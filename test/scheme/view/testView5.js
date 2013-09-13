module.exports = {
	name: 'testView5',
	view:{},
	config: {
		something: [
			{ _vid: 'q1', _flexo:{type: 'read', scheme: ['testUsers', '_id']}},
			{ _vid: 'w2', _flexo:{type: 'read', scheme: ['testUsers', 'tsUpdate']}}
		],
		button:[
			{ _vid: 'a9', _flexo:{type: 'delete', scheme: ['testUsers']}}
		]
	}
};


