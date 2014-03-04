module.exports = {
	name: 'testView1_3',
	config: {
		tV01: { _vid: 'tV01', _flexo: {type: 'read', scheme: ['testFlexo1_3', '_id']}},
		tV02: { _vid: 'tV02', _flexo: {type: 'read', scheme: ['testFlexo1_3', 'tsUpdate']}},

		tV03: { _vid: 'tV03', _flexo: {type: 'modify', scheme: ['testFlexo1_3', 'field1']}},
		tV04: { _vid: 'tV04', _flexo: {type: 'modify', scheme: ['testFlexo1_3', 'field2']}},
		tV05: { _vid: 'tV05', _flexo: {type: 'modify', scheme: ['testFlexo1_3', 'field3']}},
		tV06: { _vid: 'tV06', _flexo: {type: 'modify', scheme: ['testFlexo1_3', 'field4']}},
		tV07: { _vid: 'tV07', _flexo: {type: 'modify', scheme: ['testFlexo1_3', 'field5']}},
		tV08: { _vid: 'tV08', _flexo: {type: 'modify', scheme: ['testFlexo1_3', 'field6']}},
		tV09: { _vid: 'tV09', _flexo: {type: 'modify', scheme: ['testFlexo1_3', 'field7']}},
		tV10: { _vid: 'tV10', _flexo: {type: 'modify', scheme: ['testFlexo1_3', 'field8']}},
		tV11: { _vid: 'tV11', _flexo: {type: 'modify', scheme: ['testFlexo1_3', 'field9']}},
		tV12: { _vid: 'tV12', _flexo: {type: 'modify', scheme: ['testFlexo1_3', 'field10']}},
		tV13: { _vid: 'tV13', _flexo: {type: 'modify', scheme: ['testFlexo1_3', 'field11']}},
		tV14: { _vid: 'tV14', _flexo: {type: 'modify', scheme: ['testFlexo1_3', 'field12']}},
		tV15: { _vid: 'tV15', _flexo: {type: 'modify', scheme: ['testFlexo1_3', 'field13']}},
		tV16: { _vid: 'tV16', _flexo: {type: 'modify', scheme: ['testFlexo1_3', 'field14']}},
		tV17: { _vid: 'tV17', _flexo: {type: 'modify', scheme: ['testFlexo1_3', 'field15']}},
		tV18: { _vid: 'tV18', _flexo: {type: 'modify', scheme: ['testFlexo1_3', 'field16']}},

		tV19: { _vid: 'tV19', _flexo: {type: 'delete', scheme: ['testFlexo1_3']} }
	},
	root:'testFlexo1_3'
};
