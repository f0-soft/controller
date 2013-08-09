exports.accessSchemeConfig = {
	//Информация о доступе к flexo документам по роли
	roleFlexo:{
		'manager:customer':{ //role:schemeName
			read: {
				'(all)': 1,
				'name': 0
			},
			modify: {
				'(all)': 1,
				'name': 0
			},
			create: {
				'(all)': 1,
				'name': 0
			},
			delete: 0
		}
	},

	//Информация о сужении и расширении прав доступа к flexo документам
	userFlexo:{
		'sasha:customer':{ //user:schemeName
			read: {
				'(all)': 1,
				'name': 0,
				'inn':0
			},
			modify: {
				'(all)': 1,
				'name': 0,
				'inn':0
			},
			create: {
				'(all)': 1,
				'name': 0,
				'inn':0
			},
			delete: 1
		}
	},

	//Информация о доступе к view по роли
	roleView:{
		'manager:view1':{ //role:viewName
			'customer':{ //flexoSchemeName
				read: {
					'(all)': 1,
					'name': 0,
					'inn':0
				},
				modify: {
					'(all)': 1,
					'name': 0,
					'inn':0
				},
				create: {
					'(all)': 1,
					'name': 0,
					'inn':0
				},
				delete: 1
			}
		}
	},

	//Информация о доступе к view по пользователю
	userView:{
		'sasha:view1':{ //user:viewName
			'customer':{ //flexoSchemeName
				read: {
					'(all)': 1
				},
				modify: {
					'(all)': 1
				},
				create: {
					'(all)': 1
				},
				delete: 1
			}
		}

	}
};
