var redis = require('redis');
var sys = require('sys');
var async = require('async');
var underscore = require('underscore');

var AccessModuleRoleView = require('./modules/access_module_role_view.js');
var AccessModuleUserView = require('./modules/access_module_user_view.js');
var AccessModuleRoleFlexo = require('./modules/access_module_role_flexo.js');
var AccessModuleUserFlexo = require('./modules/access_module_user_flexo.js');

var ModuleUser = require('./modules/module_user.js');

var client;
var globalFlexoSchemes;
var globalViewConfig;
var flexo;
var View;

var Controller = {};
//Константы
var INITIALIZED = false;
var CREATE = 'create';
var READ = 'read';
var MODIFY = 'modify';
var DELETE = 'delete';


module.exports = Controller;

/**
 * Инициализация контроллера
 *
 * @param config - объект с параметрами инициализации
 * @param callback
 */
Controller.init = function init( config, callback ) {
	if (!underscore.isFunction(callback)){
		throw new Error( 'Controller: callback not a function' );
	}

	if ( config.view ) {
		View = config.view;
	} else {
		callback( new Error( 'Controller: Parameter view is not specified in the config object' ) );
		return;
	}

	if ( config.viewConfig ) {
		globalViewConfig = config.viewConfig;
	} else {
		callback( new Error( 'Controller: Parameter viewConfig is not specified in the config ' +
			'object' ) );
		return;
	}

	if ( config.flexoSchemes ) {
		globalFlexoSchemes = config.flexoSchemes;
	} else {
		callback( new Error( 'Controller: Parameter flexoSchemes is not specified in the config ' +
			'object' ) );
		return;
	}

	if ( config.redisConfig ) {
		if ( config.redisConfig.max_attempts ) {
			client = redis.createClient( config.redisConfig.port, config.redisConfig.host,
				{ max_attempts: config.redisConfig.max_attempts } );

			client.on( "error", function (err) {
				callback( err );
			});

			client.on( "ready", function (err) {
				INITIALIZED = true;
				callback( null, true );
			});
		} else {
			client = redis.createClient( config.redisConfig.port, config.redisConfig.host );

			client.on( "error", function (err) {
				callback( err );
			});

			client.on( "ready", function (err) {
				INITIALIZED = true;
				callback( null, true );
			});
		}
	} else {
		client = redis.createClient();

		client.on( "error", function (err) {
			callback( err );
		});

		client.on( "ready", function (err) {
			INITIALIZED = true;
			callback( null, true );
		});
	}
};

Controller.create = function create( query, callback ) {

	if (!underscore.isFunction(callback)){
		throw new Error( 'Controller: callback not a function' );
	}

	if ( !INITIALIZED ) {
		callback(new Error( 'Controller: Flexo initialization required' ));
		return;
	}

	/*if ( query.user ) {
		//Запрос на создание пользователя

		//Создаем модель пользователя
		model = new ModelUser( client );
		//Проверяем уникальность создаваемого пользователя
		var viewName = 'viewUsers';
		var flexoSchemeName = 'users';
		model.checkUnique( query.user.queries[flexoSchemeName].login, function ( err ) {
			if ( err ) {
				callback ( err );
			} else {
				//Создаем view
				//ToDo: передавать имя view и flexo
				//ToDo: передавать на socket???
				//ToDo: валидация запроса
				if ( globalViewConfig[viewName] ) {
					var dbAccess = {};
					dbAccess['insert'] = globalViewConfig[viewName];

					var viewModelUsers = new View(viewName, dbAccess, {});

					var document = underscore.clone( query.user );
					//Удаляем пороль из сохраняемго в flexo документа
					if ( document.queries && document.queries[flexoSchemeName] &&
						document.queries[flexoSchemeName].pass ){
						delete document.queries[flexoSchemeName].pass;
					}

					//Сохраняем документ вo view
					viewModelUsers.insert( document, function( err, result ) {
						if ( err ) {
							callback ( err );
						} else {

							query.user.queries[flexoSchemeName]._id =
								result[flexoSchemeName][0]._id;
							//Сохраняем документ в redis
							model.create( query.user.queries[flexoSchemeName], function( err ){
								if(err){
									callback( err );
								} else {
									callback( err, result );
								}
							} );
						}
					});
				} else {
					callback( new Error( 'No description in global object view with name:' +
						viewName) );
				}
			}
		});
	} else*/ if ( query.access ) {
		//Запроса на создание прав
		if ( query.access.viewName ) {
			//Запрос на создание прав view
			if ( query.access.role ) {
				//Запрос на создание прав view по роли
				//ToDo:проверка на целостность пришедших данных
				AccessModuleRoleView.save( client, query.access.role, query.access.viewName,
					query.access.objAccess, callback );
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю
				//ToDo:проверка на целостность пришедших данных
				//Создаем модель прав по пользователю для view
				AccessModuleUserView.save( client, query.access.login, query.access.viewName,
					query.access.objAccess, callback );

			} else {
				callback( new Error( 'Controller: Not set role or login in query: '
					+ JSON.stringify( query ) ) )
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на создание прав flexo по роли
				AccessModuleRoleFlexo.save( client, query.access.role, query.access.flexoSchemeName,
					query.access.objAccess, callback );

			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю
				AccessModuleUserFlexo.save( client, query.access.login,
					query.access.flexoSchemeName, query.access.objAccess, callback );
			} else {
				callback( new Error( 'Controller: Not set role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else {
			callback( new Error( 'Controller: Incorrect parameter access in query: '
				+ JSON.stringify( query ) ) );
		}
	} else {
		callback( new Error( 'Controller: Invalid query: ' + JSON.stringify( query ) ) );
	}
};

Controller.find = function find( query, callback ) {

	if (!underscore.isFunction(callback)){
		throw new Error( 'Controller: callback not a function' );
	}

	if ( !INITIALIZED ) {
		callback(new Error( 'Controller: Flexo initialization required' ));
		return;
	}

	var model;
	/*if ( query.user ) {
		var flexoSchemeName = 'users';
		if( query.user.login || query.user._id ){
		    //Простой поиск одного пользователя
			var login = query.user.login || null;
			var _id = query.user._id || null;
			//Создаем модель пользователя
			model = new ModelUser( client, login, _id );
			model.find( function(err, reply){
				if ( err ){
					callback( err );
				} else {
					var obj = {};
					obj[flexoSchemeName] = [reply];
					callback(null, obj);
				}
			} );
		} else if (query.user.queries){
			//Сложный поиск
			var viewName = 'viewUsers';
			var flexoSchemeName = 'users';
			//Создаем view модель
			if ( globalViewConfig[viewName] ) {
				var dbAccess = {};
				dbAccess['read'] = globalViewConfig[viewName];

				var viewModelUsers = new View(viewName, dbAccess, {});

				viewModelUsers.find( query.user, function( err, listDocuments ) {
					if ( err ) {
						callback ( err );
					} else {
						if( listDocuments.length !== 0){
							//Создаем модель пользователя
							var model = new ModelUser(client);
							model.findsPass( listDocuments, callback );
						}
					}
				} );
			} else {
				callback( new Error( 'No description in global object view with name:' +
					viewName) );
			}
		} else {
			callback( new Error( 'Unknown type of query: ' + JSON.stringify( query ) ) );
		}
	} else */if ( query.access ) {
		//Запроса на чтение прав
		if ( query.access.viewName ) {
			//Запрос на чтение прав view
			if ( query.access.role ) {
				//Запрос на чтение прав view по роли

				//Запрашиваемый искомый объект прав
				AccessModuleRoleView.find( client, query.access.role, query.access.viewName,
					callback );
			} else if ( query.access.login ) {
				//Запрос на чтение прав view по пользователю
				//Запрашиваемый искомый объект прав
				AccessModuleUserView.find( client, query.access.login, query.access.viewName,
					callback );

			} else {
				callback( new Error( 'Controller: Not set role or login in query: '
					+ JSON.stringify( query ) ) )
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на чтение прав flexo по роли

				//Запрашиваемый искомый объект прав
				AccessModuleRoleFlexo.find( client, query.access.role, query.access.flexoSchemeName,
					callback );

			} else if ( query.access.login ) {
				//Запрос на чтение прав view по пользователю
				//Запрашиваемый искомый объект прав
				AccessModuleUserFlexo.find( client, query.access.login, query.access.flexoSchemeName, callback );

			} else {
				callback( new Error( 'Controller: Not set role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else {
			callback( new Error( 'Controller: Incorrect parameter access in query: '
				+ JSON.stringify( query ) ) );
		}
	} else {
		callback( new Error( 'Controller: Invalid query: ' + JSON.stringify( query ) ) );
	}
};

Controller.delete = function del( query, callback ) {

	if (!underscore.isFunction(callback)){
		throw new Error( 'Controller: callback not a function' );
	}

	if ( !INITIALIZED ) {
		callback(new Error( 'Controller: Flexo initialization required' ));
		return;
	}

	var model;
	/*if ( query.user ) {
		var viewName = 'viewUsers';
		var flexoSchemeName = 'users';

		if( query.user.queries && query.user.queries[flexoSchemeName] &&
			query.user.queries[flexoSchemeName].selector &&
			query.user.queries[flexoSchemeName].selector._id ){

			//Создаем view
			if ( globalViewConfig[viewName] ) {
				var dbAccess = {};
				dbAccess['delete'] = {};
				dbAccess['delete'][viewName] = 1;
				dbAccess['read'] = globalViewConfig[viewName];

				var viewModelUsers = new View(viewName, dbAccess, {});

				viewModelUsers.find( query.user, function( err ){
					if ( err ) {
						callback ( err );
					} else {
						//Удаляем документ из mongo
						viewModelUsers.delete(query.user, function(err, result){
							if ( err ) {
								callback ( err );
							} else {
								var model = new ModelUser(client, null,
									result[flexoSchemeName][0]._id);
								//ToDo:множественное удаление пользователей из Redis???
								model.delete( function( err ) {
									if ( err ) {
										callback( err )
									} else {
										callback( null, result );
									}
								});
							}
						});
					}
				});
			} else {
				callback( new Error( 'No description in global object view with name:' +
					viewName) );
			}
		} else {
			callback( new Error( 'Incorrect parameter query.selector in query: '
				+ JSON.stringify( query ) ) );
		}
	} else*/ if ( query.access ) {
		//Запроса на создание прав
		if ( query.access.viewName ) {
			//Запрос на удаление прав view
			if ( query.access.role ) {
				//Запрос на удаление прав view по роли
				//Создаем модель прав по роли для view
				AccessModuleRoleView.delete( client, query.access.role, query.access.viewName,
					callback );
			} else if ( query.access.login ) {
				//Запрос на удаление прав view по пользователю
				//Удаляем запрашиваемый объект прав
				AccessModuleUserView.delete( client, query.access.login, query.access.viewName,
					callback );
			} else {
				callback( new Error( 'Controller: Not set role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на удаление прав flexo по роли

				//Удаляем запрашиваемый объект прав
				AccessModuleRoleFlexo.delete( client, query.access.role,
					query.access.flexoSchemeName, callback );

			} else if ( query.access.login ) {
				//Запрос на удаление прав flexo по пользователю

				//Удаляем запрашиваемый объект прав
				AccessModuleUserFlexo.delete( client, query.access.login,
					query.access.flexoSchemeName, callback );

			} else {
				callback( new Error( 'Controller: Not set role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else {
			callback( new Error( 'Controller: Incorrect parameter access in query: '
				+ JSON.stringify( query ) ) );
		}
	} else {
		callback( new Error( 'Controller: Invalid query: ' + JSON.stringify( query ) ) );
	}
};

Controller.modify = function modify( query, callback ) {

	if (!underscore.isFunction(callback)){
		throw new Error( 'Controller: callback not a function' );
	}

	if ( !INITIALIZED ) {
		callback(new Error( 'Controller: Flexo initialization required' ));
		return;
	}

	/*if ( query.user ) {
		var viewName = 'viewUsers';
		var flexoSchemeName = 'users';
		if(query.user.queries && query.user.queries[flexoSchemeName] &&
			query.user.queries[flexoSchemeName].selector &&
			query.user.queries[flexoSchemeName].selector._id) {
			//Создаем flexo модель

			if ( globalViewConfig[viewName] ) {
				var dbAccess = {};
				dbAccess['modify'] = globalViewConfig[viewName];
				dbAccess['read'] = globalViewConfig[viewName];

				var viewModelUsers = new View(viewName, dbAccess, {});

				var pass = null;
				if (query.user.queries[flexoSchemeName].properties &&
					query.user.queries[flexoSchemeName].properties.pass){
					pass = query.user.queries[flexoSchemeName].properties.pass;
					delete query.user.queries[flexoSchemeName].properties.pass;
				}

				viewModelUsers.find(query.user, function(err, reply){
					if ( err ) {
						callback ( err );
					} else {
						//Модифицируем документ в mongo
						viewModelUsers.modify(query.user, function(err, objResult){
							if ( err ) {
								callback ( err );
							} else {
								if(pass){
									query.user.queries[flexoSchemeName].properties.pass = pass;
								}

								var model = new ModelUser(client, null,
									reply[flexoSchemeName][0]._id);

								//Модификация в redis
								model.modify(query.user.queries[flexoSchemeName].properties,
									function( err ) {
									if( err ){
										callback( err );
									} else {
										callback( null, objResult );
									}

								});
							}
						});
					}
				});
			} else {
			callback( new Error( 'No description in global object view with name:' +
				viewName) );
			}
		} else {
			callback( new Error( 'Incorrect parameter selector in queries: '
				+ JSON.stringify( query ) ) );
		}
	} else*/ if ( query.access ) {
		//Запроса на создание прав
		if ( query.access.viewName ) {
			//Запрос на создание прав view
			if ( query.access.role ) {
				//Запрос на создание прав view по роли

				//Создаем модель прав по роли для view
				AccessModuleRoleView.save( client, query.access.role, query.access.viewName,
					query.access.objAccess, callback );
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю

				//Создаем модель прав по пользователю для view
				AccessModuleUserView.save( client, query.access.login, query.access.viewName,
					query.access.objAccess, callback );
			} else {
				callback( new Error( 'Not set role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на создание прав flexo по роли

				//Создаем модель прав по роли для flexo схемы
				AccessModuleRoleFlexo.save( client, query.access.role, query.access.flexoSchemeName,
					query.access.objAccess, callback );
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю
				AccessModuleUserFlexo.save( client, query.access.login,
					query.access.flexoSchemeName, query.access.objAccess, callback );
			} else {
				callback( new Error( 'Not set role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else {
			callback( new Error( 'Incorrect parameter access in query: '
				+ JSON.stringify( query ) ) );
		}
	} else {
		callback( new Error( 'Invalid query: ' + JSON.stringify( query ) ) );
	}
};

Controller.getTemplate = getTemplate;

function getTemplate(name, user, role, socket, callback ) {

	if (!underscore.isFunction(callback)){
		throw new Error( 'Controller: callback not a function' );
	}

	if ( !INITIALIZED ) {
		callback(new Error( 'Controller: Flexo initialization required' ));
		return;
	}

	//Проверяем есть ли уже готовые права для view
	if( socket.view && socket.view[name] ) {
		//Подготовленный список _vid есть
		//Запрашиваем шаблон view c необходимыми параметрами
		View.getTemplate(name, socket.view[name], function( err, ids, config, template ){
			if( err ){
				callback( err );
			} else {

				if(socket.view[name].length !== ids.length){
					//ToDo:логирование ошибки целостности
					//Перезапись разрешенного списка _vid
					socket.view[name] = ids;
				}

				callback(null, config, template);
			}
		});
	} else {
		//Нет прав подготавливаем права и flexo модели
		formingFlexoAndView( user, role, name, function ( err, listAllowedOf_vid ) {
			if ( err ){
				callback( err );
			} else {
				//Создаем view

				View.getTemplate(name, listAllowedOf_vid, function( err, ids, config, template ){
					if( err ){
						callback( err );
					} else {
						if (!socket.view){
							socket.view = {};
						}

						socket.view[name] = ids;

						if(listAllowedOf_vid.length !== ids.length){
							//ToDo:логирование ошибки целостности
						}

						callback(null, config, template);
					}
				});
			}

		} );

	}
}

Controller.queryToView = function queryToView( type, request, viewName, socket, callback ) {

	if (!underscore.isFunction(callback)){
		throw new Error( 'Controller: callback not a function' );
	}

	if ( !INITIALIZED ) {
		callback(new Error( 'Controller: Flexo initialization required' ));
		return;
	}

	if( socket.view && socket.view[viewName] ) {
		//Подготовленный список разрешенных _vid есть
		if( type === READ ) {

			if(checkRead( viewName, request, socket.view[viewName] ) ){
				//Вызываем view c необходимыми параметрами
				View.find( viewName, socket.view[viewName], request, callback );

			} else {
				callback(new Error('Controller: Requested more fields than allowed to read'));
			}

		} else if ( type === CREATE ) {

			if(checkCreate( viewName, request, socket.view[viewName] ) ){
				//Вызываем view c необходимыми параметрами
				//Вызываем view c необходимыми параметрами
				View.insert( viewName, socket.view[viewName], request, callback );
			} else {
				callback(new Error('Controller: No permission to create in view'));
			}

		} else if ( type === MODIFY ) {

			if(checkModify( viewName, request, socket.view[viewName] ) ){
				//Вызываем view c необходимыми параметрами
				View.modify( viewName, request, callback );
			} else {
				callback(new Error('Controller: No permission to modify in view'));
			}

		} else if ( type === DELETE ) {

			if(checkDelete( viewName, request, socket.view[viewName] ) ){
				View.delete( viewName, request, callback );
			} else {
				callback(new Error('Controller: No permission to delete in view'));
			}

		}

	} else {
		callback(new Error('Controller: Requested data without requiring a template or config'));
	}
};

function checkRead( viewName, queries, listOfAllowed_vids ) {

    //Формируем списки запрашиваемых полей на проверку для данной схемы
	var _vidsFromSelector = [];
	var _vidsFromSort = [];

	if(queries.selector)
		_vidsFromSelector = Object.keys(queries.selector);
	if(queries.options && queries.options.sort)
		_vidsFromSort = Object.keys(queries.options.sort);

	//Объединяем массива для проверок в один
	var _vidsForCheck = underscore.union(_vidsFromSelector, _vidsFromSort);
	//Пересекаем с разрешенным списком _vids
	var unresolvedFields  = underscore.difference(_vidsForCheck, listOfAllowed_vids);

	if (unresolvedFields.length !== 0){
		return false;
	}

	//Проверяем имеет ли запрашиваемый _vids доступ на чтение в глобальной переменной
	for( var i=0; i < _vidsForCheck.length; i++ ) {
		if ( !( globalViewConfig[viewName][_vidsForCheck[i]] &&
			globalViewConfig[viewName][_vidsForCheck[i]].flexo.length !== 0 &&
			globalViewConfig[viewName][_vidsForCheck[i]].flexo.length > 1 &&
			( globalViewConfig[viewName][_vidsForCheck[i]].type === READ ||
				globalViewConfig[viewName][_vidsForCheck[i]].type === MODIFY ) ) ) {
			return false;
		}
	}

	return true;
}

function checkCreate( viewName, queries, listOfAllowed_vids ) {
	//Проверяем передан ли массив документов или один документ
	if ( underscore.isArray( queries ) ) {
		//Формируем список полей на проверку
		var _vidsForCheck = [];
		for( var i = 0; i < queries.length; i++ ) {
			var _vidsFromOneDocument = [];

			if(!underscore.isEmpty(queries[i])) {
				_vidsFromOneDocument = Object.keys(queries[i]);
			}
			_vidsForCheck = underscore.union(_vidsForCheck, _vidsFromOneDocument);
		}

		if( _vidsForCheck.length === 0 ) {
			return false;
		}

		//Пересекаем с разрешенным списком _vids
		var unresolvedFields  = underscore.difference(_vidsForCheck, listOfAllowed_vids);

		if (unresolvedFields.length !== 0){
			return false;
		}

		//Проверяем имеет ли запрашиваемый _vids доступ к flexo в глобальной переменной
		for( var i = 0; i < _vidsForCheck.length; i++ ) {
			if (!( globalViewConfig[viewName][_vidsForCheck[i]] &&
				globalViewConfig[viewName][_vidsForCheck[i]].flexo.length !== 0 &&
				globalViewConfig[viewName][_vidsForCheck[i]].flexo.length > 1 &&
				globalViewConfig[viewName][_vidsForCheck[i]].type === CREATE ) ) {
				return false;
			}
		}

	} else {
		var _vidsForCheck = [];

		if(!underscore.isEmpty(queries)) {
			_vidsForCheck = Object.keys(queries);
		} else {
			return false;
		}

		//Пересекаем с разрешенным списком _vids
		var unresolvedFields  = underscore.difference(_vidsForCheck, listOfAllowed_vids);

		if (unresolvedFields.length !== 0){
			return false;
		}

		//Проверяем имеет ли запрашиваемый _vids доступ к flexo в глобальной переменной
		for( var i = 0; i < _vidsForCheck.length; i++ ) {
			if (!( globalViewConfig[viewName][_vidsForCheck[i]] &&
				globalViewConfig[viewName][_vidsForCheck[i]].flexo.length !== 0 &&
				globalViewConfig[viewName][_vidsForCheck[i]].flexo.length > 1 &&
				globalViewConfig[viewName][_vidsForCheck[i]].type === CREATE ) ) {
				return false;
			}
		}
	}

	return true;
}

function checkModify( viewName, queries, listOfAllowed_vids ) {
	//Проверяем передан ли массив документов или один документ
	if ( underscore.isArray( queries ) ) {
		//Формируем список полей на проверку
		var _vidsForCheck = [];
		for( var i = 0; i < queries.length; i++ ) {
			var _vidsFromOneDocument = [];

			if(!underscore.isEmpty(queries[i].properties)) {
				_vidsFromOneDocument = Object.keys(queries[i].properties);
			}
			_vidsForCheck = underscore.union(_vidsForCheck, _vidsFromOneDocument);
		}

		if( _vidsForCheck.length === 0 ) {
			return false;
		}

		//Пересекаем с разрешенным списком _vids
		var unresolvedFields  = underscore.difference(_vidsForCheck, listOfAllowed_vids);

		if (unresolvedFields.length !== 0){
			return false;
		}

		//Проверяем имеет ли запрашиваемый _vids доступ к flexo в глобальной переменной
		for( var i = 0; i < _vidsForCheck.length; i++ ) {
			if (!( globalViewConfig[viewName][_vidsForCheck[i]] &&
				globalViewConfig[viewName][_vidsForCheck[i]].flexo.length !== 0 &&
				globalViewConfig[viewName][_vidsForCheck[i]].flexo.length > 1 &&
				globalViewConfig[viewName][_vidsForCheck[i]].type === MODIFY ) ) {
				return false;
			}
		}

	} else {
		var _vidsForCheck = [];

		if(!underscore.isEmpty(queries.properties)) {
			_vidsForCheck = Object.keys(queries.properties);
		} else {
			return false;
		}

		//Пересекаем с разрешенным списком _vids
		var unresolvedFields  = underscore.difference(_vidsForCheck, listOfAllowed_vids);

		if (unresolvedFields.length !== 0){
			return false;
		}

		//Проверяем имеет ли запрашиваемый _vids доступ к flexo в глобальной переменной
		for( var i = 0; i < _vidsForCheck.length; i++ ) {
			if (!( globalViewConfig[viewName][_vidsForCheck[i]] &&
				globalViewConfig[viewName][_vidsForCheck[i]].flexo.length !== 0 &&
				globalViewConfig[viewName][_vidsForCheck[i]].flexo.length > 1 &&
				globalViewConfig[viewName][_vidsForCheck[i]].type === MODIFY ) ) {
				return false;
			}
		}
	}

	return true;
}

function checkDelete( viewName, queries, listOfAllowed_vids ) {
	//Проверяем передан ли массив документов или один документ
	if ( underscore.isArray( queries ) ) {
		//Формируем список полей на проверку
		var _vidsForCheck = [];
		for( var i = 0; i < queries.length; i++ ) {
			var _vidsFromOneDocument = [];

			if(!underscore.isEmpty(queries[i].selector)) {
				_vidsFromOneDocument = Object.keys(queries[i].selector);
			}
			_vidsForCheck = underscore.union(_vidsForCheck, _vidsFromOneDocument);
		}

		if( _vidsForCheck.length === 0 ) {
			return false;
		}

		//Пересекаем с разрешенным списком _vids
		var unresolvedFields  = underscore.difference(_vidsForCheck, listOfAllowed_vids);

		if (unresolvedFields.length !== 0){
			return false;
		}

		//Проверяем имеет ли запрашиваемый _vids доступ к flexo в глобальной переменной
		for( var i = 0; i < _vidsForCheck.length; i++ ) {
			if (!( globalViewConfig[viewName][_vidsForCheck[i]] &&
				globalViewConfig[viewName][_vidsForCheck[i]].flexo.length !== 0 &&
				globalViewConfig[viewName][_vidsForCheck[i]].flexo.length > 1 &&
				globalViewConfig[viewName][_vidsForCheck[i]].type === DELETE ) ) {
				return false;
			}
		}

	} else {
		var _vidsForCheck = [];

		if(!underscore.isEmpty(queries.selector)) {
			_vidsForCheck = Object.keys(queries.selector);
		} else {
			return false;
		}

		//Пересекаем с разрешенным списком _vids
		var unresolvedFields  = underscore.difference(_vidsForCheck, listOfAllowed_vids);

		if (unresolvedFields.length !== 0){
			return false;
		}

		//Проверяем имеет ли запрашиваемый _vids доступ к flexo в глобальной переменной
		for( var i = 0; i < _vidsForCheck.length; i++ ) {
			if (!( globalViewConfig[viewName][_vidsForCheck[i]] &&
				globalViewConfig[viewName][_vidsForCheck[i]].flexo.length !== 0 &&
				globalViewConfig[viewName][_vidsForCheck[i]].flexo.length > 1 &&
				globalViewConfig[viewName][_vidsForCheck[i]].type === DELETE ) ) {
				return false;
			}
		}
	}

	return true;
}

function formingFlexoAndView( user, role, viewName, callback ){

	//Формируем объект с правами для view
	crossingAccessForView(user, role, viewName, function( err, listAllowedOf_vid ) {
		if( err ) {
			callback ( err );
		} else if ( listAllowedOf_vid.length === 0 ) {
		    callback ( new Error('Controller: No permissions access to view'));
		} else {
			//Формируем список необходимых flexo схем
			var listOfFlexoSchemes = [];
			//Массив объектов с описанием требуемой информации по flexo для каждой _vid
			var list_vidForFlexoCheck = [];
			var list_vidForRemove = [];

			for( var i = 0; i < listAllowedOf_vid.length ; i++ ){
				//Проверяем существует ли такой _vid в глобальном описании view
				if( globalViewConfig[viewName][listAllowedOf_vid[i]] ){
					//Проверяем требуется ли flexo данные
					if(globalViewConfig[viewName][listAllowedOf_vid[i]].flexo.length !== 0){
						//Сохраняем данные о требуемой flexo
						//ToDo:Оптимизировать наполнение объекта obj_vidForFlexoCheck
						var schemeName = globalViewConfig[viewName][listAllowedOf_vid[i]].flexo[0];
						var fields = underscore.without(
							globalViewConfig[viewName][listAllowedOf_vid[i]].flexo, schemeName );
						var type = globalViewConfig[viewName][listAllowedOf_vid[i]].type;

						listOfFlexoSchemes.push( schemeName );

						list_vidForFlexoCheck.push({
							listAllowedOf_vid: listAllowedOf_vid[i],
							schemeName: schemeName,
							fields: fields,
							type: type
						});
					}

				} else {
					//ToDo: логировать нарушение целостности, разрешен в правах на view для _vid
					//ToDo: которого нет в глобальной переменной
					list_vidForRemove.push(listAllowedOf_vid[i]);
				}
			}

			listOfFlexoSchemes = underscore.uniq(listOfFlexoSchemes);
			listAllowedOf_vid = underscore.difference(listAllowedOf_vid, list_vidForRemove);

			if ( listOfFlexoSchemes.length ) {
				//Подготавливаем объект с правами для view
				crossingAccessForFlexo(user, role, viewName, listOfFlexoSchemes,
					function(err, flexoAccess){
					if( err ){
						callback( err );
					} else {
						//Сравниваем разрешения flexo и требуемые разрешения

						var list_vidForRemove = [];
						for( var i = 0; i < list_vidForFlexoCheck.length; i++ ) {
							if(list_vidForFlexoCheck[i].type === READ){

								var difference = underscore.difference(
									list_vidForFlexoCheck[i].fields,
									flexoAccess[READ][list_vidForFlexoCheck[i].schemeName]);

								if(difference.length !== 0){
									//Запрашиваются поля которые не разрешены в полях
									//ToDo: Возможно: логировать нарушение целостности
									list_vidForRemove.push(
										list_vidForFlexoCheck[i].listAllowedOf_vid);
								}


							} else if (list_vidForFlexoCheck[i].type === MODIFY) {

								var difference = underscore.difference(
									list_vidForFlexoCheck[i].fields,
									flexoAccess[MODIFY][list_vidForFlexoCheck[i].schemeName]);

								if(difference.length !== 0){
									//Запрашиваются поля которые не разрешены в полях
									//ToDo: Возможно: логировать нарушение целостности
									list_vidForRemove.push(
										list_vidForFlexoCheck[i].listAllowedOf_vid);
								}


							} else if (list_vidForFlexoCheck[i].type === CREATE) {

								if( list_vidForFlexoCheck[i].fields.length === 0 ) {
									//Проверяется общее разрешение на создание документа в целом
									if (flexoAccess['createAll'][list_vidForFlexoCheck[i].schemeName]
										!== 1){
										//ToDo: Возможно: логировать нарушение целостности
										list_vidForRemove.push(
											list_vidForFlexoCheck[i].listAllowedOf_vid);
									}
								} else {
									//Проверяется частные разрешения на создание документа
									var difference = underscore.difference(
										list_vidForFlexoCheck[i].fields,
										flexoAccess[CREATE][list_vidForFlexoCheck[i].schemeName]);

									if(difference.length !== 0){
										//Запрашиваются поля которые не разрешены в полях
										//ToDo: Возможно: логировать нарушение целостности
										list_vidForRemove.push(
											list_vidForFlexoCheck[i].listAllowedOf_vid);
									}

								}

							} else if (list_vidForFlexoCheck[i].type === DELETE) {
								//Проверяется общее разрешение на удаление документа в целом
								if (flexoAccess['delete'][list_vidForFlexoCheck[i].schemeName]
									!== 1){
									//ToDo: Возможно: логировать нарушение целостности
									list_vidForRemove.push(
										list_vidForFlexoCheck[i].listAllowedOf_vid);
								}
							}
						}

						listAllowedOf_vid = underscore.difference(
							listAllowedOf_vid, list_vidForRemove);

						callback( null, listAllowedOf_vid );
					}
				});
			} else {
				callback( null, listAllowedOf_vid );
			}

		}
	} );
}

function crossingAccessForFlexo(user, role, viewName, flexoSchemes, callback) {

	//Запрашиваемый данные о правах для определения пересечения
	async.parallel([
		function(cb){
			AccessModuleRoleFlexo.accessDataPreparation( client, role, globalFlexoSchemes,
				flexoSchemes, cb);
		},
		function(cb){
			AccessModuleUserFlexo.accessDataPreparation( client, user, globalFlexoSchemes,
				flexoSchemes, cb);
		}
	],
		function(err, replies) {
			if( err ) {
				callback ( err )
			} else {
				//Определение пересечения прав
				var objAccessRole = replies[0];
				var objAccessUser = replies[1];

				var schemes = flexoSchemes;
				//Объект хранящий готовое пересечение прав на чтение
				var objAccess = {};

				for( var i = 0; i < schemes.length; i++ ) {

					//Чтение
					objAccess = crossingAccess( 'read', schemes[i], objAccessRole,
						objAccessUser, objAccess );

					//Модификация
					objAccess = crossingAccess( 'modify', schemes[i], objAccessRole,
						objAccessUser, objAccess );

					//Создание
					objAccess = crossingAccess( 'create', schemes[i], objAccessRole,
						objAccessUser, objAccess );

					//Cоздание в целом
					var createAll = 0;

					if( objAccessRole[schemes[i]] &&
						!underscore.isUndefined( objAccessRole[schemes[i]]['createAll'] ) ) {
						createAll = objAccessRole[schemes[i]]['createAll'];
					}

					if(objAccessUser[schemes[i]] &&
						!underscore.isUndefined( objAccessUser[schemes[i]]['createAll'] )){
						if( objAccessUser[schemes[i]]['createAll'] === 0) {
							createAll = 0;
						} else if ( objAccessUser[schemes[i]]['createAll'] === 1) {
							createAll = 1;
						}
					}

					if ( !objAccess['createAll'] ) {
						objAccess['createAll'] = {}
					}

					objAccess['createAll'][schemes[i]] = createAll;

					//Удаление
					var del = 0;

					if( objAccessRole[schemes[i]] &&
						!underscore.isUndefined( objAccessRole[schemes[i]]['delete'] ) ) {
						del = objAccessRole[schemes[i]]['delete'];
					}

					if(objAccessUser[schemes[i]] &&
						!underscore.isUndefined( objAccessUser[schemes[i]]['delete'] )){
						if( objAccessUser[schemes[i]]['delete'] === 0) {
							del = 0;
						} else if ( objAccessUser[schemes[i]]['delete'] === 1) {
							del = 1;
						}
					}

					if ( !objAccess['delete'] ) {
						objAccess['delete'] = {}
					}

					objAccess['delete'][schemes[i]] = del;
				}

				callback( null, objAccess );

			}
		}
	);
}

function crossingAccessForView(user, role, viewName, callback ) {
	//Запрашиваемый данные о правах для определения пересечения
	async.parallel([
		function(cb){
			AccessModuleRoleView.find(client, role, viewName, function(err, objAccess){
				if (err && err.message === 'Controller: No requested object access (role: ' +
					role +', viewName: ' + viewName + ')') {
					cb( null, {add:[], del:[]});
				} else if ( err ) {
					cb( err );
				} else {
					cb( null, AccessModuleRoleView.accessPreparation( objAccess,
						globalViewConfig[viewName] ) );
				}
			} );
		},
		function(cb){
			AccessModuleUserView.find(client, user, viewName, function(err, objAccess){
				if (err && err.message === 'Controller: No requested object access (user: ' +
					user +', viewName: ' + viewName + ')') {
					cb( null, {add:[], del:[]});
				} else if ( err ) {
					cb( err );
				} else {
					cb( null, AccessModuleUserView.accessPreparation( objAccess,
						globalViewConfig[viewName] ) );
				}
			} );
		}
	],
		function(err, replies) {
			if( err ) {
				callback ( err )
			} else {
				//Определение пересечения прав
				var objAccessRole = replies[0];
				var objAccessUser = replies[1];
				//Объект хранящий готовое пересечение прав
				var listOf_vid = objAccessRole.add;
				listOf_vid = underscore.difference( listOf_vid, objAccessRole.del );

				listOf_vid = underscore.union( listOf_vid, objAccessUser.add );
				listOf_vid = underscore.difference( listOf_vid, objAccessUser.del );

				callback( null, listOf_vid );

			}
		}
	);
}


function crossingAccess (method, scheme, objAccessRole, objAccessUser, objAccessArg) {
	var fields = [];
	var addFields = [];
	var removeFields = [];
	var objAccess = underscore.clone(objAccessArg);

	if( objAccessRole[scheme] && objAccessRole[scheme][method] ) {
		fields = objAccessRole[scheme][method];
	}

	if( objAccessUser[scheme] && objAccessUser[scheme][method] ) {
		addFields = objAccessUser[scheme][method][0];
		removeFields = objAccessUser[scheme][method][1];
	}

	var permisionFields =
		underscore.union( fields, addFields );
	permisionFields =
		underscore.difference( permisionFields, removeFields );

	if( permisionFields.length !== 0 ) {
		if ( !objAccess[method] ) {
			objAccess[method] = {}
		}
		objAccess[method][scheme] = permisionFields;
	}

	return objAccess;
}