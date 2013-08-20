var Controller = require('./index.js');
var async = require('async');
var underscore = require('underscore');

//Получаем информацию из конфига, о том требуется ли подключение mock_view
var mock = require('./config/config.js').mock;

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

//Имитация глобальной переменной для хранения общих данных о view
var testObjGlobalViewsConfig = {
	'testView1': {
		q1:{flexo:[]},
		w2:{flexo:[]},
		e3:{flexo:[]},
		r4:{flexo:[]},
		t5:{flexo:[]},
		y6:{flexo:[]},
		u7:{flexo:[]},
		i8:{flexo:[]},
		o9:{flexo:[]},
		p10:{flexo:[]}
	},
	'testView2': {
		q1:{flexo:['testUsers', 'login'], type:'read'},
		w2:{flexo:['testUsers', 'role'], type:'read'},
		e3:{flexo:['testUsers', 'name'], type:'read'},
		r4:{flexo:['testUsers', 'lastname'], type:'read'},
		t5:{flexo:['testUsers', 'position'], type:'read'},
		y6:{flexo:['testUsers', 'company'], type:'read'},
		u7:{flexo:['testUsers', 'hash'], type:'read'},
		i8:{flexo:['testUsers', 'salt'], type:'read'}
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
		q8:{flexo:['testUsers', 'login'], type:'modify'},
		w7:{flexo:['testUsers', 'role'], type:'modify'},
		e6:{flexo:['testUsers', 'name'], type:'modify'},
		r5:{flexo:['testUsers', 'lastname'], type:'modify'},
		t4:{flexo:['testUsers', 'position'], type:'modify'},
		y3:{flexo:['testUsers', 'company'], type:'modify'},
		u2:{flexo:['testUsers', 'hash'], type:'modify'},
		i1:{flexo:['testUsers', 'salt'], type:'modify'}
	}
};

//Имитация глобальной переменной с информацией из flexo схем
//сигнатура {schemeName:{read:[fieldsNames], modify:[fieldsNames]}
var globalFlexoSchemes = {
	'testCustomers': {
		read:['name', 'inn', 'managerName'],
		modify:['name', 'inn']
	},
	'testOrders': {
		read: ['number', 'comments', 'services'],
		modify:['number', 'comments', 'services']
	},
	'testServices': {
		read: ['name', 'price'],
		modify:['name', 'price']
	},
	'testUsers': {
		read: ['login', 'role', 'name', 'lastname', 'position', 'company', 'hash', 'salt'],
		modify: ['login', 'role', 'name', 'lastname', 'position', 'company', 'hash', 'salt']
	}
};

//Переменная для хранения экземпляра контролера
var controller;

//Устанавливаем параметр view в конфиг контроллера
if ( mock ) {
	var view = require( './mock/view_mock.js' );
}

//Конфиг контроллера
configForController = {
	redisConfig: {},
	view:view,
	flexoSchemes:globalFlexoSchemes,
	viewConfig:testObjGlobalViewsConfig
};

//Тестирование инициализации контроллера и view
exports.testInit = {
	initView: function(test){
		test.expect( 7 );
		view.init({}, function( err, reply ){
			test.ifError(err);
			test.ok(reply);
			test.ok(view.getTemplate);
			test.ok(view.find);
			test.ok(view.insert);
			test.ok(view.modify);
			test.ok(view.delete);
			test.done();
		});
	},
	initController: function (test) {
		test.expect( 6 );
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
			'managerName': getRandom(0,1),
			'name': getRandom(0,1),
			'inn':getRandom(0,1)
		},
		modify: {
			'managerName': getRandom(0,1),
			'name': getRandom(0,1),
			'inn':getRandom(0,1)
		},
		create: {},
		createAll: getRandom(0,1),
		delete: getRandom(0,1)
	},
	userLogin: generatorString(1,10),
	userRole: generatorString(1,10),
	flexoSchemeName: generatorString(1,20)
};

//Тестирование функций админки связанной с flexo правами
exports.adminFunctionForFlexoAccess = {
	saveAccessForUser: function(test){
		test.expect(13);
		var objAccess = testData1.testObjAccessFlexo;
		var login = testData1.userLogin;
		var flexoSchemeName = testData1.flexoSchemeName;

		//Формируем объект запрос на сохранение
		var queryForSave = {
			access:{
				flexoSchemeName: flexoSchemeName,
				login:login,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			var queryForRead = {
				access: {
					flexoSchemeName:flexoSchemeName,
					login:login
				}
			};

			controller.find(queryForRead, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				var keys = Object.keys(reply);
				test.strictEqual(keys.length, 5, 'Проверка количества типов прав возвращаемых ' +
					'в сохраненных flexo правах на пользователя');
				test.strictEqual(reply.read.managerName, testData1.testObjAccessFlexo.read.managerName,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.read.name, testData1.testObjAccessFlexo.read.name,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.read.inn, testData1.testObjAccessFlexo.read.inn,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.modify.managerName,
					testData1.testObjAccessFlexo.modify.managerName,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.modify.name, testData1.testObjAccessFlexo.modify.name,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.modify.inn, testData1.testObjAccessFlexo.modify.inn,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.createAll, testData1.testObjAccessFlexo.createAll,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.delete, testData1.testObjAccessFlexo.delete,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.done();
			});
		});

	},
	deleteAccessForUser: function(test){
		test.expect(3);
		var login = testData1.userLogin;
		var flexoSchemeName = testData1.flexoSchemeName;

		//Формируем объект запрос на удаление
		var queryForDelete = {
			access: {
				flexoSchemeName:flexoSchemeName,
				login:login
			}
		};

		controller.delete(queryForDelete, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			var queryForRead = {
				access: {
					flexoSchemeName:flexoSchemeName,
					login:login
				}
			};

			controller.find(queryForRead, function( err, reply ) {
				test.ok(err.message, 'No requested object access (user: ' + login +', ' +
					'flexoScheme: ' + flexoSchemeName + ')');
				test.done();
			});
		});
	},
	saveAccessForRole:function(test){
		test.expect(13);
		var objAccess = testData1.testObjAccessFlexo;
		var role = testData1.userRole;
		var flexoSchemeName = testData1.flexoSchemeName;

		//Формируем объект запрос на сохранение
		var queryForSave = {
			access:{
				flexoSchemeName: flexoSchemeName,
				role:role,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			var queryForRead = {
				access: {
					flexoSchemeName:flexoSchemeName,
					role:role
				}
			};

			controller.find(queryForRead, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				var keys = Object.keys(reply);
				test.strictEqual(keys.length, 5, 'Проверка количества типов прав возвращаемых ' +
					'в сохраненных flexo правах по пользователя');
				test.strictEqual(reply.read.managerName, testData1.testObjAccessFlexo.read.managerName,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.read.name, testData1.testObjAccessFlexo.read.name,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.read.inn, testData1.testObjAccessFlexo.read.inn,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.modify.managerName,
					testData1.testObjAccessFlexo.modify.managerName,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.modify.name, testData1.testObjAccessFlexo.modify.name,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.modify.inn, testData1.testObjAccessFlexo.modify.inn,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.createAll, testData1.testObjAccessFlexo.createAll,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.delete, testData1.testObjAccessFlexo.delete,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.done();
			});
		});
	},
	deleteAccessForRole:function(test){
		test.expect(3);
		var role = testData1.userRole;
		var flexoSchemeName = testData1.flexoSchemeName;

		//Формируем объект запрос на удаление
		var queryForDelete = {
			access: {
				flexoSchemeName:flexoSchemeName,
				role:role
			}
		};

		controller.delete(queryForDelete, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			var queryForRead = {
				access: {
					flexoSchemeName:flexoSchemeName,
					role:role
				}
			};

			controller.find(queryForRead, function( err, reply ) {
				test.ok(err.message, 'No requested object access (role: ' + role +', ' +
					'flexoScheme: ' + flexoSchemeName + ')');
				test.done();
			});
		});
	}
};

var testData2 = {
	userLogin: generatorString(1,10),
	userRole: generatorString(1,10),
	viewName: generatorString(1,20)
};

//Тестирование функций админки связанной с view правами
exports.adminFunctionForViewAccess = {
	saveAccessForUser: function(test){
		//Генерируем объект прав
		var objAccess = {};
		var count = getRandom(1, 100);
		for( var i = 0; i < count; i++ ) {
			objAccess[i] = getRandom(0,1);
		}

		test.expect((count+5));

		var login = testData2.userLogin;
		var viewName = testData2.viewName;

		//Формируем объект запрос на сохранение
		var queryForSave = {
			access:{
				viewName: viewName,
				login: login,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			var queryForRead = {
				access: {
					viewName: viewName,
					login: login
				}
			};

			controller.find(queryForRead, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				var keys = Object.keys(reply);
				test.strictEqual(keys.length, count, 'Проверка количества _vids возвращаемых ' +
					'в сохраненных view правах по пользователя');
				for( var i = 0; i < count; i++ ) {
					test.strictEqual(reply[i], objAccess[i],
						'Проверка получили ли мы тот же объект, что сохранили');
				}
				test.done();
			});
		});

	},
	deleteAccessForUser: function(test){
		test.expect(3);
		var login = testData2.userLogin;
		var viewName = testData2.viewName;

		//Формируем объект запрос на удаление
		var queryForDelete = {
			access: {
				viewName:viewName,
				login:login
			}
		};

		controller.delete(queryForDelete, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			var queryForRead = {
				access: {
					viewName:viewName,
					login:login
				}
			};

			controller.find(queryForRead, function( err, reply ) {
				test.ok(err.message, 'No requested object access (user: ' + login +', ' +
					'viewName: ' + viewName + ')');
				test.done();
			});
		});
	},
	saveAccessForRole: function(test){
		//Генерируем объект прав
		var objAccess = {};
		var count = getRandom(1, 100);
		for( var i = 0; i < count; i++ ) {
			objAccess[i] = getRandom(0,1);
		}

		test.expect((count+5));

		var role = testData2.userRole;
		var viewName = testData2.viewName;

		//Формируем объект запрос на сохранение
		var queryForSave = {
			access:{
				viewName: viewName,
				role: role,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			var queryForRead = {
				access: {
					viewName: viewName,
					role: role
				}
			};

			controller.find(queryForRead, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				var keys = Object.keys(reply);
				test.strictEqual(keys.length, count, 'Проверка количества _vids возвращаемых ' +
					'в сохраненных view правах по роли');
				for( var i = 0; i < count; i++ ) {
					test.strictEqual(reply[i], objAccess[i],
						'Проверка получили ли мы тот же объект, что сохранили');
				}
				test.done();
			});
		});

	},
	deleteAccessForRole: function(test){
		test.expect(3);
		var role = testData2.userRole;
		var viewName = testData2.viewName;

		//Формируем объект запрос на удаление
		var queryForDelete = {
			access: {
				viewName:viewName,
				role:role
			}
		};

		controller.delete(queryForDelete, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			var queryForRead = {
				access: {
					viewName:viewName,
					role:role
				}
			};

			controller.find(queryForRead, function( err, reply ) {
				test.ok(err.message, 'No requested object access (role: ' + role +', ' +
					'viewName: ' + viewName + ')');
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
	viewName: 'testView1'
};

//Тестирование определения пересечения прав для view, в view нет идентификаторов связанных с Flexo
exports.viewWithoutFlexo = {
	//Тест при условии, что на view есть права только по роли
	setOnlyRoleAccessForView: {
		saveAccessRoleForView: function( test ) {
			test.expect( 2 );
			var viewName = testData3.viewName;
			var role = testData3.userRole;
			var objAccess = testData3.objAccessForRole;

			//Генерируем объект прав по роли для view
			var _vids = Object.keys(testObjGlobalViewsConfig[viewName]);

			for( var i = 0; i < _vids.length; i++ ) {
				objAccess[_vids[i]] = getRandom(0,1);
				if( i === (  _vids.length - 1 ) ) {
					objAccess[_vids[i]] = 1;
				}
			}

			//Формируем объект запрос на сохранение прав
			var queryForSave = {
				access:{
					viewName: viewName,
					role: role,
					objAccess: objAccess
				}
			};

			controller.create(queryForSave, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);

				test.done();
			});
		},
		getTemplateFromView: function( test ) {
			var viewName = testData3.viewName;
			var role = testData3.userRole;
			var user = testData3.userLogin;
			var objAccess = testData3.objAccessForRole;
			var socket = {};

			//Формируем список разрешенных идентификаторов по объекту прав
			var _vids = Object.keys(objAccess);
			var listAllowed_vids = [];
			for( var i = 0; i < _vids.length; i++ ){
				if ( objAccess[_vids[i]] === 1 ) {
					listAllowed_vids.push(_vids[i]);
				}
			}

			test.expect( ( listAllowed_vids.length + 4 ) );

			controller.getTemplate( viewName, user, role, socket, function( err, config, template ) {
				test.ifError(err);
				test.ok(config);
				test.ok(template);

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
		deleteAccessRoleForView: function(test){
			test.expect(2);
			var role = testData3.userRole;
			var viewName = testData3.viewName;

			//Формируем объект запрос на удаление
			var queryForDelete = {
				access: {
					viewName:viewName,
					role:role
				}
			};

			controller.delete(queryForDelete, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});
		}
	},
	//Тест при условии, что на view есть права только по пользователю
	setOnlyUserAccessForView:{
		saveAccessUserForView: function( test ) {
			test.expect( 2 );
			var viewName = testData3.viewName;
			var login = testData3.userLogin;
			var objAccess = testData3.objAccessForUser;

			//Генерируем объект прав по роли для view
			var _vids = Object.keys(testObjGlobalViewsConfig[viewName]);

			for( var i = 0; i < _vids.length; i++ ) {
				objAccess[_vids[i]] = getRandom(0,1);
				if( i === (  _vids.length - 1 ) ) {
					objAccess[_vids[i]] = 1;
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

			controller.create(queryForSave, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);

				test.done();
			});
		},
		getTemplateFromView: function( test ) {
			var viewName = testData3.viewName;
			var role = testData3.userRole;
			var user = testData3.userLogin;
			var objAccess = testData3.objAccessForUser;
			var socket = {};

			//Формируем список разрешенных идентификаторов по объекту прав
			var _vids = Object.keys(objAccess);
			var listAllowed_vids = [];
			for( var i = 0; i < _vids.length; i++ ){
				if ( objAccess[_vids[i]] === 1 ) {
					listAllowed_vids.push(_vids[i]);
				}
			}

			test.expect( ( listAllowed_vids.length + 4 ) );

			controller.getTemplate( viewName, user, role, socket, function( err, config, template ) {
				test.ifError(err);
				test.ok(config);
				test.ok(template);

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
		deleteAccessUserForView: function(test){
			test.expect(2);
			var login = testData3.userLogin;
			var viewName = testData3.viewName;

			//Формируем объект запрос на удаление
			var queryForDelete = {
				access: {
					viewName:viewName,
					login:login
				}
			};

			controller.delete(queryForDelete, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});
		}
	},
	//Тест при условии, что на view есть права и по роли и по пользователю
	setRoleAndUserAccessForView:{
		saveAccessUserAndRoleForView: function( test ) {
			test.expect( 4 );
			var viewName = testData3.viewName;
			var role = testData3.userRole;
			var login = testData3.userLogin;
			testData3.objAccessForRole = {};
			testData3.objAccessForUser = {};
			var objAccessRole = testData3.objAccessForRole;
			var objAccessUser = testData3.objAccessForUser;

			//Генерируем объект прав по роли и по пользователю для view
			var _vids = Object.keys(testObjGlobalViewsConfig[viewName]);

			for( var i = 0; i < _vids.length; i++ ) {
				objAccessRole[_vids[i]] = getRandom(0,1);
				objAccessUser[_vids[i]] = getRandom(0,1);
			}

			//Формируем объект запрос на сохранение прав
			var queryForSave = {
				access:{
					viewName: viewName,
					role: role,
					objAccess: objAccessRole
				}
			};

			controller.create(queryForSave, function( err, reply ) {
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

				controller.create(queryForSave, function( err, reply ) {
					test.ifError(err);
					test.ok(reply);

					test.done();
				});
			});
		},
		getTemplateFromView: function( test ) {
			var viewName = testData3.viewName;
			var role = testData3.userRole;
			var user = testData3.userLogin;
			var objAccessRole = testData3.objAccessForRole;
			var objAccessUser = testData3.objAccessForUser;
			var socket = {};

			//Формируем список разрешенных идентификаторов по объекту прав
			var _vidsFromRole = Object.keys(objAccessRole);
			var _vidsFromUser = Object.keys(objAccessUser);
			var listAllowed_vids = [];
			var addRole = [];
			var delRole = [];
			var addUser = [];
			var delUser = [];

			for( var i = 0; i < _vidsFromRole.length; i++ ){
				if ( objAccessRole[_vidsFromRole[i]] === 1 ) {
					addRole.push(_vidsFromRole[i]);
				} else {
					delRole.push(_vidsFromRole[i]);
				}
			}

			for( var i = 0; i < _vidsFromUser.length; i++ ){
				if ( objAccessUser[_vidsFromUser[i]] === 1 ) {
					addUser.push(_vidsFromUser[i]);
				} else {
					delUser.push(_vidsFromUser[i]);
				}
			}

			listAllowed_vids = underscore.difference(addRole, delRole);
			listAllowed_vids = underscore.union(listAllowed_vids, addUser);
			listAllowed_vids = underscore.difference(listAllowed_vids, delUser);

			test.expect( ( listAllowed_vids.length + 4 ) );

			controller.getTemplate( viewName, user, role, socket, function( err, config, template ) {
				test.ifError(err);
				test.ok(config);
				test.ok(template);

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
		deleteAccessUserAndRoleForView:function(test){
			test.expect(4);
			var role = testData3.userRole;
			var login = testData3.userLogin;
			var viewName = testData3.viewName;

			//Формируем объект запрос на удаление прав по пользователю
			var queryForDelete = {
				access: {
					viewName:viewName,
					login:login
				}
			};

			controller.delete(queryForDelete, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);

				//Формируем объект запрос на удаление прав по роли
				var queryForDelete = {
					access: {
						viewName:viewName,
						role:role
					}
				};

				controller.delete(queryForDelete, function( err, reply ) {
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
			read: {},
			modify: {},
			create: {},
			createAll: 0,
			delete: 0
		},
		viewNameForRead: 'testView2',
		testObjViewAccess: {},
		socket:{},
		listAllowed_vids:[],
		listNotAllowed_vids:[]
	},
	testCreate:{
		testObjAccessFlexo: {
			read: {},
			modify: {},
			create: {},
			createAll: 0,
			delete: 0
		},
		viewNameForCreate: 'testView3',
		testObjViewAccess: {},
		socket:{},
		listAllowed_vids:[],
		listNotAllowed_vids:[],
		listNotFlexo_vids:[]
	},
	testModify:{
		testObjAccessFlexoRole:{
			read: {},
			modify: {},
			create: {},
			createAll: 0,
			delete: 0
		},
		testObjAccessFlexoUser:{
			read: {},
			modify: {},
			create: {},
			createAll: 0,
			delete: 0
		},
		viewNameForModify: 'testView4',
		testObjViewAccessUser: {},
		testObjViewAccessRole: {},
		socket:{},
		flexoAllowedField:'',
		_vidAllowed:''
	}
};

//Тестирование определения пересечения прав для view, в view некоторые идентификаторы
// связанны с Flexo
exports.viewWithFlexo = {
	readAccess:{
		saveFlexoReadAccessOnlyForRole: function(test){
			test.expect( 2 );

			var objAccess = testData4.testRead.testObjAccessFlexo;
			var role = testData4.userRole;
			var flexoSchemeName = testData4.flexoSchemeName;

			//Генерируем права на чтение
			var notAccess = getRandom(0, (globalFlexoSchemes[flexoSchemeName].read.length - 1) );

			for( var i=0; i < globalFlexoSchemes[flexoSchemeName].read.length; i++ ) {
				if (i === notAccess) {
					objAccess.read[globalFlexoSchemes[flexoSchemeName].read[i]] = 0;
				} else {
					objAccess.read[globalFlexoSchemes[flexoSchemeName].read[i]] = 1;
				}
			}

			//Формируем запрос на сохранение прав по поли для flexo схемы
			var queryForSave = {
				access:{
					flexoSchemeName: flexoSchemeName,
					role:role,
					objAccess: objAccess
				}
			};

			controller.create(queryForSave, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});

		},
		saveViewAccessOnlyForRole: function(test){
			test.expect( 2 );

			var objAccess = testData4.testRead.testObjViewAccess;
			var role = testData4.userRole;
			var viewName = testData4.testRead.viewNameForRead;

			//Наполняем разрешениями view
			var listOf_vids = Object.keys(testObjGlobalViewsConfig[viewName]);

			for(var i = 0; i < listOf_vids.length; i++ ) {
				objAccess[listOf_vids[i]] = 1;
			}

			//Формируем объект запрос на сохранение прав
			var queryForSave = {
				access:{
					viewName: viewName,
					role: role,
					objAccess: objAccess
				}
			};

			controller.create(queryForSave, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});
		},
		getTemplateFromView: function(test){
			var role = testData4.userRole;
			var user = testData4.userLogin;
			var socket = testData4.testRead.socket;
			var viewName = testData4.testRead.viewNameForRead;
			var objViewAccess = testData4.testRead.testObjViewAccess;
			var objFlexoReadAccess = testData4.testRead.testObjAccessFlexo.read;
			var globalViewConfig = testObjGlobalViewsConfig[viewName];

			//Определяем перечень разрешенных идентификаторов view
			var listAllowed_vids = [];
			var _vids = Object.keys(objViewAccess);

			for( var i = 0; i < _vids.length; i++ ){
				if( objViewAccess[_vids[i]] === 1 ) {
					listAllowed_vids.push(_vids[i]);
				}
			}

			//Сверяем разрещения на чтение по _vids
			var list_vidsForRemove = [];
			var fieldsForRead = Object.keys( objFlexoReadAccess );
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

			listAllowed_vids = underscore.difference(listAllowed_vids, list_vidsForRemove);

			testData4.testRead.listAllowed_vids = listAllowed_vids;
			testData4.testRead.listNotAllowed_vids = list_vidsForRemove;

			test.expect( ( listAllowed_vids.length + 4 ) );

			controller.getTemplate( viewName, user, role, socket, function( err, config, template ) {
				test.ifError(err);
				test.ok(config);
				test.ok(template);

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
		queryToRead: {
			allowed_vidsInSelectorAndSort: function(test) {
				test.expect( 2 );
				var viewName = testData4.testRead.viewNameForRead;
				var socket = testData4.testRead.socket;
				var allowedListOf_vids = testData4.testRead.listAllowed_vids;

				//Формируем запрос на чтение
				var randFieldForSelector =
					allowedListOf_vids[getRandom(0, (allowedListOf_vids.length - 1))];
				var randFieldForSort =
					allowedListOf_vids[getRandom(0, (allowedListOf_vids.length - 1))];

				var request = {};
				request['queries'] = {};
				request['queries']['selector'] = {};
				request['queries']['selector'][randFieldForSelector] = generatorString(1,10);
				request['queries']['options'] = {};
				request['queries']['options']['sort'] = {};
				request['queries']['options']['sort'][randFieldForSort] = getRandom(0,1);

				controller.queryToView ( 'read', request, viewName, socket, function(err, reply) {
					test.ifError(err);
					test.ok(reply);
					test.done();
				});
			},
			notAllowed_vidInSelector: function(test){
				test.expect( 1 );
				var viewName = testData4.testRead.viewNameForRead;
				var socket = testData4.testRead.socket;
				var allowedListOf_vids = testData4.testRead.listAllowed_vids;
				var notAllowedListOf_vids = testData4.testRead.listNotAllowed_vids;

				//Формируем запрос на чтение
				var randFieldForSelector =
					notAllowedListOf_vids[getRandom(0, (notAllowedListOf_vids.length - 1))];
				var randFieldForSort =
					allowedListOf_vids[getRandom(0, (allowedListOf_vids.length - 1))];

				var request = {};
				request['queries'] = {};
				request['queries']['selector'] = {};
				request['queries']['selector'][randFieldForSelector] = generatorString(1,10);
				request['queries']['options'] = {};
				request['queries']['options']['sort'] = {};
				request['queries']['options']['sort'][randFieldForSort] = getRandom(0,1);

				controller.queryToView ( 'read', request, viewName, socket, function(err, reply) {
					test.strictEqual(err.message, 'Requested more fields than allowed to read');
					test.done();
				});
			},
			notAllowed_vidInSort: function(test){
				test.expect( 1 );
				var viewName = testData4.testRead.viewNameForRead;
				var socket = testData4.testRead.socket;
				var allowedListOf_vids = testData4.testRead.listAllowed_vids;
				var notAllowedListOf_vids = testData4.testRead.listNotAllowed_vids;

				//Формируем запрос на чтение
				var randFieldForSelector =
					allowedListOf_vids[getRandom(0, (allowedListOf_vids.length - 1))];
				var randFieldForSort =
					notAllowedListOf_vids[getRandom(0, (notAllowedListOf_vids.length - 1))];


				var request = {};
				request['queries'] = {};
				request['queries']['selector'] = {};
				request['queries']['selector'][randFieldForSelector] = generatorString(1,10);
				request['queries']['options'] = {};
				request['queries']['options']['sort'] = {};
				request['queries']['options']['sort'][randFieldForSort] = getRandom(0,1);

				controller.queryToView ( 'read', request, viewName, socket, function(err, reply) {
					test.strictEqual(err.message, 'Requested more fields than allowed to read');
					test.done();
				});
			}
		},
		deleteFlexoAndViewAccess: function(test){
			test.expect( 4 );
			var role = testData4.userRole;
			var viewName = testData4.testRead.viewNameForRead;
			var flexoSchemeName = testData4.flexoSchemeName;

			//Формируем объект запрос на удаление view прав по роли
			var queryForDelete = {
				access: {
					viewName:viewName,
					role:role
				}
			};

			controller.delete(queryForDelete, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);

				//Формируем объект запрос на удаление flexo прав по роли
				var queryForDelete = {
					access: {
						flexoSchemeName:flexoSchemeName,
						role:role
					}
				};

				controller.delete(queryForDelete, function( err, reply ) {
					test.ifError(err);
					test.ok(reply);
					test.done();
				});
			});
		}
	},
	createAccess:{
		saveFlexoCreateAccessOnlyForUser: function(test){
			test.expect( 2 );

			var objAccess = testData4.testCreate.testObjAccessFlexo;
			var login = testData4.userLogin;
			var flexoSchemeName = testData4.flexoSchemeName;

			//Генерируем права на создание
			var notAccess = getRandom(0, (globalFlexoSchemes[flexoSchemeName].modify.length - 1) );

			for( var i=0; i < globalFlexoSchemes[flexoSchemeName].modify.length; i++ ) {
				if (i === notAccess) {
					objAccess.create[globalFlexoSchemes[flexoSchemeName].modify[i]] = 0;
				} else {
					objAccess.create[globalFlexoSchemes[flexoSchemeName].modify[i]] = 1;
				}
			}

			//Разрешение на схему
			objAccess.createAll = 1;

			//Формируем запрос на сохранение прав по пользователю для flexo схемы
			var queryForSave = {
				access:{
					flexoSchemeName: flexoSchemeName,
					login:login,
					objAccess: objAccess
				}
			};

			controller.create(queryForSave, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});

		},
		saveViewAccessOnlyForUser: function(test){
			test.expect( 2 );

			var objAccess = testData4.testCreate.testObjViewAccess;
			var login = testData4.userLogin;
			var viewName = testData4.testCreate.viewNameForCreate;

			//Наполняем разрешениями view
			var listOf_vids = Object.keys(testObjGlobalViewsConfig[viewName]);

			for(var i = 0; i < listOf_vids.length; i++ ) {
				objAccess[listOf_vids[i]] = 1;
			}

			//Формируем объект запрос на сохранение прав
			var queryForSave = {
				access:{
					viewName: viewName,
					login: login,
					objAccess: objAccess
				}
			};

			controller.create(queryForSave, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				test.done();
			});
		},
		getTemplateFromView: function(test){
			var role = testData4.userRole;
			var user = testData4.userLogin;
			var socket = testData4.testCreate.socket;
			var viewName = testData4.testCreate.viewNameForCreate;
			var objViewAccess = testData4.testCreate.testObjViewAccess;
			var objFlexoCreateAccess = testData4.testCreate.testObjAccessFlexo.create;
			var objFlexoCreateAllAccess = testData4.testCreate.testObjAccessFlexo.createAll;
			var globalViewConfig = testObjGlobalViewsConfig[viewName];

			//Определяем перечень разрешенных идентификаторов view
			var listAllowed_vids = [];
			var _vids = Object.keys(objViewAccess);

			for( var i = 0; i < _vids.length; i++ ){
				if( objViewAccess[_vids[i]] === 1 ) {
					listAllowed_vids.push(_vids[i]);
				}
			}

			//Сверяем разрещения на создание по _vids
			var list_vidsForRemove = [];
			var listNotFlexo_vids = [];
			var fieldsForCreate = Object.keys( objFlexoCreateAccess );
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

			listAllowed_vids = underscore.difference(listAllowed_vids, list_vidsForRemove);

			testData4.testCreate.listAllowed_vids = listAllowed_vids;
			testData4.testCreate.listNotAllowed_vids = list_vidsForRemove;
			testData4.testCreate.listNotFlexo_vids = listNotFlexo_vids;

			test.expect( ( listAllowed_vids.length + 4 ) );
			debugger;
			controller.getTemplate( viewName, user, role, socket, function( err, config, template ) {
				test.ifError(err);
				test.ok(config);
				test.ok(template);

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
		queryToCreate:{
			allowed_vidsInQueries: function( test ) {
                test.expect( 2 );
				var viewName = testData4.testCreate.viewNameForCreate;
				var socket = testData4.testCreate.socket;

				var listAllowed_vids = testData4.testCreate.listAllowed_vids;
				var listNotFlexo_vids = testData4.testCreate.listNotFlexo_vids;
				var listAllowed_vidsWithFlexo =
					underscore.difference(listAllowed_vids, listNotFlexo_vids);

				//Формируем запрос на создание
				var queryToCreate = {};
				queryToCreate.queries = {};

				for(var i=0; i<listAllowed_vidsWithFlexo.length; i++){
					queryToCreate.queries[listAllowed_vidsWithFlexo[i]] = getRandom(0, 10000);
				}

				controller.queryToView ( 'create', queryToCreate, viewName, socket,
					function(err, reply) {
                    test.ifError(err);
					var _vids = Object.keys(reply[0]);
					test.ok(_vids.length);
					test.done();
				});
			},
			notAllowed_vidsInQueries: function( test ) {
				test.expect( 1 );
				var viewName = testData4.testCreate.viewNameForCreate;
				var socket = testData4.testCreate.socket;

				var listAllowed_vids = testData4.testCreate.listAllowed_vids;
				var listNotFlexo_vids = testData4.testCreate.listNotFlexo_vids;
				var listNotAllowed_vids = testData4.testCreate.listNotAllowed_vids;
				var listAllowed_vidsWithFlexo =
					underscore.difference(listAllowed_vids, listNotFlexo_vids);

				//Формируем запрос на создание
				var queryToCreate = {};
				queryToCreate.queries = {};

				for(var i=0; i<listAllowed_vidsWithFlexo.length; i++){
					queryToCreate.queries[listAllowed_vidsWithFlexo[i]] = getRandom(0, 10000);
				}

				for(var i=0; i<listNotAllowed_vids.length; i++){
					queryToCreate.queries[listNotAllowed_vids[i]] = getRandom(0, 10000);
				}

				controller.queryToView ( 'create', queryToCreate, viewName, socket,
					function(err, reply) {
						test.strictEqual(err.message, 'No permission to create in view');
						test.done();
					});
			}
		},
		deleteFlexoAndViewAccess: function(test){
			test.expect( 4 );
			var login = testData4.userLogin;
			var viewName = testData4.testCreate.viewNameForCreate;
			var flexoSchemeName = testData4.flexoSchemeName;

			//Формируем объект запрос на удаление view прав по роли
			var queryForDelete = {
				access: {
					viewName:viewName,
					login:login
				}
			};

			controller.delete(queryForDelete, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);

				//Формируем объект запрос на удаление flexo прав по роли
				var queryForDelete = {
					access: {
						flexoSchemeName:flexoSchemeName,
						login:login
					}
				};

				controller.delete(queryForDelete, function( err, reply ) {
					test.ifError(err);
					test.ok(reply);
					test.done();
				});
			});
		}
	},
	modifyAccess:{
		saveFlexoCreateAccessForRoleAndUser: function(test){
			test.expect( 4 );

			var objAccessForRole = testData4.testModify.testObjAccessFlexoRole;
			var objAccessForUser = testData4.testModify.testObjAccessFlexoUser;
			var login = testData4.userLogin;
			var role = testData4.userRole;
			var flexoSchemeName = testData4.flexoSchemeName;

			//Генерируем права на модификацию для роли
			var notAccessRole = getRandom(0, (globalFlexoSchemes[flexoSchemeName].modify.length - 1) );

			//Устанавливаем спец поле '(all)'
			objAccessForRole.modify['(all)'] = 1;

			for( var i = 0; i < globalFlexoSchemes[flexoSchemeName].modify.length; i++ ) {
				if (i === notAccessRole) {
					objAccessForRole.modify[globalFlexoSchemes[flexoSchemeName].modify[i]] = 0;
				}
			}

			//Генерируем права на модификацию для пользователя
			var notAccessUser = getRandom(0, (globalFlexoSchemes[flexoSchemeName].modify.length - 1) );
			objAccessForUser.modify['(all)'] = 0;
			for( var i = 0; i < globalFlexoSchemes[flexoSchemeName].modify.length; i++ ) {
				if (i === notAccessUser) {
					objAccessForUser.modify[globalFlexoSchemes[flexoSchemeName].modify[i]] = 1;
					flexoAllowedField = globalFlexoSchemes[flexoSchemeName].modify[i];
				}
			}

			testData4.testModify.flexoAllowedField = flexoAllowedField;

			//Формируем запрос на сохранение прав по пользователю для flexo схемы
			var queryForSave = {
				access:{
					flexoSchemeName: flexoSchemeName,
					login:login,
					objAccess: objAccessForUser
				}
			};

			controller.create(queryForSave, function( err, reply ) {
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

				controller.create(queryForSave, function( err, reply ) {
					test.ifError(err);
					test.ok(reply);
					test.done();
				});
			});

		},
		saveViewAccessForRoleAndUser: function(test){
			test.expect( 4 );

			var objAccessUser = testData4.testModify.testObjViewAccessUser;
			var objAccessRole = testData4.testModify.testObjViewAccessRole;
			var login = testData4.userLogin;
			var role = testData4.userRole;
			var viewName = testData4.testModify.viewNameForModify;

			//Наполняем разрешениями view для роли
			var listOf_vids = Object.keys(testObjGlobalViewsConfig[viewName]);

			for(var i = 0; i < listOf_vids.length; i++ ) {
				objAccessRole[listOf_vids[i]] = getRandom(0, 1);
			}

			//Наполняем разрешениями view для пользователя
			objAccessUser['(all)'] = 1;

			//Формируем объект запрос на сохранение прав по пользователю
			var queryForSave = {
				access:{
					viewName: viewName,
					login: login,
					objAccess: objAccessUser
				}
			};

			controller.create(queryForSave, function( err, reply ) {
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

				controller.create(queryForSave, function( err, reply ) {
					test.ifError(err);
					test.ok(reply);
					test.done();
				});
			});
		},
		getTemplateFromView:function(test){
			test.expect( 5 );

			var viewName = testData4.testModify.viewNameForModify;
			var user = testData4.userLogin;
			var role = testData4.userRole;
			var socket = testData4.testModify.socket;
			var globalViewConfig = testObjGlobalViewsConfig[viewName];
			debugger;
			//Находим единственный идентификатор который разрешен в этом тесте
			var flexoAllowedField = testData4.testModify.flexoAllowedField;
			var _vidAllowed;
			var listOf_vids = Object.keys(globalViewConfig);

			for( var i = 0; i < listOf_vids.length; i++ ) {
				if(globalViewConfig[listOf_vids[i]].flexo.length !== 0) {
					if(globalViewConfig[listOf_vids[i]].flexo[1] === flexoAllowedField) {
						_vidAllowed = listOf_vids[i];
					}
				}
			}

			testData4.testModify._vidAllowed = _vidAllowed;
			debugger;
			controller.getTemplate( viewName, user, role, socket, function( err, config, template ) {
				test.ifError(err);
				test.ok(config);
				test.ok(template);

				//Проверяем список идентификаторов сохраненных у объекта socket
				if( socket.view && socket.view[viewName] ){
					test.strictEqual(socket.view[viewName].length, 1,
						'Проверяем количество разрешенных идентификаторов view');


					var result = underscore.indexOf( socket.view[viewName], _vidAllowed );
					test.notStrictEqual(result, -1,	'Проверка наличия разрешенного ' +
						'идентификатора view в списке разрашенных у socket' );

				}

				test.done();
			} );

		}
	}
};

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

