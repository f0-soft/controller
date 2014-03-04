var redis = require('redis');
var sys = require('sys');
var async = require('async');
var _ = require('underscore');

var AccessModuleView = require('./modules/access_module_view.js');
var AccessModuleFlexo = require('./modules/access_module_flexo.js');
var checkAccess = require('./modules/cheackAccess.js');

var ModuleErrorLogging = require('./modules/module_error_logging.js');
var ModuleUser = require('./modules/module_user.js');
var ModuleTreeData = require('./modules/module_tree_data');


var client;
var globalFlexoSchemes;
var globalViewConfig;
var flexo;
var View;
var globalViewConfigForAdminPanel;

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
	//Проверка налчие функции обратного выхова
	if (!_.isFunction(callback)){
		throw new Error( 'Controller: callback not a function' );
	}
	//Проверка наличия экземпляра view
	if ( config && config.view ) {
		//Копируем ссылку на view
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

	if ( config.viewForAdminPanel ) {
		globalViewConfigForAdminPanel = config.viewForAdminPanel;
	} else {
		callback( new Error( 'Controller: Parameter viewForAdminPanel is not specified in the ' +
			'config object' ) );
		return;
	}

	if ( config.flexoSchemes ) {
		globalFlexoSchemes = config.flexoSchemes;
	} else {
		callback( new Error( 'Controller: Parameter flexoSchemes is not specified in the config ' +
			'object' ) );
		return;
	}
	//Настройки подключения к redis
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

Controller.create = function create( query, sender, callback ) {
	var objDescriptioneError; //Переменная для хранения описания ошибки

	if ( !_.isFunction( callback ) ) {
		throw new Error( 'Controller: callback not a function' );
	} else if ( !INITIALIZED ) {
		//Логирование ошибки, не проинициалазирован контролер
		objDescriptioneError = ModuleErrorLogging.error1( sender, query );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !query ) {
		//Логирование ошибки, отсутствует запрос
		objDescriptioneError = ModuleErrorLogging.error2( sender );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( query.user ) {
		//Запрос на создание пользователя
		ModuleUser.createUser( client, sender, query, View, callback );
	} else if ( query.role ) {
		//ToDo:валидация объекта роли
		//Запрос на создание роли
		ModuleUser.createRole(client, query.role, callback );
	} else if ( query.access ) {
		//Запроса на создание прав
		if ( query.access.viewName ) {
			//Запрос на создание прав view
			if ( query.access.role ) {
				//Запрос на создание прав view по роли
				AccessModuleView.saveForRole( client, sender, query.access.role,
					query.access.viewName,	query.access.objAccess,
					globalViewConfig[query.access.viewName], callback );
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю
				AccessModuleView.saveForUser( client, sender, query.access.login,
					query.access.viewName, query.access.objAccess,
					globalViewConfig[query.access.viewName], callback );
			} else {
				//Логирование ошибки
				objDescriptioneError = ModuleErrorLogging.error13( sender, query );
				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на создание прав flexo по роли
				AccessModuleFlexo.saveForRole( client, sender, query.access.role,
					query.access.flexoSchemeName, query.access.objAccess,
					globalFlexoSchemes[query.access.flexoSchemeName], callback );
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю
				AccessModuleFlexo.saveForUser( client, sender, query.access.login,
					query.access.flexoSchemeName, query.access.objAccess,
					globalFlexoSchemes[query.access.flexoSchemeName], callback );
			} else {
				//Логирование ошибки
				objDescriptioneError = ModuleErrorLogging.error14( sender, query );
				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} else {
			//Логирование ошибки
			objDescriptioneError = ModuleErrorLogging.error15( sender, query );
			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		}
	} else {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error16( sender, query );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

Controller.find = function find( query, sender, callback ) {
	//Переменная для хранения описания ошибки
	var objDescriptioneError;

	if (!_.isFunction( callback ) ) {
		throw new Error( 'Controller: callback not a function' );
	} else if ( !INITIALIZED ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error17( sender, query );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !query ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error18( sender );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( query.user ) {
		var flexoSchemeName = 'users';
		if( query.user.login || query.user._id ){
		    //Простой поиск одного пользователя
			var login = query.user.login || null;
			var _id = query.user._id || null;

			ModuleUser.find( client, sender, _id, login, function(err, reply){
				if ( err ){
					callback( err );
				} else {
					var obj = {};
					obj[flexoSchemeName] = [reply];
					callback(null, obj);
				}
			} );
		} else if ( query.user.companiesForUser ) {
			//Запрашивает массив с описанием компаний принадлежных к роли
			var viewName = 'sys_company';

			if ( viewName ) {
				//Запрашиваем данные из view
				var request = { selector:{} };
				request.selector[viewName] = {};
				var options =
				{company_id:sender.company_id, user_id: sender.userId, role:sender.role};

				View.find(viewName, ['a1', 'a2', 'a3'], request, options,
					function ( err, documents ) {
					if ( err ) {
						//Логирование ошибки
						objDescriptioneError =
							ModuleErrorLogging.error19( sender, viewName, request, err );
						ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
					} else {
						callback(null, documents.result);
					}
				} );
			} else {
				callback(null, []);
			}

		} else if ( query.user.allUser ) {
			ModuleUser.findListOfUsers(client, function( err, replies ) {
				if ( err ) {
					callback( err );
				} else if ( query.user.allView ) {
					callback( null, replies, Object.keys( globalViewConfig ) );
				} else if ( query.user.allFlexo ) {
					callback( null, replies, Object.keys( globalFlexoSchemes ) );
				} else {
					callback( null, replies );
				}
			});
		} else if ( query.user.allObjUser ) {
			ModuleUser.findObjUsers(client, function( err, replies ) {
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
				} else if ( query.user.allView ) {
					callback( null, replies, Object.keys( globalViewConfig ) );
				} else if ( query.user.allFlexo ) {
					callback( null, replies, Object.keys( globalFlexoSchemes ) );
				} else {
					callback( null, replies );
				}
			});
		} else if ( query.user.allObjRole ) {
			ModuleUser.findObjRoles(client, function( err, replies ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, replies );
				}
			});
		} else if ( query.user.allViewsUser ) {
			ModuleUser.findListOfViewsUser(client, query.user.allViewsUser, function( err, replies ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, replies, Object.keys(globalViewConfig) );
				}
			} );
		} else if ( query.user.allFlexosUser ) {
			ModuleUser.findListOfFlexosUser(client, query.user.allFlexosUser, function( err, replies ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, replies, Object.keys(globalFlexoSchemes) );
				}
			} );
		} else if ( query.user.allViewsRole ) {
			ModuleUser.findListOfViewsRole(client, query.user.allViewsRole, function( err, replies ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, replies, Object.keys(globalViewConfig) );
				}
			} );
		} else if ( query.user.allFlexosRole ) {
			ModuleUser.findListOfFlexosRole(client, query.user.allFlexosRole, function( err, replies ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, replies, Object.keys(globalFlexoSchemes)  );
				}
			} );
		} else {
			//Логирование ошибки
			objDescriptioneError = ModuleErrorLogging.error20( sender, query );
			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		}
	} else if ( query.access ) {
		//Запроса на чтение прав
		if ( query.access.viewName ) {
			//Запрос на чтение прав view
			if ( query.access.role ) {
				//Запрос на чтение прав view по роли
				//Запрашиваемый искомый объект прав
				AccessModuleView.findForRole( client, sender, query.access.role,
					query.access.viewName, function( err, reply ) {
						callback( err, reply, globalViewConfigForAdminPanel[query.access.viewName]);
					} );
			} else if ( query.access.login ) {
				//Запрос на чтение прав view по пользователю
				//Запрашиваемый искомый объект прав
				AccessModuleView.findForUser( client, sender, query.access.login,
					query.access.viewName, function( err, reply ) {
						callback( err, reply, globalViewConfigForAdminPanel[query.access.viewName]);
					} );

			} else {
				//Логирование ошибки
				objDescriptioneError = ModuleErrorLogging.error21( sender, query );
				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на чтение прав flexo по роли

				//Запрашиваемый искомый объект прав
				AccessModuleFlexo.findForRole( client, sender, query.access.role,
					query.access.flexoSchemeName, function( err, reply ) {
						callback( err, reply, globalFlexoSchemes[query.access.flexoSchemeName] )
					} );

			} else if ( query.access.login ) {
				//Запрос на чтение прав view по пользователю
				//Запрашиваемый искомый объект прав
				AccessModuleFlexo.findForUser( client, sender, query.access.login,
					query.access.flexoSchemeName, function( err, reply ) {
						callback( err, reply, globalFlexoSchemes[query.access.flexoSchemeName] )
					} );

			} else {
				//Логирование ошибки
				objDescriptioneError = ModuleErrorLogging.error22( sender, query );
				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} else {
			//Логирование ошибки
			objDescriptioneError = ModuleErrorLogging.error23( sender, query );
			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		}
	} else {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error24( sender, query );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

Controller.delete = function del( query, sender, callback ) {
	//Переменная для хранения описания ошибки
	var objDescriptioneError;

	if (!_.isFunction( callback ) ) {
		throw new Error( 'Controller: callback not a function' );
	} else if ( !INITIALIZED ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error25( sender, query );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !query ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error26( sender, query );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( query.user ) {
		//Простое удаление одного пользователя
		var login = query.user.login || null;
		var _id = query.user._id || null;

		ModuleUser.delete( client, sender, _id, login, function(err, reply){
			if ( err ){
				callback( err );
			} else {
				callback(null, reply);
			}
		} );
	} else if ( query.role ) {
	    ModuleUser.deleteRole(client, sender, query.role, function(err, reply){
			if ( err && reply ){
				callback( err, reply );
			} else if ( reply ){
				callback(null, reply);
			} else {
				callback( err );
			}
		} );
	} else if ( query.access ) {
		//Запроса на создание прав
		if ( query.access.viewName ) {
			//Запрос на удаление прав view
			if ( query.access.role ) {
				//Запрос на удаление прав view по роли
				//Создаем модель прав по роли для view
				AccessModuleView.deleteForRole( client, query.access.role, query.access.viewName,
					callback );
			} else if ( query.access.login ) {
				//Запрос на удаление прав view по пользователю
				//Удаляем запрашиваемый объект прав
				AccessModuleView.deleteForUser( client, query.access.login, query.access.viewName,
					callback );
			} else {
				//Логирование ошибки
				objDescriptioneError = ModuleErrorLogging.error27( sender, query );
				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на удаление прав flexo по роли
				//Удаляем запрашиваемый объект прав
				AccessModuleFlexo.deleteForRole( client, query.access.role,
					query.access.flexoSchemeName, callback );

			} else if ( query.access.login ) {
				//Запрос на удаление прав flexo по пользователю
				//Удаляем запрашиваемый объект прав
				AccessModuleFlexo.deleteForUser( client, query.access.login,
					query.access.flexoSchemeName, callback );
			} else {
				//Логирование ошибки
				objDescriptioneError = ModuleErrorLogging.error28( sender, query );
				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} else {
			//Логирование ошибки
			objDescriptioneError = ModuleErrorLogging.error29( sender, query );
			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		}
	} else {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error30( sender, query );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

Controller.modify = function modify( query, sender, callback ) {
	var objDescriptioneError; //Переменная для хранения описания ошибки

	if ( !_.isFunction( callback ) ){
		throw new Error( 'Controller: callback not a function' );
	} else if ( !INITIALIZED ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error31( sender, query );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !query ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error32( sender );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( query.user ) {
		//Простая модификация одного пользователя
		ModuleUser.modifyUser( query, sender, View, callback );
	} else if ( query.access ) {
		//Запроса на создание прав
		if ( query.access.viewName ) {
			//Запрос на создание прав view
			if ( query.access.role ) {
				//Запрос на создание прав view по роли
				AccessModuleView.saveForRole( client, sender, query.access.role,
					query.access.viewName, query.access.objAccess,
					globalViewConfig[query.access.viewName], callback );
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю
				AccessModuleView.saveForUser( client, sender, query.access.login,
					query.access.viewName, query.access.objAccess,
					globalViewConfig[query.access.viewName], callback );
			} else {
				//Логирование ошибки
				objDescriptioneError = ModuleErrorLogging.error34( sender, query );
				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на создание прав flexo по роли
				AccessModuleFlexo.saveForRole( client, sender, query.access.role,
					query.access.flexoSchemeName, query.access.objAccess, callback );
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю
				AccessModuleFlexo.saveForUser( client, sender, query.access.login,
					query.access.flexoSchemeName, query.access.objAccess, callback );
			} else {
				//Логирование ошибки
				objDescriptioneError = ModuleErrorLogging.error35( sender, query );
				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} else {
			//Логирование ошибки
			objDescriptioneError = ModuleErrorLogging.error36( sender, query );
			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		}
	} else {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error37( sender, query );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

Controller.getTemplate = getTemplate;

function getTemplate(object, socket, callback ) {
	var viewName = object.viewName || null;
	var sender = {
		userId: socket.userId || null,
		role: socket.role || null,
		login: socket.login || null,
		place: object.place || null,
		company_id:socket.company_id || null
	};

	var objDescriptioneError;
	if (!_.isFunction(callback)){
		throw new Error( 'Controller: callback not a function' );
	} else if ( !INITIALIZED ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error38( sender, viewName );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !_.isString( viewName ) && globalViewConfig[viewName] ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error39( sender );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !_.isString( sender.login ) ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error40( sender, viewName );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !_.isString( sender.role ) ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error41( sender, viewName );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !socket ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error42( sender, viewName );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else
	//Проверяем есть ли уже готовый список разрешенных идентификаторов для view
	if( socket.view && socket.view[viewName] ) {
		//Подготовленный список _vid есть
		getTemplateFromView( socket, sender, viewName, socket.view[viewName].ids,
			socket.view[viewName].useId, callback );
	} else {
		//Нет прав подготавливаем права и flexo модели
		formingFlexoAndView( sender, viewName, function ( err, listAllowedOf_vid, useId ) {
			if ( err ) {
				callback( err );
			} else {
				if ( !socket.view ) {
					socket.view = {};
				}

				getTemplateFromView( socket, sender, viewName, listAllowedOf_vid, useId, callback );
			}
		} );
	}
}

//Функция запрашивает необходимый шаблон у view
function getTemplateFromView( socket, sender, viewName, listAllowedOf_vid, useId, callback ){
	//ToDo:Временное фиксация времени
	var time = new Date().getTime();
	View.getTemplate( viewName, listAllowedOf_vid, function( err, ids, config, template ) {
		if( err ) {
			//Логирование ошибки
			objDescriptioneError =
				ModuleErrorLogging.error43( sender, viewName, listAllowedOf_vid, err );
			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		} else {
			//ToDo: оптимизировать формирование списков
			//Формируем 2 дополнительных списка на создание и чтение
			var listForRead = [];
			for( var i = 0; i < ids.length ; i++ ) {
				var globalVid = globalViewConfig[viewName][ids[i]];
				if ( globalVid.flexo ) {
					if ( globalVid.type === READ || globalVid.type === MODIFY ) {
						listForRead.push( ids[i] );
					}
				}
			}

			socket.view[viewName] = {ids:ids, useId:!!useId, listForRead:listForRead};

			if( listAllowedOf_vid.length !== ids.length ){
				//Логирование ошибки целостности, так как view обрезала список
				// разрешенных идентификаторов
				var objDescriptioneError =
					ModuleErrorLogging.error44( sender, listAllowedOf_vid, viewName, ids );
				ModuleErrorLogging.save(client, [objDescriptioneError],
					function( err, reply ) {
						if ( err ) {
							callback( err );
						} else {
							callback( null, config, template, time );
						}
					} );
			} else {
				callback( null, config, template, time );
			}
		}
	});
}

Controller.queryToView = function queryToView( object, socket, callback ) { //type, sender, request, viewName, socket, callback ) {
	var type = object.type || null;
	var sender = {
		userId: socket.userId || null,
		role: socket.role || null,
		login: socket.login || null,
		place: object.place || null,
		company_id:socket.company_id || null
	};
	var request = object.request || null;
	var viewName = object.viewName || null;
	var options; //Переменная для хранения объекта параметров запроса

	var objDescriptioneError;
	if ( !_.isFunction( callback ) ) {
		throw new Error( 'Controller: callback not a function' );
	} else if ( !sender.company_id ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error45( sender, type, request, viewName );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !socket ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error46( sender, type, request, viewName );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !INITIALIZED ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error47( sender, type, request, viewName, socket );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !_.isString( viewName ) ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error48( sender, type, request, viewName, socket );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !request ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error49( sender, type, request, viewName, socket );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( type !== READ && !_.isArray( request ) ) {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error50( sender, type, request, viewName, socket );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}

	if( socket.view && socket.view[viewName] ) {
		//Подготовленный список разрешенных _vid есть
		if( type === READ ) {
			//Проверяем наличие всех необходимых разрешений
			if( checkAccess.checkRead( viewName, request, socket.view,  globalViewConfig, READ,
				MODIFY ) ) {
				//Вызываем view c необходимыми параметрами
				//Формируем объект параметров для View
				options = {
					company_id: sender.company_id,
					user_id: sender.userId,
					role: sender.role
				};
				//ToDo:временно заcекается время
				var time = new Date().getTime();
				View.find( viewName, socket.view[viewName].listForRead, request, options,
					function ( err, documents ) {
					if ( err ) {
						//Логирование ошибки
						objDescriptioneError =
							ModuleErrorLogging.error51( sender, request, viewName, options,
								socket, err );
						ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
					} else {
						callback( null, documents, null, time );
					}
				} );

			} else {
				//Логирование ошибки, нет необходимых разрешений
				objDescriptioneError =
					ModuleErrorLogging.error52( sender, request, viewName, socket );
				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}

		} else if ( type === CREATE ) {

			if( checkAccess.checkCreate( viewName, request, socket.view[viewName].ids,
				globalViewConfig, MODIFY ) ) {
				//Вызываем view c необходимыми параметрами
				//Формируем объект параметров для View
				options = {
					company_id:sender.company_id,
					user_id: sender.userId,
					role: sender.role
				};

				View.insert( viewName, socket.view[viewName].listForRead, request, options,
					function ( err, documents ) {
					if ( err ) {
						//Логирование ошибки
						objDescriptioneError =
							ModuleErrorLogging.error53( sender, request, viewName, options, err );
						ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
					} else {
						callback( null, documents );
					}
				} );
			} else {
				//Логирование ошибки, нет необходимых разрешений
				objDescriptioneError =
					ModuleErrorLogging.error54( sender, request, viewName, socket );
				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}

		} else if ( type === MODIFY ) {

			if( checkAccess.checkModify( viewName, request, socket.view[viewName].ids,
				globalViewConfig, MODIFY ) ) {
				//Вызываем view c необходимыми параметрами
				//Формируем объект параметров для View
				options = {
					company_id:sender.company_id,
					user_id: sender.userId,
					role: sender.role
				};

				View.modify( viewName, request, options, function ( err, documents ) {
					if ( err ) {
						//Логирование ошибки
						objDescriptioneError =
							ModuleErrorLogging.error55( sender, request, viewName, options, err );
						ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
					} else {
						callback( null, documents );
					}
				} );
			} else {
				//Логирование ошибки, нет необходимых разрешений
				objDescriptioneError =
					ModuleErrorLogging.error56( sender, request, viewName, socket );
				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}

		} else if ( type === DELETE ) {

			if( checkAccess.checkDelete( viewName, request, socket.view[viewName].ids,
				globalViewConfig, DELETE ) ) {
				//Формируем объект параметров для View
				options = {
					company_id:sender.company_id,
					user_id: sender.userId,
					role: sender.role
				};

				View.delete( viewName, request, options, function ( err, documents ) {
					if ( err ) {
						//Логирование ошибки
						objDescriptioneError =
							ModuleErrorLogging.error57( sender, request, viewName, options, err );
						ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
					} else {
						callback( null, documents );
					}
				} );
			} else {
				//Логирование ошибки, нет необходимых разрешений
				objDescriptioneError =
					ModuleErrorLogging.error58( sender, request, viewName, socket );
				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}

		} else {
			//Логирование ошибки
			objDescriptioneError =
				ModuleErrorLogging.error59( sender, type, request, viewName, socket );
			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		}
	} else {
		//Логирование ошибки
		objDescriptioneError = ModuleErrorLogging.error60( sender, type, request, viewName, socket );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

function formingFlexoAndView( sender, viewName, callback ){
	var user = sender.login;
	var role = sender.role;

	//Формируем объект с правами для view
	AccessModuleView.accessPreparation( client, role, user, viewName, globalViewConfig[viewName],
		function( err, listAllowedOf_vid, useId ) {
		if( err ) {
			//ToDo: возможно логирование ошибки от redis
			callback ( err );
		} else if ( listAllowedOf_vid.length === 0 ) {
			//Логирование ошибки
			objDescriptioneError = {
				type: 'access_violation',
				variant: 1,
				place: 'Controller.AccessModuleView.accessPreparation',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					viewName:viewName
				},
				descriptione: {
					title:'Controller: No permissions access to view ' + viewName,
					text:'Нет разрешений на view в redis для данного пользователя и роли',
					globalView:globalViewConfig[viewName]
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
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
							fields: _.without(	_vidsDataFromViewConfig.flexo, schemeName ),
							type: _vidsDataFromViewConfig.type
						});
					}

				} else {
					//Логирование ошибки целостности, разрешен в правах на view для _vid
					//которого нет в глобальной переменной
					var objDescriptioneError = {
						type:'loss_integrity',
						variant:1,
						place: 'Controller.AccessModuleView.accessPreparation',
						time: new Date().getTime(),
						sender:sender,
						arguments:{
							viewName:viewName
						},
						descriptione: {
							text:'Ошибка целостности, так как есть разрешения на элемент view ' +
								'которого нет в глобальной переменной',
							allowedOf_vid:listAllowedOf_vid[i],
							globalView:globalViewConfig[viewName]
						}
					};

					aDescriptioneError.push(objDescriptioneError);

					list_vidForRemove.push( listAllowedOf_vid[i] );
				}
			}

			listOfFlexoSchemes = _.uniq( listOfFlexoSchemes );
			listAllowedOf_vid = _.difference( listAllowedOf_vid, list_vidForRemove );

			if ( listOfFlexoSchemes.length ) {
				//Подготавливаем объект с правами для view
				AccessModuleFlexo.accessDataPreparation( client, sender, listOfFlexoSchemes,
					globalFlexoSchemes, function( err, flexoAccess ){
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

								difference = _.difference(
									list_vidForFlexoCheck[i].fields,
									flexoAccess[list_vidForFlexoCheck[i].schemeName][READ] );

								if( difference.length !== 0 ){
									//Запрашиваются поля которые не разрешены в правах
									list_vidForRemove.push(
										list_vidForFlexoCheck[i].listAllowedOf_vid );
								}

							} else if ( list_vidForFlexoCheck[i].type === MODIFY ) {

                                difference = _.difference(
									list_vidForFlexoCheck[i].fields,
									flexoAccess[list_vidForFlexoCheck[i].schemeName][MODIFY] );

								if( difference.length !== 0 ) {
									//Запрашиваются поля которые не разрешены в полях
									list_vidForRemove.push(
										list_vidForFlexoCheck[i].listAllowedOf_vid );
								}

							} else if ( list_vidForFlexoCheck[i].type === CREATE ) {

								if( list_vidForFlexoCheck[i].fields.length === 0 ) {
									//Проверяется общее разрешение на создание документа в целом
									if ( flexoAccess[list_vidForFlexoCheck[i].schemeName][CREATEALL]
										!== 1 ) {
										list_vidForRemove.push(
											list_vidForFlexoCheck[i].listAllowedOf_vid );
									}
								} else {

										//Проверяется частные разрешения на создание документа
										difference = _.difference(
											list_vidForFlexoCheck[i].fields,
											flexoAccess[list_vidForFlexoCheck[i].schemeName][CREATE]
										);

										if( difference.length !== 0 ){
											//Запрашиваются поля которые не разрешены в полях
											list_vidForRemove.push(
												list_vidForFlexoCheck[i].listAllowedOf_vid );
										}

								}

							} else if ( list_vidForFlexoCheck[i].type === DELETE ) {

								//Проверяется общее разрешение на удаление документа в целом
								if ( flexoAccess[list_vidForFlexoCheck[i].schemeName]['delete']
									!== 1 ) {
									list_vidForRemove.push(
										list_vidForFlexoCheck[i].listAllowedOf_vid );
								}
							}
						}

						listAllowedOf_vid = _.difference(
							listAllowedOf_vid, list_vidForRemove );

						if(aDescriptioneError.length !== 0){
							ModuleErrorLogging.save(client, aDescriptioneError,
								function ( err, reply ) {
								if ( err ) {
									callback( err );
								} else {
									callback( null, listAllowedOf_vid, useId );
								}
							});
						} else {
							callback( null, listAllowedOf_vid, useId );
						}
					}
				});
			} else {
				if(aDescriptioneError.length !== 0){
					ModuleErrorLogging.save(client, aDescriptioneError, function ( err, reply ) {
						if ( err ) {
							callback( err );
						} else {
							callback( null, listAllowedOf_vid, useId );
						}
					});
				} else {
					callback( null, listAllowedOf_vid, useId );
				}
			}

		}
	} );
}

Controller.findErrorLogging = function findErrorLogging( options, sender, callback ){
	var objDescriptioneError;

	if ( options ) {
		if ( options.all ) {
			ModuleErrorLogging.findFromMinToMax(client, MIN_DATETIME, MAX_DATETIME, callback);
		} else if ( options.min && options.max ) {
			ModuleErrorLogging.findFromMinToMax(client, options.min, options.max, callback);
		} else if ( options.min ) {
			ModuleErrorLogging.findFromMinToMax(client, options.min, MAX_DATETIME, callback);
		} else if ( options.max ) {
			ModuleErrorLogging.findFromMinToMax(client, MIN_DATETIME, options.max, callback);
		} else {
			//Логирование ошибки
			objDescriptioneError = {
				type: 'invalid_function_arguments',
				variant: 1,
				place: 'Controller.findErrorLogging',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					options:options
				},
				descriptione: {
					title:'Controller: Incorrect parameters in options',
					text:'Не указаны параметры поиска ошибки в объекте options'
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		}
	} else {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 2,
			place: 'Controller.findErrorLogging',
			time: new Date().getTime(),
			sender:sender,
			descriptione: {
				title:'Controller: Not set argument options',
				text:'Не определен или равен нулю аргумент функции options'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

Controller.deleteErrorLogging = function deleteErrorLogging( time, option, sender, callback ){
	var objDescriptioneError;

	if ( time ) {
		ModuleErrorLogging.deleteErrorLogging(client, time, callback);
	} else if ( option ) {
		ModuleErrorLogging.deleteAllErrorLogging(client, callback);
	} else {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 1,
			place: 'Controller.deleteErrorLogging',
			time: new Date().getTime(),
			sender:sender,
			descriptione: {
				title:'Controller: Not set argument time or option',
				text:'Не определен или равен нулю аргумент функции time или option'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

Controller.treeData = function treeData( typeContent, typeOperation, oTreeData, callback ) {
	//ToDo:доделать логирование ошибок
	if ( typeContent === 'view' ) {
		if ( typeOperation === 'read' ) {
			var listOfView = Object.keys(globalViewConfig);
			ModuleTreeData.getGeneralTreeView(client, listOfView, callback);
		} else if ( typeOperation === 'write') {
			ModuleTreeData.setGeneralTreeView(client, oTreeData, callback);
		} else {
			callback('Unknown type operation');
		}
	} else if ( typeContent === 'flexo' ) {
		if ( typeOperation === 'read' ) {
			var listOfFlexo = Object.keys(globalFlexoSchemes);
			ModuleTreeData.getGeneralTreeFlexo(client, listOfFlexo, callback);
		} else if ( typeOperation === 'write') {
			ModuleTreeData.setGeneralTreeFlexo(client, oTreeData, callback);
		} else {
			callback('Unknown type operation');
		}
	} else {
		callback('Unknown type content');
	}
};


Controller.saveUploadFileStatus = function(user, idFile, type, status, callback){
	//ToDo:доделать логирование ошибок
	//Формируем ключ редиса
	var redisKey = 'uploadFileStatus:' + user + ':' + idFile + ':' + type;

	client.set(redisKey, status, function(err, reply) {
		if (err) {
			callback(err);
		} else {
			client.expire(redisKey, 60*60*10);
			callback(null, true);
		}
	});
};

Controller.readUploadFileStatus = function(user, idFile, type, callback){
	//ToDo:доделать логирование ошибок

	//Формируем ключ редиса
	var redisKey = 'uploadFileStatus:' + user + ':' + idFile + ':' + type;

	client.get(redisKey, function(err, status) {
		if (err) {
			callback(err);
		} else {
			callback(null, status);
		}
	});
};

Controller.checkUsers = function checkUsers(sender, callback){
	//ToDo:доделать логирование ошибок
	//Получаем список пользорвателей из redis
	ModuleUser.findListOfUsers(client, function( err, listOfUsersFromRedis ){
		if(err){
			callback( err );
		} else {
			//Получаем всех пользователей из mongo
			var request = {selector: { 'sys_users': {} } };
			var options = {company_id:sender.company_id, user_id: sender.userId, role:sender.role};
			View.find( 'sys_users', ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'], request,
				options, function ( err, documentsMongoUsers ) {
					if (err){
						callback(err);
					} else {
						//Список пользователей в mongo
						var listOfUsersFromMongo = [];

						for( var i=0; i<documentsMongoUsers.result[0].length; i++){
							listOfUsersFromMongo.push(documentsMongoUsers.result[0][i]['a3']);
						}

						//Формирую список пользователей, которые есть в mongo и в redis
						var listOfUsersIntersection = _.intersection( listOfUsersFromRedis, listOfUsersFromMongo );

						//Формируем список пользователей, которые есть в redis, но нет в mongo
						var listUsersOnlyRedis = _.difference( listOfUsersFromRedis, listOfUsersFromMongo );

						//Удаляем пользователей из redis

						async.parallel({
							cheakUsersInRedis:function(cb){

								async.map(
									listUsersOnlyRedis,
									function(login, cbMap){

										//Читаем данные из redis
										ModuleUser.find(client, sender, null, login, function(err, doc){
											if( err ) {
												cbMap(err);
											} else {
												if ( doc && doc.role !== 'admin' ){
													//Удаляем пользователя из Redis
													ModuleUser.delete(client, sender, null, login, cbMap);
												} else {
													cbMap(null, false);
												}
											}
										});

									},
									cb
								)

							},
							cheakUsersInRedisAndMongo:function(cb){

								async.map(
									listOfUsersIntersection,
									function(login, cbMap){

										//Читаем данные из Redis
										ModuleUser.find(client, sender, null, login, function(err, docFromRedis){
											if( err ) {
												cbMap(err);
											} else {

												//Читаем данные из mongo
												var request = {selector: { 'sys_users': {'a3': login} } };
												var options = {company_id:sender.company_id, user_id: sender.userId, role:sender.role};
												View.find( 'sys_users', ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'], request,
													options, function ( err, docFromMongo ) {

													if (err){
														cbMap(err);
													} else {
											            //Анализируем результат из mongo и redis
														if( docFromRedis.role !== docFromMongo.result[0][0]['a7'] ){
															//Обновлемя данные в mongo
															var request = [ {
																selector: {  'a1': docFromMongo.result[0][0]['a1'], 'a2':docFromMongo.result[0][0]['a2'] },
																properties: { 'a7': docFromRedis.role }
															} ];
															var options = {company_id:sender.company_id, user_id: sender.userId, role:sender.role};
															View.modify( 'sys_users', request, options, function( err, docFromMongoUpdated ) {
																if ( err ) {
																	cbMap(err)
																} else {
																	//Обновляем данные в redis
																	var document = _.clone( docFromRedis );
																	document._id = docFromMongoUpdated[0]['a1'];
																	document.tsUpdate = docFromMongoUpdated[0]['a2'];
																	document.name = docFromMongoUpdated[0]['a5'];
																	document.lastname = docFromMongoUpdated[0]['a6'];
																	if(_.isArray(docFromMongoUpdated[0]['a4'])){
																		document.company_id = docFromMongoUpdated[0]['a4'][0];
																	} else {
																		document.company_id = docFromMongoUpdated[0]['a4'];
																	}
																	document.fullname = docFromRedis.lastname + ' ' +  docFromRedis.name;

																	ModuleUser.modifyWithId( client, sender, docFromRedis._id, document._id, document, function(err, reply){
																		if ( err ){
																			cbMap( err );
																		} else {
																			cbMap(null, true);
																		}
																	} );
																}
															});

														} else {

															if ( docFromRedis._id === docFromMongo.result[0][0]['a1'] &&
																docFromRedis.tsUpdate === docFromMongo.result[0][0]['a2'] &&
																docFromRedis.name === docFromMongo.result[0][0]['a5'] &&
																docFromRedis.lastname === docFromMongo.result[0][0]['a6'] &&
																docFromRedis.company_id === docFromMongo.result[0][0]['a4'][0]){
																cbMap(null, false);
															} else {
																//Обновляем данные в redis
																var document = _.clone( docFromRedis );
																document._id = docFromMongo.result[0][0]['a1'];
																document.tsUpdate = docFromMongo.result[0][0]['a2'];
																document.name = docFromMongo.result[0][0]['a5'];
																document.lastname = docFromMongo.result[0][0]['a6'];
																document.company_id = docFromMongo.result[0][0]['a4'][0];
																document.fullname = docFromRedis.lastname + ' ' +  docFromRedis.name;

																ModuleUser.modifyWithId( client, sender, docFromRedis._id, document._id, document, function(err, reply){
																	if ( err ){
																		cbMap( err );
																	} else {
																		cbMap(null, true);
																	}
																} );
															}
														}

													}

												});

											}
										});

									},
									cb
								)


							}},
							function(err, results) {
								if( err ){
									callback( err );
								} else {
									var listOfDeleted = _.without(results.cheakUsersInRedis, false);
									var listOfRecovery = _.without(results.cheakUsersInRedisAndMongo, false);
									callback(null, {delete:listOfDeleted, update:listOfRecovery});
								}

							}
						);

					}
				}
			);

		}
	})

};