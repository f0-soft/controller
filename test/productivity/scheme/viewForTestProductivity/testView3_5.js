module.exports = {
	name: 'testView3_5',
	config: {
		tV01: { _vid: 'tV01', _flexo: {type: 'read', scheme: ['testFlexo3_5', '_id']}},
		tV02: { _vid: 'tV02', _flexo: {type: 'read', scheme: ['testFlexo3_5', 'tsUpdate']}},

		tV03: { _vid: 'tV03', _flexo: {type: 'modify', scheme: ['testFlexo3_5', 'field1']}},
		tV04: { _vid: 'tV04', _flexo: {type: 'modify', scheme: ['testFlexo3_5', 'field2']}},
		tV05: { _vid: 'tV05', _flexo: {type: 'modify', scheme: ['testFlexo3_5', 'field3']}},
		tV06: { _vid: 'tV06', _flexo: {type: 'modify', scheme: ['testFlexo3_5', 'field4']}},
		tV07: { _vid: 'tV07', _flexo: {type: 'modify', scheme: ['testFlexo3_5', 'field5']}},
		tV08: { _vid: 'tV08', _flexo: {type: 'modify', scheme: ['testFlexo3_5', 'field6']}},
		tV09: { _vid: 'tV09', _flexo: {type: 'modify', scheme: ['testFlexo3_5', 'field7']}},
		tV10: { _vid: 'tV10', _flexo: {type: 'modify', scheme: ['testFlexo3_5', 'field8']}},
		tV11: { _vid: 'tV11', _flexo: {type: 'modify', scheme: ['testFlexo3_5', 'field9']}},
		tV12: { _vid: 'tV12', _flexo: {type: 'modify', scheme: ['testFlexo3_5', 'field10']}},
		tV13: { _vid: 'tV13', _flexo: {type: 'modify', scheme: ['testFlexo3_5', 'field11']}},
		tV14: { _vid: 'tV14', _flexo: {type: 'modify', scheme: ['testFlexo3_5', 'field12']}},
		tV15: { _vid: 'tV15', _flexo: {type: 'modify', scheme: ['testFlexo3_5', 'field13']}},
		tV16: { _vid: 'tV16', _flexo: {type: 'modify', scheme: ['testFlexo3_5', 'field14']}},
		tV17: { _vid: 'tV17', _flexo: {type: 'modify', scheme: ['testFlexo3_5', 'field15']}},
		tV18: { _vid: 'tV18', _flexo: {type: 'modify', scheme: ['testFlexo3_5', 'field16']}},

		tV19: { _vid: 'tV19', _flexo: {type: 'delete', scheme: ['testFlexo3_5']} }
	},
	root:'testFlexo3_5'
};
