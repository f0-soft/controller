var redis = require('redis');
var sys = require('sys');
var async = require('async');
var underscore = require('underscore');

var AccessModelRoleView = require('./access_model_role_view.js');
var AccessModelUserView = require('./access_model_user_view.js');
var AccessModelRoleFlexo = require('./access_model_role_flexo.js');
var AccessModelUserFlexo = require('./access_model_user_flexo.js');

var ModelUser = require('./model_user.js');
var ModelSection = require('./model_section.js');

var client;
var globalViewsConfig;
var globalFlexoSchemes;
var flexo;
var view;

module.exports = {
	init: init,
	create: Controller
};

/**
 * Инициализация контроллера
 *
 * @param [redisConfig] - настройки подключения к Redis
 * @param objFlexo - ссылка на инициализированную библиотеку flexo
 * @param objGlobalViewsConfig - ссылка на массив объектов с данными из конфигов views
 * @param objGlobalFlexoSchemes - ссылка на массив объектов с данными из схем flexo коллекций
 * @param callback
 */
function init( mock, redisConfig, flexoConfig, viewConfig, objGlobalViewsConfig, objGlobalFlexoSchemes, callback ) {
	if ( redisConfig ) {
		if ( redisConfig.max_attempts ) {
			client = redis.createClient( redisConfig.port, redisConfig.host,
				{ max_attempts: redisConfig.max_attempts } );

			client.on( "error", function (err) {
				sys.log( err + ' ' + __filename );
				callback( err );
			});
		} else {
			client = redis.createClient( redisConfig.port, redisConfig.host );
			client.on( "error", function ( err ) {
				sys.log( err + ' ' + __filename );
				callback( err );
			});
		}
	} else {
		client = redis.createClient();
		client.on( "error", function ( err ) {
			sys.log( err + ' ' + __filename );
			callback( err );
		});
	}

	if(mock.flexo){
		var Flexo = require('./flexo_mock.js');
	} else {
		var Flexo = require('f0.flexo');
	}

	if(mock.view){
		var View = require( './view_mock.js' );
	} else {
		var View = require( 'f0.view' );
	}

	//ToDo: проверка наличия входных параметров
	globalViewsConfig = objGlobalViewsConfig;
	globalFlexoSchemes = objGlobalFlexoSchemes;

	Flexo.init(flexoConfig, function(err){
		if(err){
			console.log('Error. Ошибка инициализации Flexo');
		} else {
			flexo = Flexo.Collection;
			view = View;
			View.init(viewConfig, callback);
		}
	});
}

/**
 * Конструктор контроллера
 *
 * @constructor
 */
function Controller( ) {
	return this;
}

Controller.prototype.create = function create( query, callback ) {
	if ( query.user ) {
		//Запрос на создание пользователя
		//ToDo:Сохранение данных во flexo Collection

		//Создаем модель пользователя
		var model = new ModelUser(client);
		//Проверяем уникальность создаваемого пользователя
		model.checkUnique(query.user.login, function ( err ){
			if ( err ) {
				callback ( err );
			} else {
				//Создаем flexo модель
				if ( globalFlexoSchemes['users'].read ) {
					var flexoModelUsers = new flexo({ scheme:'users' ,
						fields:globalFlexoSchemes['users'].read});

					var document = underscore.clone(query.user);
					//Удаляем пороль из сохраняемго в flexo документа
					if (document.pass){
						delete document.pass;
					}

					//Сохраняем документ в redis
					flexoModelUsers.insert(document, {}, function(err, result){
						if ( err ) {
							callback ( err );
						} else {
							query.user._id = result[0]._id;
							model.create( query.user, function( err, reply ){
								if(err){
									callback( err );
								} else {
									callback( err, result );
								}
							} );
						}
					});
				} else {
					callback( new Error( 'No description in global object flexo with name: user' ) );
				}
			}
		});
	} else if ( query.access ) {
		//Запроса на создание прав
		if ( query.access.viewName ) {
			//Запрос на создание прав view
			if ( query.access.role ) {
				//Запрос на создание прав view по роли

				//Создаем модель прав по роли для view
				var model = new AccessModelRoleView( client, query.access.viewName,
					query.access.role );

				//Передаем в модель объект прав и в случае успешной передачи сохраняем в redis
				if ( model.setObjAccess( query.access.objAccess ) ){
					model.save( callback );
				}
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю

				//Создаем модель прав по пользователю для view
				var model = new AccessModelUserView( client, query.access.viewName,
					query.access.login );

				//Передаем в модель объект прав и в случае успешной передачи сохраняем в redis
				if ( model.setObjAccess( query.access.objAccess ) ){
					model.save( callback );
				}
			} else {
				callback( new Error( 'Not set  role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на создание прав flexo по роли

				//Создаем модель прав по роли для flexo схемы
				var model = new AccessModelRoleFlexo( client, query.access.flexoSchemeName,
					query.access.role );

				//Передаем в модель объект прав и в случае успешной передачи сохраняем в redis
				if ( model.setObjAccess( query.access.objAccess ) ){
					model.save( callback );
				}
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю

				//Создаем модель прав по пользователю для flexo
				var model = new AccessModelUserFlexo( client, query.access.flexoSchemeName,
					query.access.login );

				//Передаем в модель объект прав и в случае успешной передачи сохраняем в redis
				if ( model.setObjAccess( query.access.objAccess ) ){
					model.save( callback );
				}
			} else {
				callback( new Error( 'Not set  role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else if ( query.access.sectionName ){
			if ( query.access.role ) {
				//Запрос на создание прав раздела по роли
				//Создаем модель раздела
				var model = new ModelSection(client, null, query.access.role);
				//Сохраняем права для раздела по роли
				model.create('roleSection', query.access.sectionName, query.access.objAccess, callback );

			} else if ( query.access.login ) {
				//Запрос на создание прав раздела по пользователю
				//Создаем модель раздела
				var model = new ModelSection(client, query.access.login);
				//Сохраняем права для раздела по пользователю
				model.create('userSection', query.access.sectionName, query.access.objAccess, callback );
			} else {
				//Запрос на создание общей информации о разделе

				//Создаем модель раздела
				var model = new ModelSection(client);
				//Сохраняем общую информацию о раздела
				model.create('section', query.access.sectionName, query.access.objAccess, callback );
			}
		} else {
			callback( new Error( 'Incorrect parameter access in query: '
				+ JSON.stringify( query ) ) );
		}
	} else {
		callback( new Error( 'Invalid query: ' + JSON.stringify( query ) ) );
	}
};

Controller.prototype.find = function find( query, callback ) {
	if ( query.user ) {
		if( query.user.login || query.user._id ){
		    //Простой поиск одного пользователя
			var login = query.user.login || null;
			var _id = query.user._id || null;
			//Создаем модель пользователя
			var model = new ModelUser(client, login, _id);
			model.find(callback);
		} else if (query.user.query){
			//Сложный поиск
			//Создаем flexo модель
			if ( globalFlexoSchemes['users'].read ) {
				var flexoModelUsers = new flexo({ scheme:'users' ,
					fields:globalFlexoSchemes['users'].read});

				//Флаг сигнализирующей необходим ли пароль в выходных данных
				var triggerNeedPass = false;
				if( !query.user.options ){
					query.user.options = {}
				} else if ( query.user.options.fields &&
					(underscore.indexOf(query.user.options.fields, 'pass')+1) ) {
					triggerNeedPass = true;
				}

				flexoModelUsers.find(query.user.query, query.user.options,
					function(err, listDocuments){
					if ( err ) {
						callback ( err );
					} else {
						if( triggerNeedPass && listDocuments.length !== 0){
							//Создаем модель пользователя
							var model = new ModelUser(client);
							model.findsPass(listDocuments, callback);
						} else {
							callback(null, listDocuments);
						}
					}
				});
			} else {
				callback( new Error( 'No description in global object flexo with name: user' ) );
			}
		} else {
			callback( new Error( 'Unknown type of query: ' + JSON.stringify( query ) ) );
		}
	} else if ( query.access ) {
		//Запроса на создание прав
		if ( query.access.viewName ) {
			//Запрос на создание прав view
			if ( query.access.role ) {
				//Запрос на чтение прав view по роли

				//Создаем модель прав по роли для view
				var model = new AccessModelRoleView( client, query.access.viewName,
					query.access.role );

				//Запрашиваемый искомый объект прав
				if ( globalViewsConfig[query.access.viewName] ) {
                    model.find( globalViewsConfig[query.access.viewName], callback );
				} else {
					callback( new Error( 'No description in global object view with name: '
						+ JSON.stringify( query.access.viewName ) ) );
				}
			} else if ( query.access.login ) {
				//Запрос на чтение прав view по пользователю

				//Создаем модель прав по пользователю для view
				var model = new AccessModelUserView( client, query.access.viewName,
					query.access.login );

				//Запрашиваемый искомый объект прав
				if ( globalViewsConfig[query.access.viewName] ) {
					model.find( globalViewsConfig[query.access.viewName], callback );
				} else {
					callback( new Error( 'No description in global object view with name: '
						+ JSON.stringify( query.access.viewName ) ) );
				}
			} else {
				callback( new Error( 'Not set  role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на чтение прав flexo по роли

				//Создаем модель прав по роли для flexo схемы
				var model = new AccessModelRoleFlexo( client, query.access.flexoSchemeName,
					query.access.role );

				//Запрашиваемый искомый объект прав
                model.find( query.access.flexoSchemeName, callback );

			} else if ( query.access.login ) {
				//Запрос на чтение прав view по пользователю

				//Создаем модель прав по пользователю для view
				var model = new AccessModelUserFlexo( client, query.access.flexoSchemeName,
					query.access.login );

				//Запрашиваемый искомый объект прав
				model.find( query.access.flexoSchemeName, callback );

			} else {
				callback( new Error( 'Not set  role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else if ( query.access.sectionName ){
			if ( query.access.role ) {
				//Запрос на чтение прав раздела по роли
				//Создаем модель раздела
				var model = new ModelSection(client, null, query.access.role);
				//Ищем права для раздела по роли
				model.find('roleSection', query.access.sectionName, callback );

			} else if ( query.access.login ) {
				//Запрос на чтение прав раздела по пользователю
				//Создаем модель раздела
				var model = new ModelSection(client, query.access.login);
				//Ищем права для раздела по пользователю
				model.find('userSection', query.access.sectionName, callback );
			} else {
				//Запрос на чтение общей информации о разделе

				//Создаем модель раздела
				var model = new ModelSection(client);
				//Ищем общую информацию о раздела
				model.find('section', query.access.sectionName, callback );
			}
		} else {
			callback( new Error( 'Incorrect parameter access in query: '
				+ JSON.stringify( query ) ) );
		}
	} else {
		callback( new Error( 'Invalid query: ' + JSON.stringify( query ) ) );
	}
};

Controller.prototype.delete = function del( query, callback ) {
	if ( query.user ) {
		if( query.user.query && query.user.query.selector && query.user.query.selector._id ){
			//Создаем flexo модель
			if ( globalFlexoSchemes['users'].read ) {
				var flexoModelUsers = new flexo({ scheme:'users' ,
					fields:globalFlexoSchemes['users'].read});

				flexoModelUsers.find(query.user.query, {}, function(err, reply){
					if ( err ) {
						callback ( err );
					} else {
						//Удаляем документ из mongo
						flexoModelUsers.delete(query.user.query, {}, function(err, result){
							if ( err ) {
								callback ( err );
							} else {
								var model = new ModelUser(client, null, result[0]._id);
								model.delete(function(err, reply) {
									if (err) {
										callback(err)
									} else {
										callback(null, result);
									}
								});
							}
						});
					}
				});
			}
		} else {
			callback( new Error( 'Incorrect parameter query.selector in query: '
				+ JSON.stringify( query ) ) );
		}
	} else if ( query.access ) {
		//Запроса на создание прав
		if ( query.access.viewName ) {
			//Запрос на удаление прав view
			if ( query.access.role ) {
				//Запрос на удаление прав view по роли

				//Создаем модель прав по роли для view
				var model = new AccessModelRoleView( client, query.access.viewName,
					query.access.role );

				//Удаляем запрашиваемый объект прав
				if ( globalViewsConfig[query.access.viewName] ) {
					model.delete( globalViewsConfig[query.access.viewName], callback );
				} else {
					callback( new Error( 'No description in global object view with name: '
						+ JSON.stringify( query.access.viewName ) ) );
				}
			} else if ( query.access.login ) {
				//Запрос на удаление прав view по пользователю

				//Создаем модель прав по роли для view
				var model = new AccessModelUserView( client, query.access.viewName,
					query.access.login );

				//Удаляем запрашиваемый объект прав
				if ( globalViewsConfig[query.access.viewName] ) {
					model.delete( globalViewsConfig[query.access.viewName], callback );
				} else {
					callback( new Error( 'No description in global object view with name: '
						+ JSON.stringify( query.access.viewName ) ) );
				}
			} else {
				callback( new Error( 'Not set  role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на удаление прав flexo по роли

				//Создаем модель прав по роли для view
				var model = new AccessModelRoleFlexo( client, query.access.flexoSchemeName,
					query.access.role );

				//Удаляем запрашиваемый объект прав
                model.delete( query.access.flexoSchemeName, callback );

			} else if ( query.access.login ) {
				//Запрос на удаление прав flexo по пользователю

				//Создаем модель прав по роли для view
				var model = new AccessModelUserFlexo( client, query.access.flexoSchemeName,
					query.access.login );

				//Удаляем запрашиваемый объект прав
				model.delete( query.access.flexoSchemeName, callback );

			} else {
				callback( new Error( 'Not set  role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else if ( query.access.sectionName ){
			if ( query.access.role ) {
				//Запрос на удаление прав раздела по роли
				//Создаем модель раздела
				var model = new ModelSection(client, null, query.access.role);
				//Удаляем права для раздела по роли
				model.delete('roleSection', query.access.sectionName, callback );
			} else if ( query.access.login ) {
				//Запрос на удаление прав раздела по пользователю
				//Создаем модель раздела
				var model = new ModelSection(client, query.access.login);
				//Ищем права для раздела по пользователю
				model.delete('userSection', query.access.sectionName, callback );
			} else {
				//Запрос на удаление общей информации о разделе

				//Создаем модель раздела
				var model = new ModelSection(client);
				//Ищем общую информацию о раздела
				model.delete('section', query.access.sectionName, callback );
			}
		} else {
			callback( new Error( 'Incorrect parameter access in query: '
				+ JSON.stringify( query ) ) );
		}
	} else {
		callback( new Error( 'Invalid query: ' + JSON.stringify( query ) ) );
	}
}

Controller.prototype.modify = function modify( query, callback ) {
	if ( query.user ) {
		if(query.user.query && query.user.query.selector && query.user.query.selector._id) {
			//Создаем flexo модель
			if ( globalFlexoSchemes['users'].read ) {
				var flexoModelUsers = new flexo({ scheme:'users' ,
					fields:globalFlexoSchemes['users'].read});
				var pass = null;
				if (query.user.query.selector.properties &&
					query.user.query.selector.properties.pass){
					pass = query.user.query.selector.properties.pass;
					delete query.user.query.selector.properties.pass;
				}

				flexoModelUsers.find(query.user.query, {}, function(err, reply){
					if ( err ) {
						callback ( err );
					} else {
						//Модифицируем документ из mongo
						flexoModelUsers.modify(query.user.query, {}, function(err, objResult){
							if ( err ) {
								callback ( err );
							} else {
								if(pass){
									query.user.query.properties.pass = pass;
								}
									var model = new ModelUser(client, null, reply[0]._id);
									model.modify(query.user.query.properties, function( err, reply ) {
										if( err ){
											callback( err );
										} else {
											if( pass ) {
												objResult[pass] = reply[pass];
											}

											callback( null, objResult );
										}

									});

							}
						});
					}
				});

			}
		} else {
			callback( new Error( 'Incorrect parameter query.selector in query: '
				+ JSON.stringify( query ) ) );
		}
	} else if ( query.access ) {
		//Запроса на создание прав
		if ( query.access.viewName ) {
			//Запрос на создание прав view
			if ( query.access.role ) {
				//Запрос на создание прав view по роли

				//Создаем модель прав по роли для view
				var model = new AccessModelRoleView( client, query.access.viewName,
					query.access.role );

				//Передаем в модель объект прав и в случае успешной передачи сохраняем в redis
				if ( model.setObjAccess( query.access.objAccess ) ){
					model.save( callback );
				}
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю

				//Создаем модель прав по пользователю для view
				var model = new AccessModelUserView( client, query.access.viewName,
					query.access.login );

				//Передаем в модель объект прав и в случае успешной передачи сохраняем в redis
				if ( model.setObjAccess( query.access.objAccess ) ){
					model.save( callback );
				}
			} else {
				callback( new Error( 'Not set  role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на создание прав flexo по роли

				//Создаем модель прав по роли для flexo схемы
				var model = new AccessModelRoleFlexo( client, query.access.flexoSchemeName,
					query.access.role );

				//Передаем в модель объект прав и в случае успешной передачи сохраняем в redis
				if ( model.setObjAccess( query.access.objAccess ) ){
					model.save( callback );
				}
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю

				//Создаем модель прав по пользователю для flexo
				var model = new AccessModelUserFlexo( client, query.access.flexoSchemeName,
					query.access.login );

				//Передаем в модель объект прав и в случае успешной передачи сохраняем в redis
				if ( model.setObjAccess( query.access.objAccess ) ){
					model.save( callback );
				}
			} else if ( query.access.sectionName ){
				//Происходит перезаписывание прав
				if ( query.access.role ) {
					//Запрос на создание прав раздела по роли
					//Создаем модель раздела
					var model = new ModelSection(client, null, query.access.role);
					//Сохраняем права для раздела по роли
					model.create('roleSection', query.access.sectionName, query.access.objAccess, callback );

				} else if ( query.access.login ) {
					//Запрос на создание прав раздела по пользователю
					//Создаем модель раздела
					var model = new ModelSection(client, query.access.login);
					//Сохраняем права для раздела по пользователю
					model.create('userSection', query.access.sectionName, query.access.objAccess, callback );
				} else {
					//Запрос на создание общей информации о разделе

					//Создаем модель раздела
					var model = new ModelSection(client);
					//Сохраняем общую информацию о раздела
					model.create('section', query.access.sectionName, query.access.objAccess, callback );
				}
			} else {
				callback( new Error( 'Not set  role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else {
			callback( new Error( 'Incorrect parameter access in query: '
				+ JSON.stringify( query ) ) );
		}
	} else {
		callback( new Error( 'Invalid query: ' + JSON.stringify( query ) ) );
	}
}

Controller.prototype.getTemplate = getTemplate;

function getTemplate(type, name, user, role, socket, callback ) {
	if(type === 'view') {
		//Проверяем есть ли уже готовые права для view
		if( socket.view && socket.view[name] && socket.view[name].access) {
			//Подготовленные права есть
			//Запрашиваем шаблон view c необходимыми параметрами
			view.GetTemplate(name, socket.view[name].access, {}, callback);
		} else {
			//Нет прав подготавливаем права и flexo модели
			formingFlexoAndView( user, role, name, socket, function ( err, reply ) {
				if ( err ){
					callback( err );
				} else {
					//Запрашиваем шаблон view c найденными параметрами
					view.GetTemplate(name, socket.view[name].access, {}, callback);
				}

			} );

		}
	} else if (type === 'section') {
		getTemplateSections( name, user, role, socket, callback );
	}
}

function getTemplateSections( sectionName, user, role, socket, callback ) {
	//Создаем модель раздела
	var model = new ModelSection(client);

	model.getTemplate(sectionName, user, role, function( err, objSection ){
		if ( err ) {
			callback ( err );
		} else {
			//Запрашиваем необходимые view
			if ( objSection.listView.length ) {
				//Запрашиваем шаблоны необходимых view
				async.map(objSection.listView,
					function (item, cb){
						getTemplate('view', item, user, role, socket, function( err, html, config) {
							if ( err ){
								cb( err );
							} else {
								cb(null, {html:html, config:config});
							}

						} );
					},
					function (err, replies){
						if ( err ) {
							callback( err );
						} else {
							//Вносим изменения в шалон по пришедшим данным по view
							var resultHtml = objSection.mainContent;
							var objConfigForView = {};
							var obj = {};
							for(var i=0; i<objSection.listView.length; i++){
								//Вставляем в указанное место
								//ToDo: временно
								var html = replies[i].html;

								obj[objSection.listView[i]] = objSection.listView[i];
								obj[objSection.listView[i] + '_html'] = html;
								objConfigForView[objSection.listView[i]] = replies[i].config;
							}
							resultHtml = underscore.template(resultHtml)(obj);
							callback( null, resultHtml,	objConfigForView );

						}
					}
				)
			} else {
				callback( null, objSection.mainContent, null );
			}
		}
	});
}


Controller.prototype.queryToView = function queryToView( type, request, viewName, socket, callback ) {
	if( socket.view && socket.view[viewName]) {
		//Подготовленные права есть
		if( type === 'read' ) {
			if( socket.view[viewName].access.read ) {
				if(checkRead( request.queries, socket.view[viewName].access.read ) ){
					//Вызываем view c необходимыми параметрами
					view.ProcessRequest( viewName, 'find', request, socket.view[viewName].flexo,
						socket.view[viewName].access['read'], {}, callback );

				} else {
					callback(new Error('Requested more fields than allowed to read'));
				}
			} else {
				callback(new Error('No permission to read in view'));
			}
		} else if ( type === 'create' ) {
			if( socket.view[viewName].access.create ) {
				if(checkCreate( request.queries, socket.view[viewName].access.create ) ){
					//Вызываем view c необходимыми параметрами
					//Вызываем view c необходимыми параметрами
					view.ProcessRequest( viewName, 'insert', request, socket.view[viewName].flexo,
						socket.view[viewName].access['create'], {}, callback );
				} else {
					callback(new Error('No permission to create in view'));
				}
			} else {
				callback(new Error('No permission to create in view'));
			}
		} else if ( type === 'modify' ) {
			if( socket.view[viewName].access.modify ) {
				if(checkModify( request.queries, socket.view[viewName].access.modify ) ){
					//Вызываем view c необходимыми параметрами
					view.ProcessRequest( viewName, 'modify', request, socket.view[viewName].flexo,
						socket.view[viewName].access['modify'], {}, callback );
				} else {
					callback(new Error('No permission to modify in view'));
				}
			} else {
				callback(new Error('No permission to modify in view'));
			}
		} else if ( type === 'delete' ) {
			if( socket.view[viewName].access.delete ) {
				if(checkDelete( request.queries, socket.view[viewName].access.delete ) ){
					view.ProcessRequest( viewName, 'delete', request, socket.view[viewName].flexo,
						socket.view[viewName].access['delete'], {}, callback );
				} else {
					callback(new Error('No permission to delete in view'));
				}
			} else {
				callback(new Error('No permission to delete in view'));
			}
		}

	} else {
		formingFlexoAndView( socket.login, socket.role, viewName, socket, function ( err, reply ) {
			if ( err ){
				callback( err );
			} else {
				queryToView( type, request, viewName, socket, callback )
			}
		});
	}
}

function checkRead( queries, objAccess ) {
	//Формируем список запрашиваемых flexo
	var flexoSchemes = Object.keys(queries);

	//Проверяем каждый запрос на разрешенные поля
	for ( var i = 0; i < flexoSchemes.length; i++ ){

		if(objAccess[flexoSchemes[i]] && objAccess[flexoSchemes[i]].length === 0) {
			return false;
		}
		//Формируем списки запрашиваемых полей на проверку для данной схемы
		var fieldsFromSelector = [];
		var fieldsFromSort = [];

		if(queries[flexoSchemes[i]].selector)
			fieldsFromSelector = Object.keys(queries[flexoSchemes[i]].selector);
		if(queries[flexoSchemes[i]].options && queries[flexoSchemes[i]].options.sort)
			fieldsFromSort = Object.keys(queries[flexoSchemes[i]].options.sort);

		//Объединяем массива для проверок в один
		var fieldsForCheck = underscore.union(fieldsFromSelector, fieldsFromSort);
		//Пересекаем с разрешенным полями
		var unresolvedFields  = underscore.difference(fieldsForCheck, objAccess[flexoSchemes[i]]);
		unresolvedFields  = underscore.difference(unresolvedFields, ['_id', 'tsCreate', 'tsUpdate']);

		if (unresolvedFields.length !== 0){
			return false;
		}
	}

	return true;
}

function checkCreate( queries, objAccessCreate ) {
	//Формируем список передаваемых на создание flexo
	var flexoSchemes = Object.keys(queries);

	//Проверяем каждый запрос на разрешенные поля
	for ( var i = 0; i < flexoSchemes.length; i++ ){

		if(objAccessCreate[flexoSchemes[i]] && objAccessCreate[flexoSchemes[i]].length === 0) {
			return false;
		}

		//Проверяем разрешения на создания
		if( underscore.isArray( queries[flexoSchemes[i]] ) ) {
            for( var j = 0; j < queries[flexoSchemes[i]].length ; j++ ){
				//Формирую список полей на проверку
				var fields = Object.keys(queries[flexoSchemes[i]][j]);

				//Пересекаем с разрешенными полями на создание
				var unresolvedFields  = underscore.difference(fields, objAccessCreate[flexoSchemes[i]]);

				if (unresolvedFields.length !== 0){
					return false;
				}
			}
		} else {
			//Формирую список полей на проверку
			var fields = Object.keys(queries[flexoSchemes[i]]);

			//Пересекаем с разрешенными полями на создание
			var unresolvedFields  = underscore.difference(fields, objAccessCreate[flexoSchemes[i]]);

			if (unresolvedFields.length !== 0){
				return false;
			}
		}
	}

	return true;
}

function checkModify( queries, objAccessModify ) {
	//Формируем список изменяемых flexo
	var flexoSchemes = Object.keys(queries);

	//Проверяем каждый запрос на разрешенные поля
	for ( var i = 0; i < flexoSchemes.length; i++ ){

		if(objAccessModify[flexoSchemes[i]] && objAccessModify[flexoSchemes[i]].length === 0) {
			return false;
		}

		//Проверяем разрешения на создания
		if( underscore.isArray( queries[flexoSchemes[i]] ) ) {
			for( var j = 0; j < queries[flexoSchemes[i]].length ; j++ ){
				//Формирую список полей на проверку
				var fields = Object.keys(queries[flexoSchemes[i]][j].properties);

				//Пересекаем с разрешенными полями на изменение
				var unresolvedFields  = underscore.difference(fields, objAccessModify[flexoSchemes[i]]);

				if (unresolvedFields.length !== 0){
					return false;
				}
			}
		} else {
			//Формирую список полей на проверку
			var fields = Object.keys(queries[flexoSchemes[i]].properties);

			//Пересекаем с разрешенными полями на изменение
			var unresolvedFields  = underscore.difference(fields, objAccessModify[flexoSchemes[i]]);

			if (unresolvedFields.length !== 0){
				return false;
			}
		}
	}

	return true;
}

function checkDelete( queries, objAccessDelete ) {
	//Формируем список изменяемых flexo
	var flexoSchemes = Object.keys(queries);

	//Проверяем каждый запрос на разрешение удаления
	for ( var i = 0; i < flexoSchemes.length; i++ ) {
		if ( objAccessDelete[flexoSchemes[i]] !== 1 ) {
			return false;
		}
	}

	return true;
}

function formingFlexoAndView( user, role, viewName, socket, callback ){
	async.parallel([
		function(cb){
			//ToDo: проверить сработает ли без обертки в функцию
			//Подготавливаем объект с правами для view
			crossingAccessForView(user, role, viewName, cb);
		},
		function(cb){
			//ToDo: проверить сработает ли без обертки в функцию
			//Подготавливаем объект с правами для view
			//ToDo: организовать проверку уже существующих flexo привязанных к socket
			crossingAccessForFlexo(user, role, viewName, cb);
		}
	],
		function(err, replies) {
			if( err ) {
				callback ( err )
			} else {
				//Создаем объект view который мы привяжем к socket
				if ( !socket.view ) {
					socket.view = {}
				}

				socket.view[viewName] = {};
				socket.view[viewName]['access'] = replies[0];

				//Создаем flexo коллекции
				var accessRead = replies[1];
				var schemes = globalViewsConfig[viewName];
				for ( var i = 0; i < schemes.length; i++ ){
					//Проверяем наличие flexo коллекции у socket
					if( !socket.flexo ) {
						socket.flexo = {};
					}

					if ( !socket.flexo[schemes[i]] ) {
						if (accessRead[schemes[i]]) {
							socket.flexo[schemes[i]] = new flexo({ scheme: schemes[i],
								fields:accessRead[schemes[i]]});
						} else {
							continue;
						}
					}

					if(!socket.view[viewName]['flexo']) socket.view[viewName]['flexo'] = {};
					socket.view[viewName]['flexo'][schemes[i]] = socket.flexo[schemes[i]];


				}

				callback(null, true);
			}
		}
	);
}

function crossingAccessForFlexo(user, role, viewName, callback) {
	//Создаем модель прав по роли и по пользователю для работы с объектами прав flexo схем
	var modelFlexoRole = new AccessModelRoleFlexo( client, null, role );
	var modelFlexoUser = new AccessModelUserFlexo( client, null, user );

	//ToDo: переделать в будущем на чтение данных из mongo

	//Запрашиваемый данные о правах для определения пересечения
	if ( globalViewsConfig[viewName] ) {
		async.parallel([
			function(cb){
				modelFlexoRole.findReadAccesses( globalFlexoSchemes, globalViewsConfig[viewName], cb);
			},
			function(cb){
				modelFlexoUser.findReadAccesses( globalFlexoSchemes, globalViewsConfig[viewName], cb);
			}
		],
			function(err, replies) {
				if( err ) {
					callback ( err )
				} else {
					//Определение пересечения прав
					var objAccessRole = replies[0];
					var objAccessUser = replies[1];

					var schemes = globalViewsConfig[viewName];
					//Объект хранящий готовое пересечение прав на чтение
					var objAccess = {};

					for( var i = 0; i < schemes.length; i++ ) {

						//Чтение

						var readFields = [];
						var addReadFields = [];
						var removeReadFields = [];

						if( objAccessRole[schemes[i]] ) {
							readFields = objAccessRole[schemes[i]];
						}

						if( objAccessUser[schemes[i]] ) {
							addReadFields = objAccessUser[schemes[i]][0];
							removeReadFields = objAccessUser[schemes[i]][1];
						}

						var permisionReadFields =
							underscore.union( readFields, addReadFields );
						permisionReadFields =
							underscore.difference( permisionReadFields, removeReadFields );

						if( permisionReadFields.length !== 0 ) {
							objAccess[schemes[i]] = permisionReadFields;
						}
					}

					callback( null, objAccess );

				}
			}
		);
	} else {
		callback( new Error( 'No description in global object view with name: '
			+ JSON.stringify( viewName ) ) );
	}

}

function crossingAccessForView(user, role, viewName, callback ) {
	//Создаем модель прав по роли и по пользователю
	var modelViewRole = new AccessModelRoleView( client, viewName, role );
	var modelViewUser = new AccessModelUserView( client, viewName, user );

	//ToDo: переделать в будущем на чтение данных из mongo

	//Запрашиваемый данные о правах для определения пересечения
	if ( globalViewsConfig[viewName] ) {
		async.parallel([
			function(cb){
				modelViewRole.find( globalViewsConfig[viewName], function(err, reply){
					if (err) {
						cb( err );
					} else {
						cb (null, modelViewRole.accessDataPreparation(globalFlexoSchemes));
					}
				} );
			},
			function(cb){
				modelViewUser.find( globalViewsConfig[viewName], function(err, reply){
					if (err) {
						cb( err );
					} else {
						cb( null, modelViewUser.accessDataPreparation(globalFlexoSchemes));
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
					var schemes = globalViewsConfig[viewName];
					//Объект хранящий готовое пересечение прав
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

						//Удаление
						var del = 0;

						if( objAccessRole[schemes[i]] && objAccessRole[schemes[i]]['delete'] ) {
							del = objAccessRole[schemes[i]['delete']];
						}

						if(objAccessUser[schemes[i]]){
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
	} else {
		callback( new Error( 'No description in global object view with name: '
			+ JSON.stringify( viewName ) ) );
	}
}


function crossingAccess (method, scheme, objAccessRole, objAccessUser, objAccess) {
	var fields = [];
	var readFields = []
	var addReadFields = [];
	var removeReadFields = [];

	if( objAccessRole[scheme] && objAccessRole[scheme][method] ) {
		readFields = objAccessRole[scheme][method];
	}

	if( objAccessUser[scheme] && objAccessUser[scheme][method] ) {
		addReadFields = objAccessUser[scheme][method][0];
		removeReadFields = objAccessUser[scheme][method][1];
	}

	var permisionReadFields =
		underscore.union( readFields, addReadFields );
	permisionReadFields =
		underscore.difference( permisionReadFields, removeReadFields );

	if( permisionReadFields.length !== 0 ) {
		if ( !objAccess[method] ) {
			objAccess[method] = {}
		}
		objAccess[method][scheme] = permisionReadFields;
	}

	return objAccess;
}