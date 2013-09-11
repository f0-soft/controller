var fs = require('fs');
var Controller = require('./../index.js');
var async = require('async');
var underscore = require('underscore');
var _ = underscore;

//Получаем информацию из конфига, о том требуется ли подключение mock_view
var mock = require('./../config/config.js').mock;

//Словарь используемый для генерации строк
var charString = ['й','ц','у','к','е','н','г','ш','щ',
	'з','з','х','ъ','ф','ы','в','а','п','р','о','л',
	'д','ж','э','я','ч','с','м','и','т','ь','б','ю','Й',
	'Ц','У','К','Е','Н','Г','Ш','Щ','З','Х',
	'Ъ','Ф','Ы','В','А','П','Р','О','Л','Д','Ж','Э',
	'Я','Ч','С','М','И','Т','Ь','Б','Ю','q',
	'w','e','r','t','y','u','i','o','p','a','s','d','f',
	'g','h','j','k','l','z','x','c','v','b','n','m',
	'1','2','3','4','5','6','7','8','9','0','Q',
	'W','E','R','T','Y','U','I','O','P','A','S','D','F',
	'G','H','J','K','L','Z','X','C','V','B','N','M'];

//Имитация глобальной переменной для хранения общих данных о view при view_mock
var testObjGlobalViewsConfig = {
	'testView1': {
		q1:{},
		w2:{},
		e3:{},
		r4:{},
		t5:{},
		y6:{},
		u7:{},
		i8:{},
		o9:{},
		p10:{}
	},
	'testView2': {
		q1:{flexo:['testUsers', 'login'], type:'read'},
		w2:{flexo:['testUsers', 'role'], type:'read'},
		e3:{flexo:['testUsers', 'name'], type:'read'},
		r4:{flexo:['testUsers', 'lastname'], type:'read'},
		t5:{flexo:['testUsers', 'position'], type:'read'},
		y6:{flexo:['testUsers', 'company'], type:'read'},
		u7:{flexo:['testUsers', 'hash'], type:'read'},
		i8:{flexo:['testUsers', 'salt'], type:'read'},
		o9:{flexo:['testUsers', '_id'], type:'read'},
		p10:{flexo:['testUsers', 'tsUpdate'], type:'read'}
	},
	'testView3': {
		a9:{flexo:['testUsers'], type:'create'},
		q8:{flexo:['testUsers', 'login'], type:'create'},
		w7:{flexo:['testUsers', 'role'], type:'create'},
		e6:{flexo:['testUsers', 'name'], type:'create'},
		r5:{flexo:['testUsers', 'lastname'], type:'create'},
		t4:{flexo:['testUsers', 'position'], type:'create'},
		y3:{flexo:['testUsers', 'company'], type:'create'},
		u2:{flexo:['testUsers', 'hash'], type:'create'},
		i1:{flexo:['testUsers', 'salt'], type:'create'}
	},
	'testView4':{
		s10:{flexo:['testUsers', 'tsUpdate'], type:'read'},
		a9:{flexo:['testUsers', '_id'], type:'read'},
		q8:{flexo:['testUsers', 'login'], type:'modify'},
		w7:{flexo:['testUsers', 'role'], type:'modify'},
		e6:{flexo:['testUsers', 'name'], type:'modify'},
		r5:{flexo:['testUsers', 'lastname'], type:'modify'},
		t4:{flexo:['testUsers', 'position'], type:'modify'},
		y3:{flexo:['testUsers', 'company'], type:'modify'},
		u2:{flexo:['testUsers', 'hash'], type:'modify'},
		i1:{flexo:['testUsers', 'salt'], type:'modify'}
	},
	'testView5':{
		q1:{flexo:['testUsers', '_id'], type:'read'},
		w2:{flexo:['testUsers', 'tsUpdate'], type:'read'},
		a9:{flexo:['testUsers'], type:'delete'}
	}
};

//Имитация глобальной переменной с информацией из flexo схем при использовании view_mock
//сигнатура {schemeName:{read:[fieldsNames], modify:[fieldsNames]}
var globalFlexoSchemes = {
	'testUsers': {
		read: ['_id', 'tsUpdate','login', 'role', 'name', 'lastname', 'position', 'company',
			'hash', 'salt'],
		modify: ['login', 'role', 'name', 'lastname', 'position', 'company', 'hash', 'salt'],
		readForAdminPanel:[
			['_id', 'Идентификатор', 'Идентификатор, поле: _id'],
			['tsUpdate', 'Время последнего обновления', 'Время последнего обновления, поле: tsUpdate'],
			['login', 'Логин', 'Логин пользователя, поле: login'],
			['role', 'Роль', 'Роль пользователя, поле: role'],
			['name', 'Имя', 'Имя пользователя, поле: name'],
			['lastname', 'Фамилия', 'Фамилия пользователя, поле: lastname'],
			['position', 'Должность', 'Должность пользователя, поле: position'],
			['company', 'Компания', 'Компания пользователя, поле: company'],
			['hash', 'Хэшь', ''],
			['salt', 'Соль', '']
		],
		modifyForAdminPanel:[
			['login', 'Логин', 'Логин пользователя, поле: login'],
			['role', 'Роль', 'Роль пользователя, поле: role'],
			['name', 'Имя', 'Имя пользователя, поле: name'],
			['lastname', 'Фамилия', 'Фамилия пользователя, поле: lastname'],
			['position', 'Должность', 'Должность пользователя, поле: position'],
			['company', 'Компания', 'Компания пользователя, поле: company'],
			['hash', 'Хэшь', ''],
			['salt', 'Соль', '']
		]
	}
};

//Переменная для хранения экземпляра контролера
var controller;

//Устанавливаем параметр view в конфиг контроллера
var View;
if ( mock.view ) {
	View = require( './../mock/view_mock.js' );
}

//Конфиг контроллера
configForController = {
	redisConfig: {}
};

//Тестирование инициализации контроллера и view
exports.testInit = {
	//Инициализация view
	initView: function(test){

		if( mock.view ) {
			//При использование mock_view
			test.expect( 6 );

			View.init({}, function( err, reply ){
				test.ifError(err);
				test.ok(View.getTemplate);
				test.ok(View.find);
				test.ok(View.insert);
				test.ok(View.modify);
				test.ok(View.delete);
				test.done();
			});
		} else {
			//Без использования mock
			test.expect( 6 );

			var config = {
				pRabbit: require('f0.rabbit'),
				pFlexo: require('f0.flexo'),
				pView: require('f0.view'),
				scheme_flexo: __dirname + '/scheme/flexo/',
				scheme_view: __dirname + '/scheme/view/',
				template: __dirname + '/scheme/template/'
			};

			//Вызывается функция starter, которая соберет необходимую глобальную информацию
			initStarter( config, function( err, res ) {
				test.ifError(err);
				test.ok(View.getTemplate);
				test.ok(View.find);
				test.ok(View.insert);
				test.ok(View.modify);
				test.ok(View.delete);
				test.done();
			} );
		}
	},
	//Инициализация контроллера
	initController: function (test) {
		test.expect( 6 );
		//Добавляем в конфиг контроллера необходимую информацию
		configForController.view = View;
		configForController.flexoSchemes = globalFlexoSchemes;
		configForController.viewConfig = testObjGlobalViewsConfig;

		Controller.init( configForController, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);
			test.ok(Controller.create);
			test.ok(Controller.find);
			test.ok(Controller.delete);
			test.ok(Controller.modify);
			controller = Controller;
			test.done();
		} );
	}
};

var testData1 = {
	testObjAccessFlexo: {
		read: {
			fieldsAdd:[],
			fieldsDel:[]
		},
		modify: {
			fieldsAdd:[],
			fieldsDel:[]
		},
		create: {
			fieldsAdd:[],
			fieldsDel:[]
		},
		createAll: getRandom(0,1),
		delete: getRandom(0,1)
	},
	userLogin: generatorString(1,10),
	userRole: generatorString(1,10),
	flexoSchemeName: 'testUsers'
};

//Тестирование функций админки связанной с flexo правами
exports.adminFunctionForFlexoAccess = {
	//Сохранение flexo прав по пользователю
	saveAccessForUser: function(test){
		test.expect(13);
		//Объект прав пустой
		var objAccess = testData1.testObjAccessFlexo;

		//Логин пользователя
		var login = testData1.userLogin;
		//Название flexo схемы
		var flexoSchemeName = testData1.flexoSchemeName;
		//Описание flexo в глобальном объекте
		var globalFlexo = globalFlexoSchemes[flexoSchemeName];
		//Объект с описанием автора запроса
		var sender = {
			login: testData1.userLogin,
			role: testData1.userRole,
			place: 'nodeunit_test'
		};

		//Формируем объект прав на чтение
		for( var i=0; i<globalFlexo.read.length; i++){
			var access = getRandom(0,1);
			if ( access ) {
				objAccess.read.fieldsAdd.push(globalFlexo.read[i]);
			} else {
				objAccess.read.fieldsDel.push(globalFlexo.read[i]);
			}
		}

		//Формируем объект прав на модификацию
		for( var i=0; i<globalFlexo.modify.length; i++){
			var access = getRandom(0,1);
			if ( access ) {
				objAccess.modify.fieldsAdd.push(globalFlexo.modify[i]);
			} else {
				objAccess.modify.fieldsDel.push(globalFlexo.modify[i]);
			}
		}

		//Формируем объект прав на создание
		for( var i=0; i<globalFlexo.modify.length; i++){
			var access = getRandom(0,1);
			if ( access ) {
				objAccess.create.fieldsAdd.push(globalFlexo.modify[i]);
			} else {
				objAccess.create.fieldsDel.push(globalFlexo.modify[i]);
			}
		}


		//Формируем объект запрос на сохранение
		var queryForSave = {
			access:{
				flexoSchemeName: flexoSchemeName,
				login:login,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			//Формируем объект запрос на чтение сохраненных прав
			var queryForRead = {
				access: {
					flexoSchemeName:flexoSchemeName,
					login:login
				}
			};

			controller.find(queryForRead, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				var keys = Object.keys(reply);
				test.strictEqual(keys.length, 5, 'Проверка количества типов прав возвращаемых ' +
					'в сохраненных flexo правах на пользователя');
				test.strictEqual(reply.read.fieldsAdd.length,
					testData1.testObjAccessFlexo.read.fieldsAdd.length,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.read.fieldsDel.length,
					testData1.testObjAccessFlexo.read.fieldsDel.length,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.modify.fieldsAdd.length,
					testData1.testObjAccessFlexo.modify.fieldsAdd.length,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.modify.fieldsDel.length,
					testData1.testObjAccessFlexo.modify.fieldsDel.length,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.create.fieldsAdd.length,
					testData1.testObjAccessFlexo.create.fieldsAdd.length,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.create.fieldsDel.length,
					testData1.testObjAccessFlexo.create.fieldsDel.length,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.createAll, testData1.testObjAccessFlexo.createAll,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.delete, testData1.testObjAccessFlexo.delete,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.done();
			});
		});

	},
	//Тестируем удаление flexo прав по пользователю
	deleteAccessForUser: function(test){
		test.expect(3);
		//Логин пользователя
		var login = testData1.userLogin;
		//Название flexo схемы
		var flexoSchemeName = testData1.flexoSchemeName;
		//Объект с описанием автора запроса
		var sender = {
			login: testData1.userLogin,
			role: testData1.userRole,
			place: 'nodeunit_test'
		};

		//Формируем объект запрос на удаление
		var queryForDelete = {
			access: {
				flexoSchemeName:flexoSchemeName,
				login:login
			}
		};

		controller.delete(queryForDelete, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			//Формируем объект запрос на чтение удаленных данных
			var queryForRead = {
				access: {
					flexoSchemeName:flexoSchemeName,
					login:login
				}
			};

			controller.find(queryForRead, sender, function( err, reply ) {
				test.ok(err.message, 'No requested object access');
				test.done();
			});
		});
	},
	//Тестируем сохранение flexo прав по роли
	saveAccessForRole:function(test){
		test.expect(13);
		//Обнуляем объект прав
		testData1.testObjAccessFlexo = {};
		//Объект flexo прав по роли
		var objAccess = testData1.testObjAccessFlexo;
		//Роль пользователя
		var role = testData1.userRole;
		//Название flexo схемы
		var flexoSchemeName = testData1.flexoSchemeName;
		//Описание flexo в глобальном объекте
		var globalFlexo = globalFlexoSchemes[flexoSchemeName];
		//Объект с описанием автора запроса
		var sender = {
			login: testData1.userLogin,
			role: testData1.userRole,
			place: 'nodeunit_test'
		};

		//Формируем объект прав на чтение
		var all = getRandom(0,1);
		objAccess.read = {};
		objAccess.read['(all)'] = all;
		objAccess.read.fields = [];
		for( var i=0; i<globalFlexo.read.length; i++){
			var access = getRandom(0,1);
			if ( access ) {
				objAccess.read.fields.push(globalFlexo.read[i]);
			}
		}

		//Формируем объект прав на модификацию
		var all = getRandom(0,1);
		objAccess.modify = {};
		objAccess.modify['(all)'] = all;
		objAccess.modify.fields = [];
		for( var i=0; i<globalFlexo.modify.length; i++){
			var access = getRandom(0,1);
			if ( access ) {
				objAccess.modify.fields.push(globalFlexo.modify[i]);
			}
		}

		//Формируем объект прав на создание
		var all = getRandom(0,1);
		objAccess.create = {};
		objAccess.create['(all)'] = all;
		objAccess.create.fields = [];
		for( var i=0; i<globalFlexo.modify.length; i++){
			var access = getRandom(0,1);
			if ( access ) {
				objAccess.create.fields.push(globalFlexo.modify[i]);
			}
		}

		objAccess.createAll = getRandom(0,1);
		objAccess.delete = getRandom(0,1);

		//Формируем объект запрос на сохранение
		var queryForSave = {
			access:{
				flexoSchemeName: flexoSchemeName,
				role:role,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			//Формируем объект запрос на чтение сохраненных прав
			var queryForRead = {
				access: {
					flexoSchemeName:flexoSchemeName,
					role:role
				}
			};

			controller.find(queryForRead, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				var keys = Object.keys(reply);
				test.strictEqual(keys.length, 5, 'Проверка количества типов прав возвращаемых ' +
					'в сохраненных flexo правах на пользователя');
				test.strictEqual(reply.read.fields.length,
					testData1.testObjAccessFlexo.read.fields.length,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.read['(all)'],
					testData1.testObjAccessFlexo.read['(all)'],
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.modify.fields.length,
					testData1.testObjAccessFlexo.modify.fields.length,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.modify['(all)'],
					testData1.testObjAccessFlexo.modify['(all)'],
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.create.fields.length,
					testData1.testObjAccessFlexo.create.fields.length,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.create['(all)'],
					testData1.testObjAccessFlexo.create['(all)'],
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.createAll, testData1.testObjAccessFlexo.createAll,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.delete, testData1.testObjAccessFlexo.delete,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.done();
			});
		});
	},
	//Тестируем удаление flexo прав по роли
	deleteAccessForRole:function(test){
		test.expect(3);
		//Роль пользователя
		var role = testData1.userRole;
		//Название flexo схемы
		var flexoSchemeName = testData1.flexoSchemeName;
		//Объект с описанием автора запроса
		var sender = {
			login: testData1.userLogin,
			role: testData1.userRole,
			place: 'nodeunit_test'
		};

		//Формируем объект запрос на удаление
		var queryForDelete = {
			access: {
				flexoSchemeName:flexoSchemeName,
				role:role
			}
		};

		controller.delete(queryForDelete, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			//Формируем объект запрос на создание
			var queryForRead = {
				access: {
					flexoSchemeName:flexoSchemeName,
					role:role
				}
			};

			controller.find(queryForRead, sender, function( err, reply ) {
				test.ok(err.message, 'No requested object access');
				test.done();
			});
		});
	}
};

var testData2 = {
	userLogin: generatorString(1,10),
	userRole: generatorString(1,10),
	viewName: 'testView1'
};

//Тестирование функций админки связанной с view правами
exports.adminFunctionForViewAccess = {
	//Сохраняем права на view по пользователю
	saveAccessForUser: function(test){
		test.expect(6);

		//Логин пользователя
		var login = testData2.userLogin;
		//Название view
		var viewName = testData2.viewName;

		//Генерируем объект прав
		var objAccess = {};
		objAccess.viewIdsAdd = [];
		objAccess.viewIdsDel = [];
		//Объект с описанием автора запроса
		var sender = {
			login: testData2.userLogin,
			role: testData2.userRole,
			place: 'nodeunit_test'
		};


		var listOfViewIds = Object.keys(testObjGlobalViewsConfig[viewName]);
		for( var i = 0; i < listOfViewIds.length; i++ ) {
			var access = getRandom(0,1);
			if ( access ) {
				objAccess.viewIdsAdd.push(listOfViewIds[i]);
			} else {
				objAccess.viewIdsDel.push(listOfViewIds[i]);
			}
		}

		//Формируем объект запрос на сохранение
		var queryForSave = {
			access:{
				viewName: viewName,
				login: login,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			//Формируем объект запрос на чтение сохраненных прав на view
			var queryForRead = {
				access: {
					viewName: viewName,
					login: login
				}
			};

			controller.find(queryForRead, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.strictEqual(objAccess.viewIdsAdd.length, reply.viewIdsAdd.length,
					'Проверка количества разрешенных _vids возвращаемых в сохраненных view ' +
						'правах по пользователя');
				test.strictEqual(objAccess.viewIdsDel.length, reply.viewIdsDel.length,
					'Проверка количества неразрешенных _vids возвращаемых в сохраненных view ' +
						'правах по пользователя');

				test.done();
			});
		});

	},
	//Тестируем удаление прав на view по пользователю
	deleteAccessForUser: function(test){
		test.expect(3);
		//Логин пользователя
		var login = testData2.userLogin;
		//Название view
		var viewName = testData2.viewName;
		//Объект с описанием автора запроса
		var sender = {
			login: testData2.userLogin,
			role: testData2.userRole,
			place: 'nodeunit_test'
		};

		//Формируем объект запрос на удаление
		var queryForDelete = {
			access: {
				viewName:viewName,
				login:login
			}
		};

		controller.delete(queryForDelete, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			//Формируем объект запрос на чтение удаленных прав
			var queryForRead = {
				access: {
					viewName:viewName,
					login:login
				}
			};

			controller.find(queryForRead, sender, function( err, reply ) {
				test.ok(err.message, 'No requested object access');
				test.done();
			});
		});
	},
	//Тестируем сохранение view прав по роли
	saveAccessForRole: function(test){
		test.expect(6);

		//Роль пользователя
		var role = testData2.userRole;
		//Название view
		var viewName = testData2.viewName;
		//Объект с описанием автора запроса
		var sender = {
			login: testData2.userLogin,
			role: testData2.userRole,
			place: 'nodeunit_test'
		};

		//Генерируем объект прав
		var objAccess = {};
		objAccess['(all)'] = 1;
		objAccess.viewIds = [];

		var listOfViewIds = Object.keys(testObjGlobalViewsConfig[viewName]);
		for( var i = 0; i < listOfViewIds.length; i++ ) {
			var access = getRandom(0,1);
			if ( !access ) {
				objAccess.viewIds.push(listOfViewIds[i]);
			}
		}

		//Формируем объект запрос на сохранение
		var queryForSave = {
			access:{
				viewName: viewName,
				role: role,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			//Формируем объект запрос на чтение сохраненных прав
			var queryForRead = {
				access: {
					viewName: viewName,
					role: role
				}
			};

			controller.find(queryForRead, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.ok(reply['(all)']);
				test.strictEqual(objAccess.viewIds.length, reply.viewIds.length,
					'Проверка количества разрешенных _vids возвращаемых в сохраненных view ' +
						'правах по пользователя');
				test.done();
			});
		});

	},
	//Тестируем удаление view прав по пользователю
	deleteAccessForRole: function(test){
		test.expect(3);
		//Роль пользователя
		var role = testData2.userRole;
		//Название view
		var viewName = testData2.viewName;
		//Объект с описанием автора запроса
		var sender = {
			login: testData2.userLogin,
			role: testData2.userRole,
			place: 'nodeunit_test'
		};

		//Формируем объект запрос на удаление
		var queryForDelete = {
			access: {
				viewName:viewName,
				role:role
			}
		};

		controller.delete(queryForDelete, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			//Формируем объект запрос на чтение удаленных прав
			var queryForRead = {
				access: {
					viewName:viewName,
					role:role
				}
			};

			controller.find(queryForRead, sender, function( err, reply ) {
				test.ok(err.message, 'No requested object access');
				test.done();
			});
		});
	}
};

var testData3 = {
	objAccessForRole:{}, //Объект прав генерируется в тесте
	objAccessForUser:{}, //Объект прав генерируется в тесте
	userLogin: generatorString(1,10),
	userRole: generatorString(1,10),
	viewName: 'testView1',
	notAllowed_vid:'' //Используется в тестах с спец командами '(all)'
};

//Тестирование определения пересечения прав для view, в view нет идентификаторов связанных с Flexo
exports.viewWithoutFlexo = {
	//Тест при условии, что на view есть права только по роли
	setOnlyRoleAccessForView: {
		//Сохраняем view права по роли
		saveAccessRoleForView: function( test ) {
			test.expect( 2 );
			//Название view
			var viewName = testData3.viewName;
			//Название роли
			var role = testData3.userRole;
			//Объект с правами (пустой)
			var objAccess = testData3.objAccessForRole;
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			//Генерируем объект прав по роли для view (есть разрешения на все идентификаторы)
			var _vids = Object.keys(testObjGlobalViewsConfig[viewName]);
			objAccess['(all)'] = 1;
			objAccess.viewIds = [];

			//Формируем объект запрос на сохранение прав
			var queryForSave = {
				access:{
					viewName: viewName,
					role: role,
					objAccess: objAccess
				}
			};

			controller.create(queryForSave, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);

				test.done();
			});
		},
		//Запрашиваем шаблон, и по прикрепленным к socket списку идентификаторов определяем
		// правильность нахождения разрешенных идентификаторов view
		getTemplateFromView: function( test ) {
			testData3.time = new Date().getTime();
			//Название view
			var viewName = testData3.viewName;
			//Объект сокет
			var socket = {};
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			//Анализируем объект прав и Формируем список разрешенных идентификаторов, по которому
			//будем сверять результат
			var listAllowed_vids = Object.keys(testObjGlobalViewsConfig[viewName]);

			test.expect( ( listAllowed_vids.length + 4 ) );

			controller.getTemplate( viewName, sender, socket, function( err, config, template ) {

				test.ifError(err);
				test.ok(config);
				test.strictEqual(template, '', 'Проверка отсутствия шаблона');

				//Проверяем список идентификаторов сохраненных у объекта socket
				if( socket.view && socket.view[viewName] ){
					test.strictEqual(socket.view[viewName].length, listAllowed_vids.length,
						'Проверяем количество разрешенных идентификаторов view');

					for( var i = 0; i < listAllowed_vids.length; i++ ) {
						var result = underscore.indexOf( socket.view[viewName], listAllowed_vids[i] );
						test.notStrictEqual(result, -1,	'Проверка наличия разрешенного ' +
								'идентификатора view в списке разрашенных у socket' );
					}
				}

				test.done();
			} );
		},
		//Удаление объекта прав view по роли
		deleteAccessRoleForView: function(test){
			test.expect(2);
			//Роль пользователя
			var role = testData3.userRole;
			//Название view
			var viewName = testData3.viewName;
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			//Формируем объект запрос на удаление
			var queryForDelete = {
				access: {
					viewName:viewName,
					role:role
				}
			};

			controller.delete(queryForDelete, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});
		}
	},
	//Тест при условии, что на view есть права только по роли со спец командой '(all)'
	setOnlyRoleAccessWithAllForView:{
		//Сохраняем view права по роли
		saveAccessRoleForView: function( test ) {
			test.expect( 2 );
			//Создаем новый пустой объект прав
			testData3.objAccessForRole = {};
			//Название view
			var viewName = testData3.viewName;
			//Роль пользователя
			var role = testData3.userRole;
			//Объект прав
			var objAccess = testData3.objAccessForRole;
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			//Генерируем объект прав по роли для view
			var _vids = Object.keys(testObjGlobalViewsConfig[viewName]);
			//Указываем что все идентификаторы разрешены
			objAccess['(all)'] = 1;
            //Указываем дополнительно, что один случайный идентификатор запрещен
			var notAllowed_vid = _vids[getRandom(0, ( _vids.length - 1 ) )];
			objAccess.viewIds = [notAllowed_vid];

			testData3.notAllowed_vid = notAllowed_vid;

			//Формируем объект запрос на сохранение прав
			var queryForSave = {
				access:{
					viewName: viewName,
					role: role,
					objAccess: objAccess
				}
			};

			controller.create(queryForSave, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);

				test.done();
			});
		},
		//Запрашиваем шаблон, и по прикрепленным к socket списку идентификаторов определяем
		// правильность нахождения разрешенных идентификаторов view
		getTemplateFromView: function( test ) {
			testData3.time = new Date().getTime();
			//Название view
			var viewName = testData3.viewName;
			//Получаем неразрешенный по правам идентификатор
			var notAllowed_vid = testData3.notAllowed_vid;
			//Объект сокет к кторому будет прикреплен список разрешенных идентификаторов
			var socket = {};
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			//Формируем список разрешенных идентификаторов по объекту прав
			var listAllowed_vids = Object.keys(testObjGlobalViewsConfig[viewName]);

			//Убираем из списка разрешенных идентификаторов один запрещенный
			listAllowed_vids = underscore.without( listAllowed_vids, notAllowed_vid );

			test.expect( ( listAllowed_vids.length + 4 ) );

			controller.getTemplate( viewName, sender, socket, function( err, config, template ) {
				test.ifError(err);
				test.ok(config);
				test.strictEqual(template, '', 'Проверка отсутствия шаблона');

				//Проверяем список идентификаторов сохраненных у объекта socket
				if( socket.view && socket.view[viewName] ){
					test.strictEqual(socket.view[viewName].length, listAllowed_vids.length,
						'Проверяем количество разрешенных идентификаторов view');

					for( var i = 0; i < listAllowed_vids.length; i++ ) {
						var result = underscore.indexOf( socket.view[viewName], listAllowed_vids[i] );
						test.notStrictEqual(result, -1,	'Проверка наличия разрешенного ' +
							'идентификатора view в списке разрашенных у socket' );
					}
				}

				test.done();
			} );
		},
		//Проверяем были ли ошибки целостности
		checkErrorWithLossIntegrity: function ( test ) {
			test.expect( 2 );
			var min = testData3.time;
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			controller.findErrorLogging({min:min}, sender, function ( err, replies ) {
				test.ifError(err);
				test.strictEqual(replies.length, 0, 'Проверяем количество ошибок целостности');
				test.done();
			});
		},
		//Удаляем view права по роли
		deleteAccessRoleForView: function(test){
			test.expect(2);
			//Роль пользователя
			var role = testData3.userRole;
			//Название view
			var viewName = testData3.viewName;
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			//Формируем объект запрос на удаление
			var queryForDelete = {
				access: {
					viewName:viewName,
					role:role
				}
			};

			controller.delete(queryForDelete, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});
		}
	},
	//Тест при условии, что на view есть права только по пользователю
	setOnlyUserAccessForView:{
		//Сохраняем view права по пользователю
		saveAccessUserForView: function( test ) {
			test.expect( 2 );
			//Название view
			var viewName = testData3.viewName;
			//Логин пользователя
			var login = testData3.userLogin;
			//Объект прав для view по пользователю
			var objAccess = testData3.objAccessForUser;
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			//Генерируем объект прав по роли для view
			var _vids = Object.keys(testObjGlobalViewsConfig[viewName]);

			objAccess.viewIdsAdd = [];
			objAccess.viewIdsDel = [];

			for( var i = 0; i < _vids.length; i++ ) {
				var access = getRandom(0,1);
				if ( access ) {
					objAccess.viewIdsAdd.push( _vids[i] );
				} else {
					objAccess.viewIdsDel.push( _vids[i] );
				}
			}

			//Формируем объект запрос на сохранение прав
			var queryForSave = {
				access:{
					viewName: viewName,
					login: login,
					objAccess: objAccess
				}
			};

			controller.create(queryForSave, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);

				test.done();
			});
		},
		//Запрашиваем шаблон, и по прикрепленным к socket списку идентификаторов определяем
		// правильность нахождения разрешенных идентификаторов view
		getTemplateFromView: function( test ) {
			testData3.time = new Date().getTime();
			//Название view
			var viewName = testData3.viewName;
			//Объект view прав по пользователю
			var objAccess = testData3.objAccessForUser;
			//Объект socket
			var socket = {};
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			//Формируем список разрешенных идентификаторов по объекту прав для будущего сравнения с
			//результами прикрепленными к socket
			var listAllowed_vids = objAccess.viewIdsAdd;

			test.expect( ( listAllowed_vids.length + 4 ) );

			controller.getTemplate( viewName, sender, socket, function( err, config, template ) {
				test.ifError(err);
				test.ok(config);
				test.strictEqual(template, '', 'Проверка отсутствия шаблона');

				//Проверяем список идентификаторов сохраненных у объекта socket
				if( socket.view && socket.view[viewName] ){
					test.strictEqual(socket.view[viewName].length, listAllowed_vids.length,
						'Проверяем количество разрешенных идентификаторов view');

					for( var i = 0; i < listAllowed_vids.length; i++ ) {
						var result = underscore.indexOf( socket.view[viewName], listAllowed_vids[i] );
						test.notStrictEqual(result, -1,	'Проверка наличия разрешенного ' +
							'идентификатора view в списке разрашенных у socket' );
					}
				}

				test.done();
			} );
		},
		//Проверяем были ли ошибки целостности
		checkErrorWithLossIntegrity: function ( test ) {
			test.expect( 2 );
			var min = testData3.time;
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			controller.findErrorLogging({min:min}, sender, function ( err, replies ) {
				test.ifError(err);
				test.strictEqual(replies.length, 0, 'Проверяем количество ошибок целостности');
				test.done();
			});
		},
		//Удаляем view права по пользователю
		deleteAccessUserForView: function(test){
			test.expect(2);
			//Логин пользователя
			var login = testData3.userLogin;
			//Название iew
			var viewName = testData3.viewName;
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			//Формируем объект запрос на удаление
			var queryForDelete = {
				access: {
					viewName:viewName,
					login:login
				}
			};

			controller.delete(queryForDelete, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});
		}
	},
	//Тест при условии, что на view есть права по пользователю cо спец командой '(all)'
	setOnlyUserAccessWithAllForView:{
		saveAccessUserForView: function( test ) {
			test.expect( 2 );
			//Создаем новый пустой объект прав для view по пользователю
			testData3.objAccessForUser = {};
			//Название view
			var viewName = testData3.viewName;
			//Логин пользователя
			var login = testData3.userLogin;
			//Объект прав для view
			var objAccess = testData3.objAccessForUser;
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			//Генерируем объект прав по роли для view
			var _vids = Object.keys(testObjGlobalViewsConfig[viewName]);
			//Указываем что все идентификаторы разрешены
			objAccess['(all)'] = 1;
			//Указываем дополнительно, что один идентификатор запрещен
			var notAllowed_vid = _vids[getRandom(0, ( _vids.length - 1 ) )];
			objAccess.viewIdsDel = [notAllowed_vid];
			objAccess.viewIdsAdd = [];

			testData3.notAllowed_vid = notAllowed_vid;

			//Формируем объект запрос на сохранение прав
			var queryForSave = {
				access:{
					viewName: viewName,
					login: login,
					objAccess: objAccess
				}
			};

			controller.create(queryForSave, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);

				test.done();
			});
		},
		//Запрашиваем шаблон, и по прикрепленным к socket списку идентификаторов определяем
		// правильность нахождения разрешенных идентификаторов view
		getTemplateFromView: function( test ) {
			testData3.time = new Date().getTime();
			//Название view
			var viewName = testData3.viewName;
			//Роль пользователя
			var role = testData3.userRole;
			//Логин пользователя
			var user = testData3.userLogin;
			//Неразрешенный идентификатор по правам на view
			var notAllowed_vid = testData3.notAllowed_vid;
			//Объект сокет
			var socket = {};
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			//Формируем список разрешенных идентификаторов по объекту прав
			var listAllowed_vids = Object.keys(testObjGlobalViewsConfig[viewName]);

			//Убираем из списка разрешенных идентификаторов один запрещенный
			listAllowed_vids = underscore.without( listAllowed_vids, notAllowed_vid );

			test.expect( ( listAllowed_vids.length + 4 ) );

			controller.getTemplate( viewName, sender, socket, function( err, config, template ) {
				test.ifError(err);
				test.ok(config);
				test.strictEqual(template, '', 'Проверка отсутствия шаблона');

				//Проверяем список идентификаторов сохраненных у объекта socket
				if( socket.view && socket.view[viewName] ){
					test.strictEqual(socket.view[viewName].length, listAllowed_vids.length,
						'Проверяем количество разрешенных идентификаторов view');

					for( var i = 0; i < listAllowed_vids.length; i++ ) {
						var result = underscore.indexOf( socket.view[viewName], listAllowed_vids[i] );
						test.notStrictEqual(result, -1,	'Проверка наличия разрешенного ' +
							'идентификатора view в списке разрашенных у socket' );
					}
				}

				test.done();
			} );
		},
		//Проверяем были ли ошибки целостности
		checkErrorWithLossIntegrity: function ( test ) {
			test.expect( 2 );
			var min = testData3.time;
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			controller.findErrorLogging({min:min}, sender, function ( err, replies ) {
				test.ifError(err);
				test.strictEqual(replies.length, 0, 'Проверяем количество ошибок целостности');
				test.done();
			});
		},
		//Удаляем view права по пользователю
		deleteAccessUserForView: function(test){
			test.expect(2);
			//Логин пользоватеоля
			var login = testData3.userLogin;
			//Название пользователя
			var viewName = testData3.viewName;
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			//Формируем объект запрос на удаление
			var queryForDelete = {
				access: {
					viewName:viewName,
					login:login
				}
			};

			controller.delete(queryForDelete, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});
		}
	},
	//Тест при условии, что на view есть права и по роли и по пользователю
	setRoleAndUserAccessForView:{
		//Сохраняем view права по роли и по пользователю
		saveAccessUserAndRoleForView: function( test ) {
			test.expect( 4 );
			//Название view
			var viewName = testData3.viewName;
			//Роль пользователя
			var role = testData3.userRole;
			//Логин пользователя
			var login = testData3.userLogin;
			//Создаем пустой объект view прав по роли
			testData3.objAccessForRole = {};
			//Создаем пустой объект view прав по пользователю
			testData3.objAccessForUser = {};
			//Объект view прав по роли
			var objAccessRole = testData3.objAccessForRole;
			//Объект view прав по пользователю
			var objAccessUser = testData3.objAccessForUser;
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			//Генерируем объект прав по роли и по пользователю для view
			var _vids = Object.keys(testObjGlobalViewsConfig[viewName]);

			objAccessRole['(all)'] = 1;
			objAccessRole.viewIds = [];
			objAccessUser.viewIdsAdd = [];
			objAccessUser.viewIdsDel = [];

			for( var i = 0; i < _vids.length; i++ ) {
				var access = getRandom(0,1);
				if ( access ) {
					objAccessUser.viewIdsAdd.push(_vids[i]);
				} else {
					objAccessUser.viewIdsDel.push(_vids[i]);
				}
			}

			//Формируем объект запрос на сохранение прав
			var queryForSave = {
				access:{
					viewName: viewName,
					role: role,
					objAccess: objAccessRole
				}
			};

			controller.create(queryForSave, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);

				//Формируем объект запрос на сохранение прав
				var queryForSave = {
					access:{
						viewName: viewName,
						login: login,
						objAccess: objAccessUser
					}
				};

				controller.create(queryForSave, sender, function( err, reply ) {
					test.ifError(err);
					test.ok(reply);

					test.done();
				});
			});
		},
		//Запрашиваем шаблон, и по прикрепленным к socket списку идентификаторов определяем
		// правильность нахождения разрешенных идентификаторов view
		getTemplateFromView: function( test ) {
			testData3.time = new Date().getTime();
			//Название view
			var viewName = testData3.viewName;
			//Название роли
			var role = testData3.userRole;
			//Название пользователя
			var user = testData3.userLogin;
			//Объект view прав по роли
			var objAccessRole = testData3.objAccessForRole;
			//Объект view прав по пользователю
			var objAccessUser = testData3.objAccessForUser;
			//Объект сокет
			var socket = {};
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			//Формируем список разрешенных идентификаторов по объекту прав
			var _vidsFromRole = Object.keys(testObjGlobalViewsConfig[viewName]);

			//Общий список разрешенных идентификаторов
			var listAllowed_vids = [];

			//Пересекаем права на view
			listAllowed_vids = underscore.union(_vidsFromRole, objAccessUser.viewIdsAdd);
			listAllowed_vids = underscore.difference(listAllowed_vids, objAccessUser.viewIdsDel);

			test.expect( ( listAllowed_vids.length + 4 ) );

			controller.getTemplate( viewName, sender, socket, function( err, config, template ) {
				test.ifError(err);
				test.ok(config);
				test.strictEqual(template, '', 'Проверка отсутствия шаблона');

				//Проверяем список идентификаторов сохраненных у объекта socket
				if( socket.view && socket.view[viewName] ){
					test.strictEqual(socket.view[viewName].length, listAllowed_vids.length,
						'Проверяем количество разрешенных идентификаторов view');

					for( var i = 0; i < listAllowed_vids.length; i++ ) {
						var result = underscore.indexOf( socket.view[viewName], listAllowed_vids[i] );
						test.notStrictEqual(result, -1,	'Проверка наличия разрешенного ' +
							'идентификатора view в списке разрашенных у socket' );
					}
				}

				test.done();
			} );
		},
		//Проверяем были ли ошибки целостности
		checkErrorWithLossIntegrity: function ( test ) {
			test.expect( 2 );
			var min = testData3.time;
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			controller.findErrorLogging({min:min}, sender, function ( err, replies ) {
				test.ifError(err);
				test.strictEqual(replies.length, 0, 'Проверяем количество ошибок целостности');
				test.done();
			});
		},
		//Удаляем view права по пользователю и по роли на view
		deleteAccessUserAndRoleForView:function(test){
			test.expect(4);
			var role = testData3.userRole;
			var login = testData3.userLogin;
			var viewName = testData3.viewName;
			//Объект с описанием автора запроса
			var sender = {
				login: testData3.userLogin,
				role: testData3.userRole,
				place: 'nodeunit_test'
			};

			//Формируем объект запрос на удаление прав по пользователю
			var queryForDelete = {
				access: {
					viewName:viewName,
					login:login
				}
			};

			controller.delete(queryForDelete, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);

				//Формируем объект запрос на удаление прав по роли
				var queryForDelete = {
					access: {
						viewName:viewName,
						role:role
					}
				};

				controller.delete(queryForDelete, sender, function( err, reply ) {
					test.ifError(err);
					test.ok(reply);
					test.done();
				});
			});
		}
	}
};


var testData4 = { //Наполняется генератором в тесте
	userLogin: generatorString(1,10),
	userRole: generatorString(1,10),
	flexoSchemeName: 'testUsers',
	testRead:{
		testObjAccessFlexo: {
			read: {}
		},
		viewNameForRead: 'testView2',
		testObjViewAccess: {},
		socket:{},
		listAllowed_vids:[],
		listNotAllowed_vids:[]
	}
};

//Тестирование определения пересечения прав для view для запросов на чтение, в view
// идентификаторы связанны с Flexo
exports.viewWithFlexoReadAccess = {
	//Сохраняем flexo права по роли
	saveFlexoReadAccessOnlyForRole: function(test){

		test.expect( 2 );
		//Объект flexo прав по роли
		var objAccess = testData4.testRead.testObjAccessFlexo;
		//Роль пользователя
		var role = testData4.userRole;
		//Название flexo схемы
		var flexoSchemeName = testData4.flexoSchemeName;
		//Объект с описанием автора запроса
		var sender = {
			login: testData4.userLogin,
			role: testData4.userRole,
			place: 'nodeunit_test'
		};


		//Генерируем права на чтение (все идентификаторы доступны для чтения кроме одного
		// случайного)
		var notAccess = getRandom(0, (globalFlexoSchemes[flexoSchemeName].read.length - 1) );

		objAccess.read['(all)'] = 1;
		objAccess.read.fields = [globalFlexoSchemes[flexoSchemeName].read[notAccess]];

		//Формируем запрос на сохранение прав по поли для flexo схемы
		var queryForSave = {
			access:{
				flexoSchemeName: flexoSchemeName,
				role:role,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);
			test.done();
		});

	},
	//Сохраняем view права по роли
	saveViewAccessOnlyForRole: function(test){
		test.expect( 2 );
	   	//Объект view прав по роли
		var objAccess = testData4.testRead.testObjViewAccess;
		//Роли пользователя
		var role = testData4.userRole;
		//Название view
		var viewName = testData4.testRead.viewNameForRead;
		//Объект с описанием автора запроса
		var sender = {
			login: testData4.userLogin,
			role: testData4.userRole,
			place: 'nodeunit_test'
		};

		//Наполняем разрешениями view (все идентификаторы из глобальной переменной разрешены на
		// чтение)
		objAccess['(all)'] = 1;
		objAccess.viewIds = [];


		//Формируем объект запрос на сохранение прав
		var queryForSave = {
			access:{
				viewName: viewName,
				role: role,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);
			test.done();
		});
	},
	//Запрашиваем шаблон, и по прикрепленным к socket списку идентификаторов определяем
	// правильность нахождения разрешенных идентификаторов view
	getTemplateFromView: function(test){
		//Время начала теста (используется для запроса залогированных ошибок)
		testData4.time = new Date().getTime();
		//Объект сокета
		var socket = testData4.testRead.socket;
		//Название view
		var viewName = testData4.testRead.viewNameForRead;
		//Объект с flexo правами по роли на чтение
		var objFlexoReadAccess = testData4.testRead.testObjAccessFlexo.read;
		//Ссылка на глобальный объект с описанием view
		var globalViewConfig = testObjGlobalViewsConfig[viewName];
		//Название flexo схемы
		var flexoSchemeName = testData4.flexoSchemeName;
		//Объект с описанием автора запроса
		var sender = {
			login: testData4.userLogin,
			role: testData4.userRole,
			place: 'nodeunit_test'
		};

		//Определяем перечень разрешенных идентификаторов view
		var listAllowed_vids = Object.keys(globalViewConfig);


		//Сверяем разрещения на чтение по _vids
		var list_vidsForRemove = [];
		var fieldsForRead = _.difference(globalFlexoSchemes[flexoSchemeName].read,
			objFlexoReadAccess.fields);
		for( var i = 0; i < listAllowed_vids.length; i++ ){
			if( globalViewConfig[listAllowed_vids[i]].flexo.length !== 0 ){
				var field = globalViewConfig[listAllowed_vids[i]].flexo[1];
				var type = globalViewConfig[listAllowed_vids[i]].type;
				var index = underscore.indexOf( fieldsForRead, field );
				if ( index === -1 || type !== 'read' ||
					objFlexoReadAccess[fieldsForRead[index]] === 0){
					list_vidsForRemove.push(listAllowed_vids[i]);
				}
			}
		}
		//Список разрешенных идентификаторов view
		listAllowed_vids = underscore.difference(listAllowed_vids, list_vidsForRemove);
		//Список разрешенных идентификаторов view
		testData4.testRead.listAllowed_vids = listAllowed_vids;
		//Список неразрешенных идентификаторов view
		testData4.testRead.listNotAllowed_vids = list_vidsForRemove;

		test.expect( ( listAllowed_vids.length + 4 ) );

		controller.getTemplate( viewName, sender, socket, function( err, config, template ) {

			test.ifError(err);
			test.ok(config);
			test.strictEqual(template, '', 'Проверка отсутствия шаблона');

			//Проверяем список идентификаторов сохраненных у объекта socket
			if( socket.view && socket.view[viewName] ){
				test.strictEqual(socket.view[viewName].length, listAllowed_vids.length,
					'Проверяем количество разрешенных идентификаторов view');

				for( var i = 0; i < listAllowed_vids.length; i++ ) {
					var result = underscore.indexOf( socket.view[viewName], listAllowed_vids[i] );
					test.notStrictEqual(result, -1,	'Проверка наличия разрешенного ' +
						'идентификатора view в списке разрашенных у socket' );
				}
			}

			test.done();
		} );
	},
	//Проверяем были ли ошибки целостности
	checkErrorWithLossIntegrity: function ( test ) {
		test.expect( 2 );
		//Нижния граница временного интервала выбора ошибок в милисекундах
       	var min = testData4.time;
		//Объект с описанием автора запроса
		var sender = {
			login: testData4.userLogin,
			role: testData4.userRole,
			place: 'nodeunit_test'
		};

		controller.findErrorLogging({min:min}, sender, function ( err, replies ) {
			test.ifError(err);
			test.strictEqual(replies.length, 0, 'Проверяем количество ошибок целостности');
			test.done();
		});
	},
	//Тестируем запросы на чтение
	queryToRead: {
		//Запрос содержит разрешенные идентификаторы в свойстве selector и sort объекта запроса
		allowed_vidsInSelectorAndSort: function(test) {
			test.expect( 2 );
			//Название view
			var viewName = testData4.testRead.viewNameForRead;
			//Объект сокет с прикрепленным списком разрешенных идентификаторов
			var socket = testData4.testRead.socket;
			//Список разрешенных идентификаторов
			var allowedListOf_vids = testData4.testRead.listAllowed_vids;
			//Объект с описанием автора запроса
			var sender = {
				login: testData4.userLogin,
				role: testData4.userRole,
				place: 'nodeunit_test'
			};

			//Выбираем случайно два резрешенных идентификатора для составления запроса на чтение
			var randFieldForSelector =
				allowedListOf_vids[getRandom(0, (allowedListOf_vids.length - 1))];
			var randFieldForSort =
				allowedListOf_vids[getRandom(0, (allowedListOf_vids.length - 1))];

			//Формируем запрос на чтение
			var request = {};
			request['selector'] = {};
			request['selector'][randFieldForSelector] = generatorString(1,10);
			request['options'] = {};
			request['options']['sort'] = {};
			request['options']['sort'][randFieldForSort] = getRandom(0,1);

			controller.queryToView ( 'read', sender, request, viewName, socket, function(err, reply) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});
		},
		//Запрос на чтение содержит неразрешенный идентификатор view в свойстве selector
		// объекта запроса
		notAllowed_vidInSelector: function(test){
			test.expect( 1 );
			//Название view
			var viewName = testData4.testRead.viewNameForRead;
			//Объект сокет с прикрепленным списком разрешенных идентификаторов
			var socket = testData4.testRead.socket;
			//Список разрешенных идентификаторов
			var allowedListOf_vids = testData4.testRead.listAllowed_vids;
			//Список неразрешенных идентификаторов
			var notAllowedListOf_vids = testData4.testRead.listNotAllowed_vids;
			//Объект с описанием автора запроса
			var sender = {
				login: testData4.userLogin,
				role: testData4.userRole,
				place: 'nodeunit_test'
			};

			//Выбираем случайно неразрешенный идентификатор для ствойства selector и разрешенный
			// для свойства sort объекта запроса на чтение
			var randFieldForSelector =
				notAllowedListOf_vids[getRandom(0, (notAllowedListOf_vids.length - 1))];
			var randFieldForSort =
				allowedListOf_vids[getRandom(0, (allowedListOf_vids.length - 1))];

			//Формируем запрос на чтение
			var request = {};
			request['selector'] = {};
			request['selector'][randFieldForSelector] = generatorString(1,10);
			request['options'] = {};
			request['options']['sort'] = {};
			request['options']['sort'][randFieldForSort] = getRandom(0,1);

			controller.queryToView ( 'read', sender, request, viewName, socket, function(err, reply) {
				test.strictEqual(err.message, 'Controller: No permission to read in view');
				test.done();
			});
		},
		//Запрос на чтение содержит неразрешенный идентификатор view в свойстве sort
		// объекта запроса
		notAllowed_vidInSort: function(test){
			test.expect( 1 );
			//Название view
			var viewName = testData4.testRead.viewNameForRead;
			//Объект сокет с прикрепленным списком разрешенных идентификаторов
			var socket = testData4.testRead.socket;
			//Список разрешенных идентификаторов
			var allowedListOf_vids = testData4.testRead.listAllowed_vids;
			//Список неразрешенных идентификаторов
			var notAllowedListOf_vids = testData4.testRead.listNotAllowed_vids;
			//Объект с описанием автора запроса
			var sender = {
				login: testData4.userLogin,
				role: testData4.userRole,
				place: 'nodeunit_test'
			};

			//Выбираем случайно разрешенный идентификатор для ствойства selector и неразрешенный
			// для свойства sort объекта запроса на чтение
			var randFieldForSelector =
				allowedListOf_vids[getRandom(0, (allowedListOf_vids.length - 1))];
			var randFieldForSort =
				notAllowedListOf_vids[getRandom(0, (notAllowedListOf_vids.length - 1))];

			//Формируем запрос на чтение
			var request = {};
			request['selector'] = {};
			request['selector'][randFieldForSelector] = generatorString(1,10);
			request['options'] = {};
			request['options']['sort'] = {};
			request['options']['sort'][randFieldForSort] = getRandom(0,1);

			controller.queryToView ( 'read', sender, request, viewName, socket, function(err, reply) {
				test.strictEqual(err.message, 'Controller: No permission to read in view');
				test.done();
			});
		}
	},
	//Удаляем flexo и view права по роли
	deleteFlexoAndViewAccess: function(test){
		test.expect( 4 );
		//Роль пользователя
		var role = testData4.userRole;
		//Название view
		var viewName = testData4.testRead.viewNameForRead;
		//Название flexo
		var flexoSchemeName = testData4.flexoSchemeName;
		//Объект с описанием автора запроса
		var sender = {
			login: testData4.userLogin,
			role: testData4.userRole,
			place: 'nodeunit_test'
		};

		//Формируем объект запрос на удаление view прав по роли
		var queryForDelete = {
			access: {
				viewName:viewName,
				role:role
			}
		};

		controller.delete(queryForDelete, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			//Формируем объект запрос на удаление flexo прав по роли
			var queryForDelete = {
				access: {
					flexoSchemeName:flexoSchemeName,
					role:role
				}
			};

			controller.delete(queryForDelete, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});
		});
	}
};

var testData5 = {
	userLogin: generatorString(1,10),
	userRole: generatorString(1,10),
	flexoSchemeName: 'testUsers',
	testCreate:{
		testObjAccessFlexo: {
			create: {}
		},
		viewNameForCreate: 'testView3',
		testObjViewAccess: {},
		socket:{},
		listAllowed_vids:[],
		listNotAllowed_vids:[],
		listNotFlexo_vids:[]
	}
};

//Тестирование определения пересечения прав для view для запросов на создание, в view
// идентификаторы связанны с Flexo, и один идентификатор связан с flexo но не связан с flexo полем
exports.viewWithFlexoCreateAccess = {
	//Сохраняем flexo права на создание по пользователю
	saveFlexoCreateAccessOnlyForUser: function(test){
		test.expect( 2 );

		//Объект flexo прав по пользователю
		var objAccess = testData5.testCreate.testObjAccessFlexo;
		//Логин пользователя
		var login = testData5.userLogin;
		//Название flexo схемы
		var flexoSchemeName = testData5.flexoSchemeName;
		//Объект с описанием автора запроса
		var sender = {
			login: testData5.userLogin,
			role: testData5.userRole,
			place: 'nodeunit_test'
		};


		//Генерируем права на создание (всем flexo полям из глобального конфига есть доступ на
		//создание, кроме одного случайного выбранного
		var notAccess = getRandom(0, (globalFlexoSchemes[flexoSchemeName].modify.length - 1) );

		objAccess.create['(all)'] = 1;
		objAccess.create.fieldsAdd = [];
		objAccess.create.fieldsDel = [globalFlexoSchemes[flexoSchemeName].modify[notAccess]];

		//Разрешение на создание документа в целом на схему (используется например для кнопок формы
		// отображение которых зависит от наличия права создания целиком на схему)
		objAccess.createAll = 1;

		//Формируем запрос на сохранение прав по пользователю для flexo схемы
		var queryForSave = {
			access:{
				flexoSchemeName: flexoSchemeName,
				login:login,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);
			test.done();
		});

	},
	//Сохраняем view права по пользователю
	saveViewAccessOnlyForUser: function(test){
		test.expect( 2 );
		//Объект view прав по пользователю
		var objAccess = testData5.testCreate.testObjViewAccess;
		//Логин пользователя
		var login = testData5.userLogin;
		//Название view
		var viewName = testData5.testCreate.viewNameForCreate;
		//Объект с описанием автора запроса
		var sender = {
			login: testData5.userLogin,
			role: testData5.userRole,
			place: 'nodeunit_test'
		};

		//Наполняем разрешениями view (разрешены все идентификаторы входящие в глобальное описание
		// данной view
        objAccess['(all)'] = 1;
		objAccess.viewIdsAdd = [];
		objAccess.viewIdsDel = [];

		//Формируем объект запрос на сохранение прав
		var queryForSave = {
			access:{
				viewName: viewName,
				login: login,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);
			test.done();
		});
	},
	//Запрашиваем шаблон, и по прикрепленным к socket списку идентификаторов определяем
	// правильность нахождения разрешенных идентификаторов view
	getTemplateFromView: function(test){
		//Время начала теста (используется для запроса залогированных ошибок)
		testData5.time = new Date().getTime();
		//Объект сокет
		var socket = testData5.testCreate.socket;
		//Название view
		var viewName = testData5.testCreate.viewNameForCreate;
		//Объект flexo прав на создание по пользователю
		var objFlexoCreateAccess = testData5.testCreate.testObjAccessFlexo.create;
		//Числовое значение flexo права на создание документа в целом по пользователю
		var objFlexoCreateAllAccess = testData5.testCreate.testObjAccessFlexo.createAll;
		//Ссылка на глобальный view конфиг для данной view
		var globalViewConfig = testObjGlobalViewsConfig[viewName];
		//Название flexo схемы
		var flexoSchemeName = testData5.flexoSchemeName;
		//Объект с описанием автора запроса
		var sender = {
			login: testData5.userLogin,
			role: testData5.userRole,
			place: 'nodeunit_test'
		};

		//Определяем перечень разрешенных идентификаторов view
		var listAllowed_vids = Object.keys(globalViewConfig);

		//Сверяем разрещения на создание по _vids
		var list_vidsForRemove = []; //список неразрешенных идентификаторов
		var listNotFlexo_vids = []; //список идентификаторов не связанных с flexo полями
		var fieldsForCreate = _.difference(globalFlexoSchemes[flexoSchemeName].modify,
			objFlexoCreateAccess.fieldsDel);
		for( var i = 0; i < listAllowed_vids.length; i++ ){

			if( globalViewConfig[listAllowed_vids[i]].flexo.length !== 0 ){
				if( globalViewConfig[listAllowed_vids[i]].flexo.length === 1){
					if (objFlexoCreateAllAccess &&
						globalViewConfig[listAllowed_vids[i]].type === 'create'){
						listNotFlexo_vids.push(listAllowed_vids[i]);
					}
				} else {
					var field = globalViewConfig[listAllowed_vids[i]].flexo[1];
					var type = globalViewConfig[listAllowed_vids[i]].type;
					var index = underscore.indexOf( fieldsForCreate, field );
					if ( index === -1 || type !== 'create' ||
						objFlexoCreateAccess[fieldsForCreate[index]] === 0){
						list_vidsForRemove.push(listAllowed_vids[i]);
					}
				}
			}
		}
		//Формируем список разрешенных идентификаторов
		listAllowed_vids = underscore.difference(listAllowed_vids, list_vidsForRemove);
		//Сохраняем список разрешенных идентификаторов
		testData5.testCreate.listAllowed_vids = listAllowed_vids;
		//Сохраняем список неразрешенных идентификаторов
		testData5.testCreate.listNotAllowed_vids = list_vidsForRemove;
		//Сохраняем список идентификаторов не связанных с flexo полями
		testData5.testCreate.listNotFlexo_vids = listNotFlexo_vids;

		test.expect( ( listAllowed_vids.length + 4 ) );

		controller.getTemplate( viewName, sender, socket, function( err, config, template ) {
			test.ifError(err);
			test.ok(config);
			test.strictEqual(template, '', 'Проверка отсутствия шаблона');

			//Проверяем список идентификаторов сохраненных у объекта socket
			if( socket.view && socket.view[viewName] ){
				test.strictEqual(socket.view[viewName].length, listAllowed_vids.length,
					'Проверяем количество разрешенных идентификаторов view');

				for( var i = 0; i < listAllowed_vids.length; i++ ) {
					var result = underscore.indexOf( socket.view[viewName], listAllowed_vids[i] );
					test.notStrictEqual(result, -1,	'Проверка наличия разрешенного ' +
						'идентификатора view в списке разрашенных у socket' );
				}
			}

			test.done();
		} );

	},
	//Проверяем были ли ошибки целостности
	checkErrorWithLossIntegrity: function ( test ) {
		test.expect( 2 );
		//Нижния граница временного интервала выбора ошибок в милисекундах
		var min = testData5.time;
		//Объект с описанием автора запроса
		var sender = {
			login: testData5.userLogin,
			role: testData5.userRole,
			place: 'nodeunit_test'
		};

		controller.findErrorLogging({min:min}, sender, function ( err, replies ) {
			test.ifError(err);
			test.strictEqual(replies.length, 0, 'Проверяем количество ошибок целостности');
			test.done();
		});
	},
	//Тестируем запросы на создание документов
	queryToCreate:{
		//Запрос на создание использующий разрешенные идентификаторы
		allowed_vidsInQueries: function( test ) {
			//Название view
			var viewName = testData5.testCreate.viewNameForCreate;
			//Объект сокет с прикрепленным списком разрешенных идентификаторов
			var socket = testData5.testCreate.socket;
			//Список разрешенных идентификаторов
			var listAllowed_vids = testData5.testCreate.listAllowed_vids;
			//Список идентификаторов не связанных с flexo полями
			var listNotFlexo_vids = testData5.testCreate.listNotFlexo_vids;
			//Список идентификаторов связанных с flexo полями
			var listAllowed_vidsWithFlexo =
				underscore.difference(listAllowed_vids, listNotFlexo_vids);
			//Объект с описанием автора запроса
			var sender = {
				login: testData5.userLogin,
				role: testData5.userRole,
				place: 'nodeunit_test'
			};

			//Формируем запрос на создание
			var queryToCreate = [{}];

			for(var i=0; i<listAllowed_vidsWithFlexo.length; i++){
				queryToCreate[0][listAllowed_vidsWithFlexo[i]] = getRandom(0, 10000);
			}

			test.expect( listAllowed_vidsWithFlexo.length + 2 );

			controller.queryToView ( 'create', sender, queryToCreate, viewName, socket,
				function(err, reply) {

				test.ifError(err);
				var _vids = Object.keys(reply[0]);

				test.strictEqual(_vids.length, listAllowed_vidsWithFlexo.length,
					'Проверяем количество возвращенных идентификаторов view');

				for( var i = 0; i < _vids.length; i++ ) {
					var result = underscore.indexOf( listAllowed_vidsWithFlexo, _vids[i] );
					test.notStrictEqual(result, -1,	'Сравнение возвращенных ' +
						'идентификаторов с сохраненными идентификаторами view ' );
				}

				test.done();
			});
		},
		//Запрос на создание использующий разрешенные и не разрешенный идентификаторы
		notAllowed_vidsInQueries: function( test ) {
			test.expect( 1 );
			//Название view
			var viewName = testData5.testCreate.viewNameForCreate;
			//Объект сокет с прикрепленным списком разрешенных идентификаторов
			var socket = testData5.testCreate.socket;
			//Список разрешенных идентификаторов
			var listAllowed_vids = testData5.testCreate.listAllowed_vids;
			//Список идентификаторов не связанных с flexo полями
			var listNotFlexo_vids = testData5.testCreate.listNotFlexo_vids;
			//Список идентификаторов не разрешенных
			var listNotAllowed_vids = testData5.testCreate.listNotAllowed_vids;
			//Список разрешенных идентификаторов связанных с flexo полями
			var listAllowed_vidsWithFlexo =
				underscore.difference(listAllowed_vids, listNotFlexo_vids);
			//Объект с описанием автора запроса
			var sender = {
				login: testData5.userLogin,
				role: testData5.userRole,
				place: 'nodeunit_test'
			};

			//Формируем запрос на создание
			var queryToCreate = [{}];
			//Добавляем в запрос разрешенные идентификаторы связанные с flexo
			for(var i=0; i<listAllowed_vidsWithFlexo.length; i++){
				queryToCreate[0][listAllowed_vidsWithFlexo[i]] = getRandom(0, 10000);
			}
			//Добовляем в запрос не разрешенные идентификаторы
			for(var i=0; i<listNotAllowed_vids.length; i++){
				queryToCreate[0][listNotAllowed_vids[i]] = getRandom(0, 10000);
			}

			controller.queryToView ( 'create', sender, queryToCreate, viewName, socket,
				function(err, reply) {
					test.strictEqual(err.message, 'Controller: No permission to create in view');
					test.done();
				});
		}
	},
	//Удаляем flexo и view права по пользователю
	deleteFlexoAndViewAccess: function(test){
		test.expect( 4 );
		//Логин пользователя
		var login = testData5.userLogin;
		//Название view
		var viewName = testData5.testCreate.viewNameForCreate;
		//Название flexo
		var flexoSchemeName = testData5.flexoSchemeName;
		//Объект с описанием автора запроса
		var sender = {
			login: testData5.userLogin,
			role: testData5.userRole,
			place: 'nodeunit_test'
		};

		//Формируем объект запрос на удаление view прав по роли
		var queryForDelete = {
			access: {
				viewName:viewName,
				login:login
			}
		};

		controller.delete(queryForDelete, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			//Формируем объект запрос на удаление flexo прав по роли
			var queryForDelete = {
				access: {
					flexoSchemeName:flexoSchemeName,
					login:login
				}
			};

			controller.delete(queryForDelete, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});
		});
	}
};

var testData6 = {
	userLogin: generatorString(1,10),
	userRole: generatorString(1,10),
	flexoSchemeName: 'testUsers',
	testModify:{
		testObjAccessFlexoRole:{
			read: {},
			modify: {}

		},
		testObjAccessFlexoUser:{
			modify: {}
		},
		viewNameForModify: 'testView4',
		testObjViewAccessUser: {},
		testObjViewAccessRole: {},
		socket:{},
		flexoAllowedField:'',
		_vidAllowed:''
	}
};

//Тестирование определения пересечения прав для view для запросов на модификацию, в view
// идентификаторы связанны с Flexo
exports.viewWithFlexoModifyAccess = {
	//Сохраняем flexo права по роли и по пользователю
	saveFlexoCreateAccessForRoleAndUser: function(test){
		test.expect( 4 );
		//Объект flexo прав по роли
		var objAccessForRole = testData6.testModify.testObjAccessFlexoRole;
		//Объект flexo прав по пользователю
		var objAccessForUser = testData6.testModify.testObjAccessFlexoUser;
	    //Логин пользователя
		var login = testData6.userLogin;
		//Роль пользователя
		var role = testData6.userRole;
		//Название flexo схемы
		var flexoSchemeName = testData6.flexoSchemeName;
		//Объект с описанием автора запроса
		var sender = {
			login: testData6.userLogin,
			role: testData6.userRole,
			place: 'nodeunit_test'
		};

		//Генерируем права на чтение для роли (это нам необходимо так как поля _id и tsUpdate
		//используемые для запроса на модификацию доступны во view на чтение и с этими
		// идентификаторами можно вренуть результат операции модификации)
		objAccessForRole.read['(all)'] = 1;
		objAccessForRole.read.fields = [];

		//Генерируем права на модификацию для роли (разрешается модификация всех полей с
		// использованием спец команды '(all)', кроме одного случайно выбранного)
		var notAccessRole = getRandom(0, (globalFlexoSchemes[flexoSchemeName].modify.length - 1) );
		objAccessForRole.modify.fields =
			[globalFlexoSchemes[flexoSchemeName].modify[notAccessRole]];

		//Устанавливаем спец поле '(all)'
		objAccessForRole.modify['(all)'] = 1;

		//Генерируем права на модификацию для пользователя (запрещается модификация всех полей с
		// использованием спец команды '(all)', кроме одного случайно выбранного)
		var notAccessUser = getRandom(0, (globalFlexoSchemes[flexoSchemeName].modify.length - 1) );
		objAccessForUser.modify['(all)'] = 0;
		objAccessForUser.modify.fieldsAdd = [globalFlexoSchemes[flexoSchemeName].modify[notAccessRole]];
		objAccessForUser.modify.fieldsDel = [];
		flexoAllowedField = globalFlexoSchemes[flexoSchemeName].modify[notAccessRole];

		//Сохраняется одно разрешенное flexo поле в правах
		testData6.testModify.flexoAllowedField = flexoAllowedField;

		//Формируем запрос на сохранение прав по пользователю для flexo схемы
		var queryForSave = {
			access:{
				flexoSchemeName: flexoSchemeName,
				login:login,
				objAccess: objAccessForUser
			}
		};

		controller.create(queryForSave, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			//Формируем запрос на сохранение прав по роли для flexo схемы
			var queryForSave = {
				access:{
					flexoSchemeName: flexoSchemeName,
					role:role,
					objAccess: objAccessForRole
				}
			};

			controller.create(queryForSave, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});
		});

	},
	//Сохраняем view права по роли и по пользователю
	saveViewAccessForRoleAndUser: function(test){
		test.expect( 4 );
		//Объект view прав по пользователю
		var objAccessUser = testData6.testModify.testObjViewAccessUser;
		//Объект view прав по роли
		var objAccessRole = testData6.testModify.testObjViewAccessRole;
		//Логин пользователя
		var login = testData6.userLogin;
		//Роль пользователя
		var role = testData6.userRole;
		//Название view
		var viewName = testData6.testModify.viewNameForModify;
		//Объект с описанием автора запроса
		var sender = {
			login: testData6.userLogin,
			role: testData6.userRole,
			place: 'nodeunit_test'
		};

		//Наполняем разрешениями view для роли случайным образом
		var listOf_vids = Object.keys(testObjGlobalViewsConfig[viewName]);
		objAccessRole['(all)'] = 0;
		objAccessRole.viewIds = [];

		for(var i = 0; i < listOf_vids.length; i++ ) {
			var access = getRandom(0, 1);
			if (access){
				objAccessRole.viewIds.push(listOf_vids[i]);
			}
		}

		//Наполняем разрешениями view для пользователя (разрешены все идентификаторы с
		// использованием спец команды '(all)'
		objAccessUser['(all)'] = 1;
		objAccessUser.viewIdsAdd = [];
		objAccessUser.viewIdsDel = [];

		//Формируем объект запрос на сохранение прав по пользователю
		var queryForSave = {
			access:{
				viewName: viewName,
				login: login,
				objAccess: objAccessUser
			}
		};

		controller.create(queryForSave, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);
			//Формируем объект запрос на сохранение прав по роли
			var queryForSave = {
				access:{
					viewName: viewName,
					role: role,
					objAccess: objAccessRole
				}
			};

			controller.create(queryForSave, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});
		});
	},
	//Запрашиваем шаблон, и по прикрепленным к socket списку идентификаторов определяем
	// правильность нахождения разрешенных идентификаторов view
	getTemplateFromView:function(test){
		test.expect( 7 );
		//Время начала теста (используется для запроса залогированных ошибок)
		testData6.time = new Date().getTime();
		//Название view
		var viewName = testData6.testModify.viewNameForModify;
		//Объект сокет
		var socket = testData6.testModify.socket;
		//Ссылка на глобальное описание используемой view
		var globalViewConfig = testObjGlobalViewsConfig[viewName];
		//Объект с описанием автора запроса
		var sender = {
			login: testData6.userLogin,
			role: testData6.userRole,
			place: 'nodeunit_test'
		};

		//Находим единственный идентификатор который разрешен в этом тесте на модификацию
		var flexoAllowedField = testData6.testModify.flexoAllowedField;
		var _vidAllowed; //Переменная для хранения разрешенного идентификатора
		var listOf_vids = Object.keys(globalViewConfig);

		for( var i = 0; i < listOf_vids.length; i++ ) {
			if(globalViewConfig[listOf_vids[i]].flexo.length !== 0) {
				if(globalViewConfig[listOf_vids[i]].flexo[1] === flexoAllowedField) {
					_vidAllowed = listOf_vids[i];
				}
			}
		}

		//Находим идентификаторы связанные с полями _id и tsUpdate
		var _vidsForSelector = [];
		for(var i=0; i<listOf_vids.length; i++){
			if(testObjGlobalViewsConfig[viewName][listOf_vids[i]].type === 'read'){
				_vidsForSelector.push(listOf_vids[i]);
			}
		}

		//Сохраняем разрешенный идентификаторв
		testData6.testModify._vidAllowed = _vidAllowed;

		controller.getTemplate( viewName, sender, socket, function( err, config, template ) {
			test.ifError(err);
			test.ok(config);
			test.strictEqual(template, '', 'Проверка отсутствия шаблона');

			//Проверяем список идентификаторов сохраненных у объекта socket
			if( socket.view && socket.view[viewName] ){
				test.strictEqual(socket.view[viewName].length, 3,
					'Проверяем количество разрешенных идентификаторов view');


				var result = underscore.indexOf( socket.view[viewName], _vidAllowed );
				test.notStrictEqual(result, -1,	'Проверка наличия разрешенного ' +
					'идентификатора view в списке разрашенных у socket' );

				for( var i = 0; i < _vidsForSelector.length; i++ ) {
					result = underscore.indexOf( socket.view[viewName], _vidsForSelector[i] );
					test.notStrictEqual(result, -1,	'Проверка наличия разрешенного ' +
						'идентификатора view в списке разрашенных у socket' );
				}
			}

			test.done();
		} );

	},
	//Проверяем были ли ошибки целостности
	checkErrorWithLossIntegrity: function ( test ) {
		test.expect( 2 );
		//Нижния граница временного интервала выбора ошибок в милисекундах
		var min = testData6.time;
		//Объект с описанием автора запроса
		var sender = {
			login: testData6.userLogin,
			role: testData6.userRole,
			place: 'nodeunit_test'
		};

		controller.findErrorLogging({min:min}, sender, function ( err, replies ) {
			test.ifError(err);
			test.strictEqual(replies.length, 0, 'Проверяем количество ошибок целостности');
			test.done();
		});
	},
	//Тестируем запросы на модификацию
	queryToModify:{
		//Запрс на модификацию с разрешенным идентификатором в свойстве properties в объектах запроса
		// на модификацию
		allowed_vidsInQueriesProperties: function ( test ) {
			test.expect( 2 );
			//Название view
			var viewName = testData6.testModify.viewNameForModify;
			//Объект сокет с прикрепленным списком разрешенных идентификаторв
			var socket = testData6.testModify.socket;
			//Разрешенный на модификацию идентификатор
			var allowed_vid = testData6.testModify._vidAllowed;
			//Объект с описанием автора запроса
			var sender = {
				login: testData6.userLogin,
				role: testData6.userRole,
				place: 'nodeunit_test'
			};
			//Список идентификатор во view
			var listOf_vids = Object.keys(testObjGlobalViewsConfig[viewName]);
			listOf_vids = underscore.without(listOf_vids, allowed_vid);


			//Находим идентификаторы связанные с полями _id и tsUpdate для сохранения их в свойстве
			//selector объекта запроса на модификацию
			var _vidsForSelector = [];
			for(var i=0; i<listOf_vids.length; i++){
				if(testObjGlobalViewsConfig[viewName][listOf_vids[i]].type === 'read'){
					_vidsForSelector.push(listOf_vids[i]);
				}
			}

			//Формируем запрос на модификацию
			var request = [{}];
			request[0]['selector'] = {};
			request[0]['selector'][_vidsForSelector[0]] = generatorString(1,10);
			request[0]['selector'][_vidsForSelector[1]] = generatorString(1,10);
			request[0]['properties'] = {};
			request[0]['properties'][allowed_vid] = generatorString(1,10);

			controller.queryToView ( 'modify', sender, request, viewName, socket, function(err, reply) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			})

		},
		//Запрс на модификацию с неразрешенным идентификатором в свойстве properties в объектах запроса
		// на модификацию
		notAllowed_vidsInQueriesProperties: function ( test ) {
			test.expect( 1 );
			//Название view
			var viewName = testData6.testModify.viewNameForModify;
			//Объект сокет с прикрепленным списком разрешенных идентификаторв
			var socket = testData6.testModify.socket;
			//Разрешенный на модификацию идентификатор
			var allowed_vid = testData6.testModify._vidAllowed;
			//Объект с описанием автора запроса
			var sender = {
				login: testData6.userLogin,
				role: testData6.userRole,
				place: 'nodeunit_test'
			};
			//Список идентификатор во view
			var listOf_vids = Object.keys(testObjGlobalViewsConfig[viewName]);
			listOf_vids = underscore.without(listOf_vids, allowed_vid);

			//Формируем запрос на модификацию в своийство properties добавляем неразрешенные на
			// модификацию идентификаторы
			var request = [{}];
			request[0]['selector'] = {};
			request[0]['selector'][allowed_vid] = generatorString(1,10);
			request[0]['properties'] = {};
			request[0]['properties']
				[listOf_vids[generatorString(0,(listOf_vids.length - 1))]]
				= generatorString(1,10);

			controller.queryToView ( 'modify', sender, request, viewName, socket, function(err, reply) {
				test.strictEqual(err.message, 'Controller: No permission to modify in view');
				test.done();
			})

		}
	},
	//Удаляем flexo и view права по роли и по пользователю
	deleteFlexoAndViewAccess: function(test){
		test.expect( 8 );
		//Логин пользователя
		var login = testData6.userLogin;
		//Роль пользователя
		var role = testData6.userRole;
		//Название view
		var viewName = testData6.testModify.viewNameForModify;
		//Название flexo схемы
		var flexoSchemeName = testData6.flexoSchemeName;
		//Объект с описанием автора запроса
		var sender = {
			login: testData6.userLogin,
			role: testData6.userRole,
			place: 'nodeunit_test'
		};

		//Формируем объект запрос на удаление view прав по пользователю
		var queryForDelete = {
			access: {
				viewName:viewName,
				login:login
			}
		};

		controller.delete(queryForDelete, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			//Формируем объект запрос на удаление flexo прав по пользователю
			var queryForDelete = {
				access: {
					flexoSchemeName:flexoSchemeName,
					login:login
				}
			};

			controller.delete(queryForDelete, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);

				//Формируем объект запрос на удаление flexo прав по роли
				var queryForDelete = {
					access: {
						flexoSchemeName:flexoSchemeName,
						role:role
					}
				};

				controller.delete(queryForDelete, sender, function( err, reply ) {
					test.ifError(err);
					test.ok(reply);

					//Формируем объект запрос на удаление view прав по роли
					var queryForDelete = {
						access: {
							viewName:viewName,
							role:role
						}
					};

					controller.delete(queryForDelete, sender, function( err, reply ) {
						test.ifError(err);
						test.ok(reply);
						test.done();
					});
				});
			});
		});
	}

};

var testData7 = {
	userLogin: generatorString(1,10),
	userRole: generatorString(1,10),
	flexoSchemeName: 'testUsers',
	testDelete:{
		testObjAccessFlexoRole:{
			read: {},
			delete: 1
		},
		viewNameForDelete: 'testView5',
		testObjViewAccessRole: {},
		socket:{}
	}
};

//Тестирование определения пересечения прав для view для запросов на удаление, в view
// идентификаторы связанны с Flexo, и один связан c flexo схемой но без указания связи с полем
exports.viewWithFlexoDeleteAccess = {
	//Сохраняем flexo права по роли
	saveFlexoCreateAccessForRole: function(test){
		test.expect( 2 );
		//Объект flexo прав по роли с уже указанным разрешение на удаление
		var objAccessForRole = testData7.testDelete.testObjAccessFlexoRole;
		//Роль пользователя
		var role = testData7.userRole;
		//Название flexo схемы
		var flexoSchemeName = testData7.flexoSchemeName;
		//Объект с описанием автора запроса
		var sender = {
			login: testData7.userLogin,
			role: testData7.userRole,
			place: 'nodeunit_test'
		};

		//Устанавливаем права на чтение для всех идентификаторов по роли (это нам необходимо
		// так как поля _id и tsUpdateиспользуемые для запроса на удаление доступны во
		// view на чтение и с этими идентификаторами можно вернуть результат удаления)
		objAccessForRole.read['(all)'] = 1;
		objAccessForRole.read.fields = [];

		//Формируем запрос на сохранение прав по роли для flexo схемы
		var queryForSave = {
			access:{
				flexoSchemeName: flexoSchemeName,
				role:role,
				objAccess: objAccessForRole
			}
		};

		controller.create(queryForSave, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);
			test.done();
		});
	},
	//Сохраняем view права по роли
	saveViewAccessForRole: function(test){
		test.expect( 2 );
		//Объект view прав по роли
		var objAccessRole = testData7.testDelete.testObjViewAccessRole;
		//Роль пользователя
		var role = testData7.userRole;
		//Название view
		var viewName = testData7.testDelete.viewNameForDelete;
		//Объект с описанием автора запроса
		var sender = {
			login: testData7.userLogin,
			role: testData7.userRole,
			place: 'nodeunit_test'
		};

		//Наполняем разрешениями view для роли (все идентификаторы разрешены)
		objAccessRole['(all)'] = 1;
		objAccessRole.viewIds = [];

		//Формируем объект запрос на сохранение прав по роли
		var queryForSave = {
			access:{
				viewName: viewName,
				role: role,
				objAccess: objAccessRole
			}
		};

		controller.create(queryForSave, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);
			test.done();
		});
	},
	//Запрашиваем шаблон, и по прикрепленным к socket списку идентификаторов определяем
	// правильность нахождения разрешенных идентификаторов view
	getTemplateFromView: function ( test ) {
		//Время начала теста (используется для запроса залогированных ошибок)
		testData7.time = new Date().getTime();
		//Название view
		var viewName = testData7.testDelete.viewNameForDelete;
		//логин пользователя
		var user = testData7.userLogin;
		//роль пользователя
		var role = testData7.userRole;
		//Объект сокет
		var socket = testData7.testDelete.socket;
		//Ссылка на глобальное описание используемой view
		var globalViewConfig = testObjGlobalViewsConfig[viewName];
		//Объект с описанием автора запроса
		var sender = {
			login: testData7.userLogin,
			role: testData7.userRole,
			place: 'nodeunit_test'
		};

		//Все идентификаторы разрешены в этом тесте
		var listAllowed_vids = Object.keys(globalViewConfig);

		test.expect( listAllowed_vids.length + 4 );
		controller.getTemplate( viewName, sender, socket, function( err, config, template ) {
			test.ifError(err);
			test.ok(config);
			test.strictEqual(template, '', 'Проверка отсутствия шаблона');

			//Проверяем список идентификаторов сохраненных у объекта socket
			if( socket.view && socket.view[viewName] ){
				test.strictEqual(socket.view[viewName].length, 3,
					'Проверяем количество разрешенных идентификаторов view');


				for( var i = 0; i < listAllowed_vids.length; i++ ) {
					var result = underscore.indexOf( socket.view[viewName], listAllowed_vids[i] );
					test.notStrictEqual(result, -1,	'Проверка наличия разрешенного ' +
						'идентификатора view в списке разрашенных у socket' );
				}

			}

			test.done();
		} );
	},
	//Проверяем были ли ошибки целостности
	checkErrorWithLossIntegrity: function ( test ) {
		test.expect( 2 );

		//Нижния граница временного интервала выбора ошибок в милисекундах
		var min = testData7.time;
		//Объект с описанием автора запроса
		var sender = {
			login: testData7.userLogin,
			role: testData7.userRole,
			place: 'nodeunit_test'
		};

		controller.findErrorLogging({min:min}, sender, function ( err, replies ) {
			test.ifError(err);
			test.strictEqual(replies.length, 0, 'Проверяем количество ошибок целостности');
			test.done();
		});
	},
	//Тестируем запросы на удаление
	queryToDelete:{
		//Запрос содежит в selector разрешенные идентификаторы связанные с flexo схемой на которое
		// есть разрешение на удаление
		allowed_vidsInQueriesSelector: function ( test ) {
			test.expect( 2 );
			//Название view
			var viewName = testData7.testDelete.viewNameForDelete;
			//Объект сокет с прикрепленным списоком разрешенных идентификаторв
			var socket = testData7.testDelete.socket;
			//Объект с описанием автора запроса
			var sender = {
				login: testData7.userLogin,
				role: testData7.userRole,
				place: 'nodeunit_test'
			};
			//Список идентификаторов
			var listOf_vids = Object.keys(testObjGlobalViewsConfig[viewName]);
			var notFlexoFields_vid;

			//Ищем элемент во view у которого нет привязки к flexo полю
			for( var i = 0; i < listOf_vids.length; i++ ) {
				if(testObjGlobalViewsConfig[viewName][listOf_vids[i]].type === 'delete'){
					notFlexoFields_vid = listOf_vids[i];
				}
			}

			listOf_vids = underscore.without(listOf_vids, notFlexoFields_vid);

			//Формируем запрос на модификацию
			var request = [{}];
			request[0]['selector'] = {};
			request[0]['selector'][listOf_vids[0]] = generatorString(1,10);
			request[0]['selector'][listOf_vids[1]] = generatorString(1,10);

			controller.queryToView ( 'delete', sender, request, viewName, socket, function(err, reply) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});

		},
		//Запрос содежит в selector идентификатор которого нет во view и на которого
		//соответственно нет разрешения на удаление
		notAllowed_vidsInQueriesSelector: function ( test ) {
			test.expect( 1 );
			//Название view
			var viewName = testData7.testDelete.viewNameForDelete;
			//Объект сокет с прикрепленным списоком разрешенных идентификаторв
			var socket = testData7.testDelete.socket;
			//Объект с описанием автора запроса
			var sender = {
				login: testData7.userLogin,
				role: testData7.userRole,
				place: 'nodeunit_test'
			};

			//Формируем запрос на модификацию
			var request = [{}];
			request[0]['selector'] = {};
			request[0]['selector']['sss'] = generatorString(1,10);

			controller.queryToView ( 'delete', sender, request, viewName, socket, function(err, reply) {
				test.strictEqual(err.message, 'Controller: No permission to delete in view');
				test.done();
			});
		}
	},
	//Удаляем flexo и view права по роли
	deleteFlexoAndViewAccess: function(test){
		test.expect( 4 );
		//Роль пользователя
		var role = testData7.userRole;
		//Название view
		var viewName = testData7.testDelete.viewNameForDelete;
		//Название flexo
		var flexoSchemeName = testData7.flexoSchemeName;
		//Объект с описанием автора запроса
		var sender = {
			login: testData7.userLogin,
			role: testData7.userRole,
			place: 'nodeunit_test'
		};

		//Формируем объект запрос на удаление flexo прав по роли
		var queryForDelete = {
			access: {
				flexoSchemeName:flexoSchemeName,
				role:role
			}
		};

		controller.delete(queryForDelete, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);
			//Формируем объект запрос на удаление view прав по роли
			var queryForDelete = {
				access: {
					viewName:viewName,
					role:role
				}
			};

			controller.delete(queryForDelete, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});
		});

	}
};

//Используется для инициализации view и формирования глобальных описаний view и flexo необходимые
//контролеры
function initStarter(config, callback){
	if(config.pRabbit) rabbit = config.pRabbit;
	else {
		callback ('Starter: config.pRabbit - default.');
		return;
	}
	if(config.pFlexo) flexo = config.pFlexo;
	else {
		callback ('Starter: config.pFlexo - default.');
		return;
	}
	if(config.pView) view = config.pView;
	else {
		callback ('Starter: config.pView- default.');
		return;
	}


//    ----------------------------------
//    Блок разбор flexo схем
//    ----------------------------------
	var filename = fs.readdirSync(config.scheme_flexo);
	//  массивы полей для редактирования и чтения для Controller
	var flexoGlobalController = {};
	// объект для модуля flexo
	var flexoGlobal = {};

	// массив названий флексосхем
	var aFlexoName = [];

	// разбор флексосхемы для контролера и flexo
	for(var i = 0; i < filename.length; i++){
		var buff = require(config.scheme_flexo+'/'+filename[i]);
		var modify = [];
		var type = {};
		for(key in buff.root){
			modify.push(key);
			if(!buff.root[key].type) {
				callback('ERR: В схеме '+buff.name+' поле '+key+' без type');
				return;
			}
			type[key] = buff.root[key];
		}

		flexoGlobal[buff.name] = {
			scheme: buff,
			dict: {
				mutable: modify,
				types: type,
				joins: [],
				joinProperties: []
			}
		}

		aFlexoName.push(buff.name);
	}

	for(var i = 0; i < aFlexoName.length; i++){
		var buffFlexo = flexoGlobal[aFlexoName[i]].scheme;
		var types = flexoGlobal[aFlexoName[i]].dict.types;
		var read = [];
		if(buffFlexo.join){
			for(key in buffFlexo.join){
				for(var g = 0; g < buffFlexo.join[key].fields.length; g++){
					read.push(key+'_'+buffFlexo.join[key].fields[g]);
					types[key+'_'+buffFlexo.join[key].fields[g]] = flexoGlobal[key].dict.types[buffFlexo.join[key].fields[g]];
				}
				if(buffFlexo.join[key].depend[0] === 'root')  flexoGlobal[aFlexoName[i]].dict.joinProperties.push(buffFlexo.join[key].depend[1]);
				flexoGlobal[aFlexoName[i]].dict.joins.push(buffFlexo.join[key].depend[0]);

			}
		}

		read = _.union(read, flexoGlobal[aFlexoName[i]].dict.mutable);
		flexoGlobal[aFlexoName[i]].dict.all = read;
		flexoGlobalController[aFlexoName[i]] = {
			read: read,
			modify: flexoGlobal[aFlexoName[i]].dict.mutable
		}

		//Добовляются служебные поля доступные всегда по умолчанию на чтение
		flexoGlobalController[aFlexoName[i]].read.push('_id');
		flexoGlobalController[aFlexoName[i]].read.push('tsUpdate');
	}

//    ----------------------------------
//    Блок разбор flexo схем
//    ----------------------------------

	filename = fs.readdirSync(config.scheme_view);
	//  массив _vid для контролерра
	var viewGlobalController = {};
	var viewGlobalView = {};

	for(var i = 0; i < filename.length; i++){
		var buff = require(config.scheme_view+'/'+filename[i]);

		var aPoint = [{in: buff.config , url: ''}];
		viewGlobalController[buff.name] = {};
		viewGlobalView[buff.name] = {view: buff};
		// прогон поконфигу
		while (aPoint.length > 0){
			var point = aPoint[0];
			if(point.in['_vid']){
				if(!point.in['_flexo']) viewGlobalController[buff.name][point.in['_vid']] = {};
				else {
					if(!point.in._flexo['type'] || !point.in._flexo['scheme']) {
						callback('Ошибка разбора view-схемы '+buff.name+' _vid - '+point.in['_vid']);
					} else {
						viewGlobalController[buff.name][point.in['_vid']] = {type: point.in._flexo['type'], flexo: point.in._flexo['scheme']};
						var aBuff =  point.url.split('/:');
						aBuff.shift();
//                        viewGlobalView[buff.name][point.in['_vid']] = aBuff;
					}
				}
			}
			aPoint.shift();
			if(point.in && typeof(point.in) === 'object') {
				if(_.isArray(point.in)) {
					for(var g = 0; g < point.in.length ; g++){
						aPoint.unshift({in: point.in[g], url: point.url+'/:'+g});
					}
				} else {
					for(key in point.in){
						aPoint.unshift({in: point.in[key], url:  point.url+'/:'+key});
					}
				}
			}
		}
	}

	//Формируется словарь идентификаторов связанных с flexo полями требуемых при инициализации view
	var viewNames = Object.keys(viewGlobalController);
	for(var i=0; i<viewNames.length; i++) {
		if( !viewGlobalView[viewNames[i]].vids) {
			viewGlobalView[viewNames[i]].vids = {};
		}

		var _vids = Object.keys(viewGlobalController[viewNames[i]]);
		for(var j=0; j<_vids.length; j++) {
			if(viewGlobalController[viewNames[i]][_vids[j]].flexo &&
				viewGlobalController[viewNames[i]][_vids[j]].flexo.length === 2) {

				viewGlobalView[viewNames[i]].vids[_vids[j]] =
					viewGlobalController[viewNames[i]][_vids[j]].flexo
			}
		}
	}


//    ----------------------------------
//    Блок инициализации паралельной
//    ----------------------------------

	//Переопределяем глобальные переменные с описание view и flexo используемые контролером в этом
	// тесте
	testObjGlobalViewsConfig = viewGlobalController;
	globalFlexoSchemes = flexoGlobalController;

	async.waterfall([
		function(cb){
			rabbit.init(null, cb);
		},
		function(arg, cb){
			flexo.init({storage: rabbit, schemes: flexoGlobal}, cb);
		},
		function(arg, cb){
			view.init({provider: arg, views: viewGlobalView, templatePath: config.template}, function (err, module){
				if ( err ) {
					cb(err);
				} else {
					View = module;
					cb(err, module);
				}
			});

		}/*,
		function(arg, cb){
			controller.init({view: arg, viewConfig: viewGlobalController, flexoSchemes: flexoGlobalController}, cb);
		}*/
	], function (err, result) {
		if(err) callback (err);
		else callback (null, result);
	});
}

//Создаем случайное число в заданных пределах
function getRandom(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

//Генерирует строку
function generatorString (z , g) {
	var stringLength = getRandom(z,g);
	var str = '';
	for(var i = 0; i < stringLength; i++){
		str = str + charString[getRandom(0,charString.length-1)];
	}
	return str;
}

