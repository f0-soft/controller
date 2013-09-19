module.exports = {
	name: 'testUsers',

	root: {
		login: { type: 'string', title:'Логин', description:'Логин пользователя' },
		role: { type: 'string', title:'Роль', description:'Роль пользователя' },
		name: { type: 'string', title:'Имя', description:'Имя пользователя'},
		lastname: { type: 'string', title:'Фамилия', description:'Фамилия пользователя' },
		position:  { type: 'string', title:'Должность', description:'Должность пользователя' },
		company: { type: 'string', title:'Компания', description:'Компания в которой работает пользователь' },
		hash: { type: 'string', title:'Хешь', description:'Хешь' },
		salt: { type: 'string', title:'Соль', description:'Соль' }
	},

	join: {
	}
};

