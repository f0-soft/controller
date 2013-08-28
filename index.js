var redis = require('redis');
var sys = require('sys');
var async = require('async');
var underscore = require('underscore');

var AccessModuleRoleView = require('./modules/access_module_role_view.js');
var AccessModuleUserView = require('./modules/access_module_user_view.js');
var AccessModuleRoleFlexo = require('./modules/access_module_role_flexo.js');
var AccessModuleUserFlexo = require('./modules/access_module_user_flexo.js');

var ModuleErrorLogging = require('./modules/module_error_logging.js');
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
var CREATEALL = 'createAll';
var READ = 'read';
var MODIFY = 'modify';
var DELETE = 'delete';

var MIN_DATETIME = 1359662400000;
var MAX_DATETIME = 1517428800000;


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

	if ( config && config.view ) {
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

			client.on( "error", function ( err ) {
				callback( err );
			});

			client.on( "ready", function ( err ) {
				INITIALIZED = true;
				callback( null, true );
			});
		} else {
			client = redis.createClient( config.redisConfig.port, config.redisConfig.host );

			client.on( "error", function ( err ) {
				callback( err );
			});

			client.on( "ready", function ( err ) {
				INITIALIZED = true;
				callback( null, true );
			});
		}
	} else {
		client = redis.createClient();

		client.on( "error", function ( err ) {
			callback( err );
		});

		client.on( "ready", function ( err ) {
			INITIALIZED = true;
			callback( null, true );
		});
	}
};

Controller.create = function create( query, callback ) {

	if ( !underscore.isFunction( callback ) ) {
		throw new Error( 'Controller: callback not a function' );
	}

	if ( !INITIALIZED ) {
		callback(new Error( 'Controller: Flexo initialization required' ));
		return;
	}

	if ( !query ) {
		callback(new Error( 'Controller: Parameter query is not set' ));
		return;
	}

	if ( query.user ) {
		//Запрос на создание пользователя

		//Проверяем уникальность создаваемого пользователя
		var viewName = 'viewUsers';
		var flexoSchemeName = 'users';
		ModuleUser.checkUnique( client, query.user.login, function ( err ) {
			if ( err ) {
				callback ( err );
			} else {
				//Создаем view
				//ToDo: взаимодействие c view

				var document = underscore.clone( query.user );

				//Сохраняем документ в redis
				ModuleUser.create( client, document, function( err ) {
					if(err){
						callback( err );
					} else {
						callback( err, true );
					}
				} );
			}
		});
	} else if ( query.role ) {
		//Запрос на создание роли
		ModuleUser.createRole(client, query.role, function( err ) {
			if(err){
				callback( err );
			} else {
				callback( err, true );
			}
		} );
	} else if ( query.access ) {
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
					+ JSON.stringify( query ) ) );
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

	if (!underscore.isFunction( callback ) ) {
		throw new Error( 'Controller: callback not a function' );
	}

	if ( !INITIALIZED ) {
		callback(new Error( 'Controller: Flexo initialization required' ));
		return;
	}

	if ( !query ) {
		callback(new Error( 'Controller: Parameter query is not set' ));
		return;
	}

	if ( query.user ) {
		var flexoSchemeName = 'users';
		if( query.user.login || query.user._id ){
		    //Простой поиск одного пользователя
			var login = query.user.login || null;
			var _id = query.user._id || null;

			ModuleUser.find( client, _id, login, function(err, reply){
				if ( err ){
					callback( err );
				} else {
					var obj = {};
					obj[flexoSchemeName] = [reply];
					callback(null, obj);
				}
			} );
		} else if ( query.user.allUser ) {
			ModuleUser.findListOfUsers(client, function( err, replies ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, replies );
				}
			});
		} else if ( query.user.allRole ) {
			ModuleUser.findListOfRoles(client, function( err, replies ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, replies );
				}
			});
		} else {
			callback( new Error( 'Unknown type of query: ' + JSON.stringify( query ) ) );
		}
	} else if ( query.access ) {
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
				AccessModuleUserFlexo.find( client, query.access.login, query.access.flexoSchemeName,
					callback );

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

	if (!underscore.isFunction( callback ) ) {
		throw new Error( 'Controller: callback not a function' );
	}

	if ( !INITIALIZED ) {
		callback(new Error( 'Controller: Flexo initialization required' ));
		return;
	}

	if ( !query ) {
		callback(new Error( 'Controller: Parameter query is not set' ));
		return;
	}

	if ( query.user ) {
		//Простое удаление одного пользователя
		var login = query.user.login || null;
		var _id = query.user._id || null;

		ModuleUser.delete( client, _id, login, function(err, reply){
			if ( err ){
				callback( err );
			} else {
				callback(null, reply);
			}
		} );
	} else if ( query.access ) {
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

	if ( !underscore.isFunction( callback ) ){
		throw new Error( 'Controller: callback not a function' );
	}

	if ( !INITIALIZED ) {
		callback( new Error( 'Controller: Flexo initialization required' ) );
		return;
	}

	if ( !query ) {
		callback( new Error( 'Controller: Parameter query is not set' ) );
		return;
	}

	if ( query.user ) {
		//Простая модификация одного пользователя
		var login = query.user.login || null;
		var _id = query.user._id || null;

		ModuleUser.modify( client, _id, query.user, function(err, reply){
			if ( err ){
				callback( err );
			} else {
				callback(null, reply);
			}
		} );
	} else if ( query.access ) {
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

function getTemplate(viewName, user, role, socket, callback ) {

	if (!underscore.isFunction(callback)){
		throw new Error( 'Controller: callback not a function' );
	}

	if ( !INITIALIZED ) {
		callback(new Error( 'Controller: Flexo initialization required' ));
		return;
	}

	if ( !underscore.isString( viewName ) ) {
		callback(new Error( 'Controller: Parameter viewName is not set' ));
		return;
	}

	if ( !underscore.isString( user ) ) {
		callback(new Error( 'Controller: Parameter user is not set' ));
		return;
	}

	if ( !underscore.isString( role ) ) {
		callback(new Error( 'Controller: Parameter role is not set' ));
		return;
	}

	if ( !socket ) {
		callback(new Error( 'Controller: Parameter socket is not set' ));
		return;
	}

	//Проверяем есть ли уже готовый список разрешенных мдентификаторов для view
	if( socket.view && socket.view[viewName] ) {
		//Подготовленный список _vid есть
		//Запрашиваем шаблон view c необходимыми параметрами
		View.getTemplate( viewName, socket.view[viewName], function( err, ids, config, template ) {
			if( err ) {
				callback( err );
			} else {

				if( socket.view[viewName].length !== ids.length ) {
					//Перезапись разрешенного списка _vid
					socket.view[viewName] = ids;

					//Логирование ошибки целостности, так как view обрезала список разрешенных
					//идентификаторов
					var objDescriptioneError = {};
					objDescriptioneError.type = 'loss integrity';
					objDescriptioneError.variant = 1;
                    objDescriptioneError.place = 'View.getTemplate';
					objDescriptioneError.time = new Date().getTime();
					objDescriptioneError.descriptione = {};
					objDescriptioneError.descriptione.viewName = viewName;
					objDescriptioneError.descriptione.list_vidsFromSocket = socket.view[viewName];
					objDescriptioneError.descriptione.user = user;
					objDescriptioneError.descriptione.role = role;
					ModuleErrorLogging.save(client, [objDescriptioneError], function( err, reply ) {
						if ( err ) {
							callback( err );
						} else {
							callback( null, config, template );
						}
					} );
				} else {
                	callback( null, config, template );
				}
			}
		});
	} else {
		//Нет прав подготавливаем права и flexo модели
		formingFlexoAndView( user, role, viewName, function ( err, listAllowedOf_vid ) {
			if ( err ) {
				callback( err );
			} else {
				//Создаем view

				View.getTemplate( viewName, listAllowedOf_vid, function( err, ids, config, template ) {
					if( err ) {
						callback( err );
					} else {
						if ( !socket.view ) {
							socket.view = {};
						}

						socket.view[viewName] = ids;

						if( listAllowedOf_vid.length !== ids.length ){
							//Логирование ошибки целостности, так как view обрезала список
							// разрешенных идентификаторов
							var objDescriptioneError = {};
							objDescriptioneError.type = 'loss integrity';
							objDescriptioneError.variant = 2;
							objDescriptioneError.place = 'View.getTemplate';
							objDescriptioneError.time = new Date().getTime();
							objDescriptioneError.descriptione = {};
							objDescriptioneError.descriptione.viewName = viewName;
							objDescriptioneError.descriptione.user = user;
							objDescriptioneError.descriptione.role = role;
							ModuleErrorLogging.save(client, [objDescriptioneError],
								function( err, reply ) {
								if ( err ) {
									callback( err );
								} else {
									callback( null, config, template );
								}
							} );
						} else {
                        	callback( null, config, template );
						}
					}
				});
			}

		} );

	}
}

Controller.queryToView = function queryToView( type, request, viewName, socket, callback ) {

	if ( !underscore.isFunction( callback ) ) {
		throw new Error( 'Controller: callback not a function' );
	}

	if ( !INITIALIZED ) {
		callback(new Error( 'Controller: Flexo initialization required' ));
		return;
	}

	if ( !underscore.isString( viewName ) ) {
		callback(new Error( 'Controller: Parameter viewName is not set' ));
		return;
	}

	if ( !socket ) {
		callback(new Error( 'Controller: Parameter socket is not set' ));
		return;
	}

	if ( !request ) {
		callback(new Error( 'Controller: Parameter request is not set' ));
		return;
	} else if ( type !== READ && !underscore.isArray( request ) ) {
		callback(new Error( 'Controller: Parameter request is not array' ));
		return;
	}

	if( socket.view && socket.view[viewName] ) {
		//Подготовленный список разрешенных _vid есть
		if( type === READ ) {

			if( checkRead( viewName, request, socket.view[viewName] ) ) {
				//Вызываем view c необходимыми параметрами
				View.find( viewName, socket.view[viewName], request, callback );

			} else {
				callback( new Error( 'Controller: Requested more fields than allowed to read' ) );
			}

		} else if ( type === CREATE ) {

			if( checkCreate( viewName, request, socket.view[viewName] ) ) {
				//Вызываем view c необходимыми параметрами
				//Вызываем view c необходимыми параметрами
				View.insert( viewName, socket.view[viewName], request, callback );
			} else {
				callback( new Error( 'Controller: No permission to create in view' ) );
			}

		} else if ( type === MODIFY ) {

			if( checkModify( viewName, request, socket.view[viewName] ) ) {
				//Вызываем view c необходимыми параметрами
				View.modify( viewName, request, callback );
			} else {
				callback( new Error( 'Controller: No permission to modify in view' ) );
			}

		} else if ( type === DELETE ) {

			if( checkDelete( viewName, request, socket.view[viewName] ) ) {
				View.delete( viewName, request, callback );
			} else {
				callback( new Error( 'Controller: No permission to delete in view' ) );
			}

		} else {
			callback( new Error( 'Controller: Unknown type of request' ) );
		}

	} else {
		callback( new Error( 'Controller: Requested data without requiring a template or config' ) );
	}
};

function checkRead( viewName, queries, listOfAllowed_vids ) {
	//Информация для заданной view из глобального конфига
	var dataFromViewConfig = globalViewConfig[viewName];
	//Переменная для хранения информации о анализируемом идентификаторе view из глобального конфига
	var _vidsDataFromViewConfig;

    //Формируем списки запрашиваемых полей на проверку для данной схемы
	var _vidsFromSelector = [];
	var _vidsFromSort = [];

	if( !dataFromViewConfig ) {
		//Нет описания о идентификаторов принадлежных к данной view, поэтому не может быть запросов
		//на не существующие идентификаторы
		//ToDo:логировать запрос к несуществующим идентификатарам
		return false;
	}

	if( queries.selector )
		_vidsFromSelector = Object.keys( queries.selector );
	if( queries.options && queries.options.sort )
		_vidsFromSort = Object.keys( queries.options.sort );

	//Объединяем массива для проверок в один
	var _vidsForCheck = underscore.union( _vidsFromSelector, _vidsFromSort );
	//Пересекаем с разрешенным списком _vids
	var unresolvedFields  = underscore.difference( _vidsForCheck, listOfAllowed_vids );

	if ( unresolvedFields.length !== 0 ) {
		return false;
	}

	//Проверяем имеет ли запрашиваемый _vids доступ на чтение в глобальной переменной
	for( var i=0; i < _vidsForCheck.length; i++ ) {
		_vidsDataFromViewConfig = dataFromViewConfig[_vidsForCheck[i]];
		if ( !( _vidsDataFromViewConfig && _vidsDataFromViewConfig.flexo &&
			_vidsDataFromViewConfig.flexo.length > 1 &&	( _vidsDataFromViewConfig.type === READ ||
				_vidsDataFromViewConfig.type === MODIFY ) ) ) {
			return false;
		}
	}

	return true;
}

function checkCreate( viewName, queries, listOfAllowed_vids ) {
	//Список идентификаторов _vids view из запроса на проверку
	var _vidsForCheck = [];
	//Список не разрешенных полей
	var unresolvedFields;
	//Для организации циклов
	var i;
	//Информация для заданной view из глобального конфига
	var dataFromViewConfig = globalViewConfig[viewName];
	//Переменная для хранения информации о анализируемом идентификаторе view из глобального конфига
	var _vidsDataFromViewConfig;

	if( !dataFromViewConfig ) {
		//Нет описания о идентификаторов принадлежных к данной view, поэтому не может быть запросов
		//на не существующие идентификаторы
		//ToDo:логировать запрос к несуществующим идентификатарам
		return false;
	}

	//Формируем список полей на проверку

	for( i = 0; i < queries.length; i++ ) {
		var _vidsFromOneDocument = [];

		if( !underscore.isEmpty( queries[i] ) ) {
			_vidsFromOneDocument = Object.keys( queries[i] );
		}
		_vidsForCheck = underscore.union(_vidsForCheck, _vidsFromOneDocument);
	}

	if( _vidsForCheck.length === 0 ) {
		return false;
	}

	//Пересекаем с разрешенным списком _vids
	unresolvedFields  = underscore.difference(_vidsForCheck, listOfAllowed_vids);

	if (unresolvedFields.length !== 0){
		return false;
	}

	//Проверяем имеет ли запрашиваемый _vids доступ к flexo в глобальной переменной
	for( i = 0; i < _vidsForCheck.length; i++ ) {
		_vidsDataFromViewConfig = dataFromViewConfig[_vidsForCheck[i]];
		if (!( _vidsDataFromViewConfig && _vidsDataFromViewConfig.flexo &&
			_vidsDataFromViewConfig.flexo.length > 1 &&
			_vidsDataFromViewConfig.type === CREATE ) ) {
			return false;
		}
	}

	return true;
}

function checkModify( viewName, queries, listOfAllowed_vids ) {
	//Список идентификаторов _vids view из запроса на проверку
	var _vidsForCheck = [];
	//Список не разрешенных полей
	var unresolvedFields;
	//Для организации циклов
	var i;
	//Информация для заданной view из глобального конфига
	var dataFromViewConfig = globalViewConfig[viewName];
	//Переменная для хранения информации о анализируемом идентификаторе view из глобального конфига
	var _vidsDataFromViewConfig;

	if( !dataFromViewConfig ) {
		//Нет описания о идентификаторов принадлежных к данной view, поэтому не может быть запросов
		//на не существующие идентификаторы
		//ToDo:логировать запрос к несуществующим идентификатарам
		return false;
	}


	//Формируем список полей на проверку
	for( i = 0; i < queries.length; i++ ) {
		var _vidsFromOneDocument = [];

		if( !underscore.isEmpty( queries[i].properties ) ) {
			_vidsFromOneDocument = Object.keys( queries[i].properties );
		}
		_vidsForCheck = underscore.union( _vidsForCheck, _vidsFromOneDocument );
	}

	if( _vidsForCheck.length === 0 ) {
		return false;
	}

	//Пересекаем с разрешенным списком _vids
	unresolvedFields  = underscore.difference( _vidsForCheck, listOfAllowed_vids );

	if (unresolvedFields.length !== 0){
		return false;
	}

	//Проверяем имеет ли запрашиваемый _vids доступ к flexo в глобальной переменной
	for( i = 0; i < _vidsForCheck.length; i++ ) {
		_vidsDataFromViewConfig = dataFromViewConfig[_vidsForCheck[i]];
		if ( !( _vidsDataFromViewConfig && _vidsDataFromViewConfig.flexo &&
			_vidsDataFromViewConfig.flexo.length > 1 &&
			_vidsDataFromViewConfig.type === MODIFY ) ) {
			return false;
		}
	}

	return true;
}

function checkDelete( viewName, queries, listOfAllowed_vids ) {
	//Список идентификаторов _vids view из запроса на проверку
	var _vidsForCheck = [];
	//Список не разрешенных полей
	var unresolvedFields;
	//Список участвующих в операции удаления flexo схем
	var flexoScheme = [];
	//Для организации циклов
	var i, j;
	//Информация для заданной view из глобального конфига
	var dataFromViewConfig = globalViewConfig[viewName];
	//Переменная для хранения информации о анализируемом идентификаторе view из глобального конфига
	var _vidsDataFromViewConfig;

	if( !dataFromViewConfig ) {
		//Нет описания о идентификаторов принадлежных к данной view, поэтому не может быть запросов
		//на не существующие идентификаторы
		//ToDo:логировать запрос к несуществующим идентификатарам
		return false;
	}

    //Формируем список полей на проверку
	for( i = 0; i < queries.length; i++ ) {
		var _vidsFromOneDocument = [];

		if( !underscore.isEmpty( queries[i].selector ) ) {
			_vidsFromOneDocument = Object.keys( queries[i].selector );
		}
		_vidsForCheck = underscore.union( _vidsForCheck, _vidsFromOneDocument );
	}

	if( _vidsForCheck.length === 0 ) {
		return false;
	}

	//Пересекаем с разрешенным списком _vids
	unresolvedFields  = underscore.difference( _vidsForCheck, listOfAllowed_vids );

	if (unresolvedFields.length !== 0){
		return false;
	}

	//Проверяем имеет ли запрашиваемый _vids доступ к flexo в глобальной переменной
	for( i = 0; i < _vidsForCheck.length; i++ ) {
		_vidsDataFromViewConfig = dataFromViewConfig[_vidsForCheck[i]];
		if( _vidsDataFromViewConfig && _vidsDataFromViewConfig.flexo &&
			_vidsDataFromViewConfig.flexo.length > 1 ) {
			flexoScheme.push( _vidsDataFromViewConfig.flexo[0] );
		} else {
			return false;
		}
	}

	//Проверяем есть ли разрешение на удаление для данной flexo схемы
	flexoScheme = underscore.uniq( flexoScheme );

	for( j = 0; j < flexoScheme.length; j++ ) {
		for( i = 0; i < listOfAllowed_vids.length; i++ ) {
			_vidsDataFromViewConfig = dataFromViewConfig[listOfAllowed_vids[i]];
			if( _vidsDataFromViewConfig && _vidsDataFromViewConfig.flexo &&
				_vidsDataFromViewConfig.flexo.length === 1 &&
				_vidsDataFromViewConfig.flexo[0] === flexoScheme[j] &&
				_vidsDataFromViewConfig.type === DELETE) {
				break;
			}
			if( i === ( listOfAllowed_vids.length - 1 ) ) {
				return false;
			}
		}
	}

	return true;
}

function formingFlexoAndView( user, role, viewName, callback ){

	//Формируем объект с правами для view
	crossingAccessForView( user, role, viewName, function( err, listAllowedOf_vid ) {
		if( err ) {
			callback ( err );
		} else if ( listAllowedOf_vid.length === 0 ) {
		    callback ( new Error( 'Controller: No permissions access to view' ) );
		} else {
			//Формируем список необходимых flexo схем
			var listOfFlexoSchemes = [];
			//Массив объектов с описанием требуемой информации по flexo для каждой _vid
			var list_vidForFlexoCheck = [];
			var list_vidForRemove = [];

			//Информация для заданной view из глобального конфига
			var dataFromViewConfig = globalViewConfig[viewName];

			//Переменная для хранения информации о анализируемом идентификаторе view из
			// глобального конфига
			var _vidsDataFromViewConfig;
			//Массив для хранения ошибок целостности
			var aDescriptioneError = [];

			for( var i = 0; i < listAllowedOf_vid.length ; i++ ){
				_vidsDataFromViewConfig = dataFromViewConfig[listAllowedOf_vid[i]];
				//Проверяем существует ли такой _vid в глобальном описании view
				if( _vidsDataFromViewConfig ) {
					//Проверяем требуется ли flexo данные
					if( _vidsDataFromViewConfig.flexo &&
						_vidsDataFromViewConfig.flexo.length !== 0 ) {
						//Сохраняем данные о требуемой flexo
						var schemeName = _vidsDataFromViewConfig.flexo[0];
                        listOfFlexoSchemes.push( schemeName );
						//ToDo:может переделать на сохранение массива
						//ToDo:Вставляется массив [listAllowedOf_vid, schemeName, fields, type]
						list_vidForFlexoCheck.push({
							listAllowedOf_vid: listAllowedOf_vid[i],
							schemeName: schemeName,
							fields: underscore.without(	_vidsDataFromViewConfig.flexo, schemeName ),
							type: _vidsDataFromViewConfig.type
						});
					}

				} else {
					//логировать нарушение целостности, разрешен в правах на view для _vid
					//которого нет в глобальной переменной
					aDescriptioneError.push({
						type:'loss integrity',
						variant: 1,
						place: 'formingFlexoAndView',
						time: new Date().getTime(),
						descriptione: {
							viewName: viewName,
							user: user,
							role:role
						}
					});

					list_vidForRemove.push( listAllowedOf_vid[i] );
				}
			}

			listOfFlexoSchemes = underscore.uniq( listOfFlexoSchemes );
			listAllowedOf_vid = underscore.difference( listAllowedOf_vid, list_vidForRemove );

			if ( listOfFlexoSchemes.length ) {
				//Подготавливаем объект с правами для view
				crossingAccessForFlexo( user, role, listOfFlexoSchemes, function(err, flexoAccess ){
					if( err ){
						callback( err );
					} else {
						//Сравниваем разрешения flexo и требуемые разрешения
						var list_vidForRemove = [];
						//Переменная для хранения различия между запрашиваемыми полями по view и
						//полями разрешенными по flexo правам
						var difference;

						for( var i = 0; i < list_vidForFlexoCheck.length; i++ ) {
							if( list_vidForFlexoCheck[i].type === READ ) {

								if ( flexoAccess[READ] ) {
									difference = underscore.difference(
										list_vidForFlexoCheck[i].fields,
										flexoAccess[READ][list_vidForFlexoCheck[i].schemeName] );

									if( difference.length !== 0 ){
										//Запрашиваются поля которые не разрешены в полях
										list_vidForRemove.push(
											list_vidForFlexoCheck[i].listAllowedOf_vid );
									}
								} else {
									//Запрашиваются поля которые не разрешены в полях
									list_vidForRemove.push(
										list_vidForFlexoCheck[i].listAllowedOf_vid );

								}

							} else if ( list_vidForFlexoCheck[i].type === MODIFY ) {

								if ( flexoAccess[MODIFY] ){
									difference = underscore.difference(
										list_vidForFlexoCheck[i].fields,
										flexoAccess[MODIFY][list_vidForFlexoCheck[i].schemeName] );

									if( difference.length !== 0 ) {
										//Запрашиваются поля которые не разрешены в полях
										list_vidForRemove.push(
											list_vidForFlexoCheck[i].listAllowedOf_vid );
									}
								} else {
									//Запрашиваются поля которые не разрешены в полях
									list_vidForRemove.push(
										list_vidForFlexoCheck[i].listAllowedOf_vid );
								}

							} else if ( list_vidForFlexoCheck[i].type === CREATE ) {

								if( list_vidForFlexoCheck[i].fields.length === 0 ) {
									//Проверяется общее разрешение на создание документа в целом
									if ( flexoAccess[CREATEALL][list_vidForFlexoCheck[i].schemeName]
										!== 1 ) {
										list_vidForRemove.push(
											list_vidForFlexoCheck[i].listAllowedOf_vid );
									}
								} else {
									if ( flexoAccess[CREATE] ) {
										//Проверяется частные разрешения на создание документа
										difference = underscore.difference(
											list_vidForFlexoCheck[i].fields,
											flexoAccess[CREATE][list_vidForFlexoCheck[i].schemeName]
										);

										if( difference.length !== 0 ){
											//Запрашиваются поля которые не разрешены в полях
											list_vidForRemove.push(
												list_vidForFlexoCheck[i].listAllowedOf_vid );
										}
									} else {
										//Запрашиваются поля которые не разрешены в полях
										list_vidForRemove.push(
											list_vidForFlexoCheck[i].listAllowedOf_vid );
									}

								}

							} else if ( list_vidForFlexoCheck[i].type === DELETE ) {

								//Проверяется общее разрешение на удаление документа в целом
								if ( flexoAccess['delete'][list_vidForFlexoCheck[i].schemeName]
									!== 1 ) {
									list_vidForRemove.push(
										list_vidForFlexoCheck[i].listAllowedOf_vid );
								}
							}
						}

						listAllowedOf_vid = underscore.difference(
							listAllowedOf_vid, list_vidForRemove );

						if(aDescriptioneError.length !== 0){
							ModuleErrorLogging.save(client, aDescriptioneError,
								function ( err, reply ) {
								if ( err ) {
									callback( err );
								} else {
									callback( null, listAllowedOf_vid );
								}
							});
						} else {
							callback( null, listAllowedOf_vid );
						}
					}
				});
			} else {
				if(aDescriptioneError.length !== 0){
					ModuleErrorLogging.save(client, aDescriptioneError, function ( err, reply ) {
						if ( err ) {
							callback( err );
						} else {
							callback( null, listAllowedOf_vid );
						}
					});
				} else {
					callback( null, listAllowedOf_vid );
				}
			}

		}
	} );
}

function crossingAccessForFlexo( user, role, flexoSchemes, callback ) {

	//Запрашиваемый данные о правах для определения пересечения
	async.parallel([
		function(cb){
			AccessModuleRoleFlexo.accessDataPreparation( client, role, globalFlexoSchemes,
				flexoSchemes, cb);
		},
		function(cb){
			AccessModuleUserFlexo.accessDataPreparation( client, user, globalFlexoSchemes,
				flexoSchemes, cb );
		}
	],
		function( err, replies ) {
			if( err ) {
				callback ( err )
			} else {
				//Определение пересечения прав
				var objAccessRole = replies[0];
				var objAccessUser = replies[1];

				//Объект хранящий готовое пересечение прав на чтение
				var objAccess = {};

				for( var i = 0; i < flexoSchemes.length; i++ ) {

					//Чтение
					objAccess = crossingAccess( READ, flexoSchemes[i], objAccessRole,
						objAccessUser, objAccess );

					//Модификация
					objAccess = crossingAccess( MODIFY, flexoSchemes[i], objAccessRole,
						objAccessUser, objAccess );

					//Создание
					objAccess = crossingAccess( CREATE, flexoSchemes[i], objAccessRole,
						objAccessUser, objAccess );

					//Cоздание в целом
					var createAll = 0;

					if( objAccessRole[flexoSchemes[i]] &&
						!underscore.isUndefined( objAccessRole[flexoSchemes[i]][CREATEALL] ) ) {
						createAll = objAccessRole[flexoSchemes[i]][CREATEALL];
					}

					if(objAccessUser[flexoSchemes[i]] &&
						!underscore.isUndefined( objAccessUser[flexoSchemes[i]][CREATEALL] ) ){
						if( objAccessUser[flexoSchemes[i]][CREATEALL] === 0) {
							createAll = 0;
						} else if ( objAccessUser[flexoSchemes[i]][CREATEALL] === 1) {
							createAll = 1;
						}
					}

					if ( !objAccess[CREATEALL] ) {
						objAccess[CREATEALL] = {}
					}

					objAccess[CREATEALL][flexoSchemes[i]] = createAll;

					//Удаление
					var del = 0;

					if( objAccessRole[flexoSchemes[i]] &&
						!underscore.isUndefined( objAccessRole[flexoSchemes[i]][DELETE] ) ) {
						del = objAccessRole[flexoSchemes[i]][DELETE];
					}

					if( objAccessUser[flexoSchemes[i]] &&
						!underscore.isUndefined( objAccessUser[flexoSchemes[i]][DELETE] ) ) {
						if( objAccessUser[flexoSchemes[i]][DELETE] === 0) {
							del = 0;
						} else if ( objAccessUser[flexoSchemes[i]][DELETE] === 1 ) {
							del = 1;
						}
					}

					if ( !objAccess[DELETE] ) {
						objAccess[DELETE] = {}
					}

					objAccess[DELETE][flexoSchemes[i]] = del;
				}

				callback( null, objAccess );

			}
		}
	);
}

function crossingAccessForView( user, role, viewName, callback ) {
	//Запрашиваемый данные о правах для определения пересечения
	async.parallel( [
		function(cb){
			AccessModuleRoleView.find( client, role, viewName, function( err, objAccess ) {
				if ( err && err.message === 'Controller: No requested object access (role: ' +
					role +', viewName: ' + viewName + ')' ) {
					cb( null, {add:[], del:[]} );
				} else if ( err ) {
					cb( err );
				} else {
					cb( null, AccessModuleRoleView.accessPreparation( objAccess,
						globalViewConfig[viewName] ) );
				}
			} );
		},
		function(cb){
			AccessModuleUserView.find( client, user, viewName, function( err, objAccess ) {
				if ( err && err.message === 'Controller: No requested object access (user: ' +
					user +', viewName: ' + viewName + ')' ) {
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
		function( err, replies ) {
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

function crossingAccess ( method, scheme, objAccessRole, objAccessUser, objAccessArg ) {
	var fields = [];
	var addFields = [];
	var removeFields = [];
	var objAccess = underscore.clone( objAccessArg );

	if( objAccessRole[scheme] && objAccessRole[scheme][method] ) {
		fields = objAccessRole[scheme][method];
	}

	if( objAccessUser[scheme] && objAccessUser[scheme][method] ) {
		addFields = objAccessUser[scheme][method][0];
		removeFields = objAccessUser[scheme][method][1];
	}

	var permisionFields = underscore.union( fields, addFields );
	permisionFields = underscore.difference( permisionFields, removeFields );

	if( permisionFields.length !== 0 ) {
		if ( !objAccess[method] ) {
			objAccess[method] = {};
		}
		objAccess[method][scheme] = permisionFields;
	}

	return objAccess;
}

Controller.findErrorLogging = function findErrorLogging( options, callback ){
	if ( options.all ) {
		ModuleErrorLogging.findFromMinToMax(client, MIN_DATETIME, MAX_DATETIME, callback);
	} else if ( options.min && options.max ) {
		ModuleErrorLogging.findFromMinToMax(client, options.min, options.max, callback);
	} else if ( options.min ) {
		ModuleErrorLogging.findFromMinToMax(client, options.min, MAX_DATETIME, callback);
	} else if ( options.max ) {
		ModuleErrorLogging.findFromMinToMax(client, MIN_DATETIME, options.max, callback);
	}
};