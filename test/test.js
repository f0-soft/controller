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

//Имитация глобальной переменной для хранения общих данных о view
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
		p10:{flexo:['testUsers', '_tsUpdate'], type:'read'}
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
		e3:{flexo:['testUsers'], type:'delete'}
	}
};

//Имитация глобальной переменной с информацией из flexo схем
//сигнатура {schemeName:{read:[fieldsNames], modify:[fieldsNames]}
var globalFlexoSchemes = {
	'testUsers': {
		read: ['_id', 'tsUpdate','login', 'role', 'name', 'lastname', 'position', 'company',
			'hash', 'salt'],
		modify: ['login', 'role', 'name', 'lastname', 'position', 'company', 'hash', 'salt']
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
	redisConfig: {},
	view:View,
	flexoSchemes:globalFlexoSchemes,
	viewConfig:testObjGlobalViewsConfig
};

//Тестирование инициализации контроллера и view
exports.testInit = {
	initView: function(test){

		if( mock.view ) {
			test.expect( 7 );
			View.init({}, function( err, reply ){
				test.ifError(err);
				test.ok(reply);
				test.ok(View.getTemplate);
				test.ok(View.find);
				test.ok(View.insert);
				test.ok(View.modify);
				test.ok(View.delete);
				test.done();
			});
		} else {
			test.expect( 6 );

			var config = {
				pRabbit: require('f0.rabbit'),
				pFlexo: require('f0.flexo'),
				pView: require('f0.view'),
				scheme_flexo: __dirname + '/scheme/flexo/',
				scheme_view: __dirname + '/scheme/view/',
				template: __dirname + '/scheme/template/'
			};
			debugger
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
	initController: function (test) {
		test.expect( 6 );
		debugger
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
	},
	testDelete:{
		testObjAccessFlexoRole:{
			read: {},
			modify: {},
			create: {},
			createAll: 0,
			delete: 1
		},
		viewNameForDelete: 'testView5',
		testObjViewAccessRole: {},
		socket:{}
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
				request['selector'] = {};
				request['selector'][randFieldForSelector] = generatorString(1,10);
				request['options'] = {};
				request['options']['sort'] = {};
				request['options']['sort'][randFieldForSort] = getRandom(0,1);

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
				request['selector'] = {};
				request['selector'][randFieldForSelector] = generatorString(1,10);
				request['options'] = {};
				request['options']['sort'] = {};
				request['options']['sort'][randFieldForSort] = getRandom(0,1);

				controller.queryToView ( 'read', request, viewName, socket, function(err, reply) {
					test.strictEqual(err.message, 'Controller: Requested more fields than ' +
						'allowed to read');
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
				request['selector'] = {};
				request['selector'][randFieldForSelector] = generatorString(1,10);
				request['options'] = {};
				request['options']['sort'] = {};
				request['options']['sort'][randFieldForSort] = getRandom(0,1);

				controller.queryToView ( 'read', request, viewName, socket, function(err, reply) {
					test.strictEqual(err.message, 'Controller: Requested more fields than ' +
						'allowed to read');
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

				var viewName = testData4.testCreate.viewNameForCreate;
				var socket = testData4.testCreate.socket;

				var listAllowed_vids = testData4.testCreate.listAllowed_vids;
				var listNotFlexo_vids = testData4.testCreate.listNotFlexo_vids;
				var listAllowed_vidsWithFlexo =
					underscore.difference(listAllowed_vids, listNotFlexo_vids);

				//Формируем запрос на создание
				var queryToCreate = {};

				for(var i=0; i<listAllowed_vidsWithFlexo.length; i++){
					queryToCreate[listAllowed_vidsWithFlexo[i]] = getRandom(0, 10000);
				}

				test.expect( listAllowed_vidsWithFlexo.length + 2 );

				controller.queryToView ( 'create', queryToCreate, viewName, socket,
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

				for(var i=0; i<listAllowed_vidsWithFlexo.length; i++){
					queryToCreate[listAllowed_vidsWithFlexo[i]] = getRandom(0, 10000);
				}

				for(var i=0; i<listNotAllowed_vids.length; i++){
					queryToCreate[listNotAllowed_vids[i]] = getRandom(0, 10000);
				}

				controller.queryToView ( 'create', queryToCreate, viewName, socket,
					function(err, reply) {
						test.strictEqual(err.message, 'Controller: No permission to create in view');
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

			//Генерируем права на чтение для роли
			for( var i = 0; i < globalFlexoSchemes[flexoSchemeName].read.length; i++ ) {
				objAccessForRole.read[globalFlexoSchemes[flexoSchemeName].read[i]] = 1;
			}

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
			test.expect( 7 );
			var viewName = testData4.testModify.viewNameForModify;
			var user = testData4.userLogin;
			var role = testData4.userRole;
			var socket = testData4.testModify.socket;
			var globalViewConfig = testObjGlobalViewsConfig[viewName];

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

			//Получаем _vid для полей _id и tsUpdate
			var _vidsForSelector = [];
			for(var i=0; i<listOf_vids.length; i++){
				if(testObjGlobalViewsConfig[viewName][listOf_vids[i]].type === 'read'){
					_vidsForSelector.push(listOf_vids[i]);
				}
			}

			testData4.testModify._vidAllowed = _vidAllowed;

			controller.getTemplate( viewName, user, role, socket, function( err, config, template ) {
				test.ifError(err);
				test.ok(config);
				test.ok(template);

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
		queryToModify:{
			allowed_vidsInQueriesProperties: function ( test ) {
				test.expect( 2 );
				var viewName = testData4.testModify.viewNameForModify;
				var socket = testData4.testModify.socket;
				var allowed_vid = testData4.testModify._vidAllowed;
				var listOf_vids = Object.keys(testObjGlobalViewsConfig[viewName]);
				listOf_vids = underscore.without(listOf_vids, allowed_vid);

				//Получаем _vid для полей _id и tsUpdate
				var _vidsForSelector = [];
				for(var i=0; i<listOf_vids.length; i++){
					if(testObjGlobalViewsConfig[viewName][listOf_vids[i]].type === 'read'){
						_vidsForSelector.push(listOf_vids[i]);
					}
				}

				//Формируем запрос на модификацию
				var request = {};
				request['selector'] = {};
				request['selector'][_vidsForSelector[0]] = generatorString(1,10);
				request['selector'][_vidsForSelector[1]] = generatorString(1,10);
				request['properties'] = {};
				request['properties'][allowed_vid] = generatorString(1,10);

				controller.queryToView ( 'modify', request, viewName, socket, function(err, reply) {
					test.ifError(err);
					test.ok(reply);
					test.done();
				})

			},
			notAllowed_vidsInQueriesProperties: function ( test ) {
				test.expect( 1 );
				var viewName = testData4.testModify.viewNameForModify;
				var socket = testData4.testModify.socket;
				var allowed_vid = testData4.testModify._vidAllowed;
				var listOf_vids = Object.keys(testObjGlobalViewsConfig[viewName]);
				listOf_vids = underscore.without(listOf_vids, allowed_vid);

				//Формируем запрос на модификацию
				var request = {};
				request['selector'] = {};
				request['selector'][allowed_vid] = generatorString(1,10);
				request['properties'] = {};
				request['properties']
					[listOf_vids[generatorString(0,(listOf_vids.length - 1))]]
					= generatorString(1,10);

				controller.queryToView ( 'modify', request, viewName, socket, function(err, reply) {
					test.strictEqual(err.message, 'Controller: No permission to modify in view');
					test.done();
				})

			}
		},
		deleteFlexoAndViewAccess: function(test){
			test.expect( 8 );
			var login = testData4.userLogin;
			var role = testData4.userRole;
			var viewName = testData4.testCreate.viewNameForCreate;
			var flexoSchemeName = testData4.flexoSchemeName;

			//Формируем объект запрос на удаление view прав по пользователю
			var queryForDelete = {
				access: {
					viewName:viewName,
					login:login
				}
			};

			controller.delete(queryForDelete, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);

				//Формируем объект запрос на удаление flexo прав по пользователю
				var queryForDelete = {
					access: {
						flexoSchemeName:flexoSchemeName,
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
							role:role
						}
					};

					controller.delete(queryForDelete, function( err, reply ) {
						test.ifError(err);
						test.ok(reply);
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
							test.done();
						});
					});
				});
			});
		}

	},
	deleteAccess:{
		saveFlexoCreateAccessForRoleAndUser: function(test){
			test.expect( 2 );

			var objAccessForRole = testData4.testDelete.testObjAccessFlexoRole;
			var role = testData4.userRole;
			var flexoSchemeName = testData4.flexoSchemeName;

			//Генерируем права на чтение для роли
			for( var i = 0; i < globalFlexoSchemes[flexoSchemeName].read.length; i++ ) {
                objAccessForRole.read[globalFlexoSchemes[flexoSchemeName].read[i]] = 1;
			}

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
		},
		saveViewAccessForRoleAndUser: function(test){
			test.expect( 2 );

			var objAccessRole = testData4.testDelete.testObjViewAccessRole;
			var role = testData4.userRole;
			var viewName = testData4.testDelete.viewNameForDelete;

			//Наполняем разрешениями view для роли
			var listOf_vids = Object.keys(testObjGlobalViewsConfig[viewName]);

			for(var i = 0; i < listOf_vids.length; i++ ) {
				objAccessRole[listOf_vids[i]] = 1;
			}

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
		},
		getTemplateFromView: function ( test ) {


			var viewName = testData4.testDelete.viewNameForDelete;
			var user = testData4.userLogin;
			var role = testData4.userRole;
			var socket = testData4.testDelete.socket;
			var globalViewConfig = testObjGlobalViewsConfig[viewName];

			//Все идентификаторы разрешены в этом тесте
			var listAllowed_vids = Object.keys(globalViewConfig);

			debugger;
			test.expect( listAllowed_vids.length + 4 );
			controller.getTemplate( viewName, user, role, socket, function( err, config, template ) {
				test.ifError(err);
				test.ok(config);
				test.ok(template);
				debugger;
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
		queryToDelete:{
			allowed_vidsInQueriesSelector: function ( test ) {
				test.expect( 2 );
				var viewName = testData4.testDelete.viewNameForDelete;
				var socket = testData4.testDelete.socket;
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
				var request = {};
				request['selector'] = {};
				request['selector'][listOf_vids[0]] = generatorString(1,10);
				request['selector'][listOf_vids[1]] = generatorString(1,10);
				debugger;
				controller.queryToView ( 'delete', request, viewName, socket, function(err, reply) {
					test.ifError(err);
					test.ok(reply);
					test.done();
				});

			},
			notAllowed_vidsInQueriesSelector: function ( test ) {
				test.expect( 1 );
				var viewName = testData4.testDelete.viewNameForDelete;
				var socket = testData4.testDelete.socket;
				var listOf_vids = Object.keys(testObjGlobalViewsConfig[viewName]);
				var notFlexoFields_vid;

				listOf_vids = underscore.without(listOf_vids, notFlexoFields_vid);

				//Формируем запрос на модификацию
				var request = {};
				request['selector'] = {};
				request['selector']['sss'] = generatorString(1,10);

				controller.queryToView ( 'delete', request, viewName, socket, function(err, reply) {
					test.strictEqual(err.message, 'Controller: No permission to delete in view');
					test.done();
				});
			}
		},
		deleteFlexoAndViewAccess: function(test){
			test.expect( 4 );
			var role = testData4.userRole;
			var viewName = testData4.testDelete.viewNameForDelete;
			var flexoSchemeName = testData4.flexoSchemeName;


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
					test.done();
				});
			});

		}
	}
};

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

//    ----------------------------------
//    Блок инициализации паралельной
//    ----------------------------------
	View = view;
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
			view.init({provider: arg, views: flexoGlobal, templatePath: config.template}, cb);

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

