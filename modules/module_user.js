var ModuleUser = {};
var ModuleErrorLogging = require('./module_error_logging.js');
var _ = require('underscore');
var async = require('async');

ModuleUser.createUser = function createUser( client, sender, query, View, callback ){

	//Проверяем уникальность создаваемого пользователя
	ModuleUser.checkUnique( client, sender, query.user.login, function ( err ) {
		if ( err ) {
			callback ( err );
		} else {
			//ToDo:Согласовать название view
			var request = {selector: { 'sys_users': {'a3': query.user.login} } };
			var options = {company_id:sender.company_id, user_id: sender.userId, role:sender.role};
			View.find( 'sys_users', ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'], request,
				options, function ( err, documents ) {
					if ( err ) {
						//Логирование ошибки
						var objDescriptioneError = ModuleErrorLogging.error3( sender, sender, err );
						ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
					} else if ( documents.result[0].length === 0 ) {
						//Такого пользователя нет
						createUserInMongoAndRedis(client, query, sender, View, callback );
					} else {
						//есть такой пользователь в mongo
						//callback('Controller: login already exists in database');
						if (query.user._rewrite){
							//Перезаписываем пользователя
							rewriteUser( client, documents, sender, query, View, callback );
						} else {
							callback( null, null, 'Пользователь с логином ' + query.user.login +
								' уже существует, перезаписать??');
						}
					}
				} );
		}
	});
};

//Перезаписываем пользователя
function rewriteUser( client, documents, sender, query, View, callback ){
	var request = [ {
		selector: {  'a1': documents.result[0][0]['a1'], 'a2':documents.result[0][0]['a2'] },
		properties: { 'a4': query.user.company_id,
			'a5': query.user.name, 'a6':query.user.lastname, 'a7':query.user.role,
			'a8':query.user.lastname + ' ' + query.user.name }
	} ];

	if(query.user.email){
		request[0].properties['a9'] = query.user.email;
	}

	if(query.user.phone){
		request[0].properties['a10'] = query.user.phone;
	}
	var options = {company_id:sender.company_id, user_id: sender.userId, role:sender.role};
	View.modify( 'sys_users', request, options, function( err, documentsNew ) {
		if ( err ) {
			//Логирование ошибки
			var objDescriptioneError = ModuleErrorLogging.error5( sender, request, err );
			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		} else if( documentsNew[0]['a1'] ) {
			var document = _.clone( query.user );
			document._id = documentsNew[0]['a1'];
			document.tsUpdate = documentsNew[0]['a2'];
			document.fullname = query.user.lastname + ' ' +  query.user.name;
			delete document._rewrite;

			ModuleUser.create( client, sender, document, function(err, reply){
				if ( err ){
					callback( err );
				} else {
					callback(null, reply);
				}
			} );
		} else {
			//ToDo:не возвращен идентификатор
			callback( 'Controller: view not return _id' );
		}
	} );
}

//Сохраняем данные о пользователе в mongo и в redis
function createUserInMongoAndRedis( client, query, sender, View, callback ){
	//Сохраняем данные во view
	var request = [{'a3':query.user.login, 'a4':query.user.company_id,
		'a5':query.user.name, 'a6':query.user.lastname, 'a7':query.user.role,
		'a8':query.user.lastname + ' ' + query.user.name}];

	if(query.user.email){
		request[0]['a9'] = query.user.email;
	}

	if(query.user.phone){
		request[0]['a10'] = query.user.phone;
	}

	var options = {company_id:sender.company_id, user_id: sender.userId, role:sender.role};
	View.insert( 'sys_users', ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10'], request, options,
		function( err, document ) {
			if ( err ) {
				//Логирование ошибки
				var objDescriptioneError = ModuleErrorLogging.error4( sender, request, err );
				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback)
			} else if ( document[0]['a1'] ) {
				//Сохраняем документ в Redis
				var resultDocument = _.clone( query.user );
				resultDocument._id = document[0]['a1'];
				resultDocument.tsUpdate = document[0]['a2'];
				resultDocument.fullname = query.user.lastname + ' ' +  query.user.name;

				//Сохраняем документ в redis
				ModuleUser.create( client, sender, resultDocument, function( err ) {
					if(err){
						callback( err );
					} else {
						callback( err, true );
					}
				} );

			} else {
				//ToDo:Не получен идентификатор
				callback( 'Controller: view not return _id' );
			}
		});
}

/**
 * Создаем нового пользователя и сохраняем в redis
 *
 * @param odjUser - объект содержащий параметры создания пользователя в виде {fieldName:value}
 * @param callback
 * 		err - ошибки от node_redis и ...
 * 		reply - возвращается true в случае успешного создания
 */
ModuleUser.create = function create( client, sender, odjUser, callback ) {
	var objDescriptioneError;

	if(typeof odjUser['_id'] !== "string"){

		objDescriptioneError = ModuleErrorLogging.error6( sender, odjUser );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		return;
	}

	//Сохраняем данные о пользователе в redis
	var multi = client.multi();

	//Сохраняем кеш с данными о пользователе
	multi.SET( strUserCache( odjUser['_id'] ), JSON.stringify( odjUser ) );
	//Сохраняем свзку логин и _id пользователся
	multi.SET( strLoginToId( odjUser['login'] ), odjUser['_id'] );
	//Сохраняем связку _id и логин пользователя
	multi.SET( strIdToLogin( odjUser['_id'] ), odjUser['login'] );
	//ToDo:Черновой вариант
	//Сохраняем логин пользователя в справочник пользователей
	multi.SADD( setListOfLogin(), odjUser['login'] );
	//ToDo:Проверять сещестование такой роли в справочнике
	//Сохраняем связку роли и логина пользователя
	multi.SADD( setRoleToAllUser( odjUser['role'] ), odjUser['login'] );

	multi.EXEC(function( err ){
		if(err){
			callback( err );
		} else {
			callback( null, true );
		}
	});
};

ModuleUser.createRole = function createRole(client, role, callback) {
	var multi = client.multi();
	var key = strObjOfRole( role.roleName );
	var value = JSON.stringify(role);
	multi.SET( key, value );
	multi.SADD( setListOfRole() , role.roleName );

	multi.EXEC( function( err, reply ) {
		if( err ) {
			callback( err );
		} else {
			callback( null, true );
		}
	} );
};

ModuleUser.modifyUser = function modifyUser( query, sender, View, callback ){
	var _id = query.user._id || null;

	//Сохраняем данные во view
	//ToDo:согласовать названия для view и flexo
	var request = [ {
		selector: {  'a1': _id, 'a2': query.user.tsUpdate },
		properties: { 'a3': query.user.login, 'a4': query.user.company_id,
			'a5': query.user.name, 'a6':query.user.lastname, 'a7':query.user.role,
			'a8':query.user.lastname + ' ' + query.user.name}
	} ];

	if(query.user.email){
		request[0].properties['a9'] = query.user.email;
	}

	if(query.user.phone){
		request[0].properties['a10'] = query.user.phone;
	}

	var options = {company_id:sender.company_id, user_id: sender.userId, role:sender.role};
	View.modify( 'sys_users', request, options, function( err, documents ) {
		if ( err ) {
			//Логирование ошибки
			var objDescriptioneError = ModuleErrorLogging.error33( sender, request, err );
			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		} else if( documents[0]['a1'] ) {
			var document = _.clone( query.user );
			document.tsUpdate = documents[0]['a2'];
			document.fullname = query.user.lastname + ' ' + query.user.name;

			ModuleUser.modify( client, sender, _id, document, function(err, reply){
				if ( err ){
					callback( err );
				} else {
					callback(null, reply);
				}
			} );
		} else {
			//ToDo:не возвращен идентификатор
			callback( 'Controller: view not return _id' );
		}
	} );
};

ModuleUser.checkUnique = function checkUnique(client, sender, login, callback){
	var objDescriptioneError;

	if(typeof login !== "string"){

		objDescriptioneError = ModuleErrorLogging.error7( sender );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		return;
	}

	//Проверяем уникальность создаваемого пользователя
	client.GET( strLoginToId( login ), function( err, _id ){
		if( err ){
			callback( err );
		} else if (_id) {
			//ToDo:делаем проверку на артефакт
			client.SMEMBERS( setListOfLogin(), function ( err, listOfLogins){
				if ((_.indexOf(listOfLogins, login ) + 1)){
					objDescriptioneError = ModuleErrorLogging.error8( sender, login );
					ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
				} else {
					//Найден артефакт, зачищаем его
					//Формируем запросы для получения связанных c ним объектов flexo и view прав
					var multi = client.multi();

					multi.SMEMBERS( setUserToAllFlexoSchemeAccess( login ) );
					multi.SMEMBERS( setUserToAllViewAccess( login ) );
					multi.GET( strUserCache( _id ) );

					multi.EXEC(function(err, replies){
						if ( err ) {
							callback( err );
						} else {
							//Список названий view у которых есть права связанные с данным юзером
							var listOfFlesoScheme = replies[0] || [];
							//Список названий view у которых есть права связанные с данным юзером
							var listOfView = replies[1] || [];
							//Объект с данными о пользователе

							if ( replies[2] ) {
								var cache = JSON.parse(replies[2]);
								if ( cache['role'] ){
									//Удаляем привязку роли и пользователя
									multi.SREM( setRoleToAllUser( cache['role'] ), login );
								}
							}

							//Формируем команды на удаление пользователя
							var multi = client.multi();
							multi.DEL( strUserCache( _id ) );
							multi.DEL( strIdToLogin( _id ) );
							multi.DEL( strLoginToId( login ) );
							//Удаляем из списка логинов
							multi.SREM( setListOfLogin(), login );
							//Удаляем связанные с юзером объекты прав view
							for( var i = 0; i < listOfView.length; i++ ) {
								multi.DEL( strViewAccessUser( login, listOfView[i] ) );
							}
							multi.DEL( setUserToAllViewAccess( login ) );
							//Удаляем связанные с юзером объекты прав flexo
							for( var j = 0; j < listOfFlesoScheme.length; j++ ) {
								multi.DEL( strFlexoAccessUserScheme( login, listOfFlesoScheme[j] ) );
							}
							multi.DEL( setUserToAllFlexoSchemeAccess( login ) );

							multi.EXEC(function( err, replies ) {
								if ( err ) {
									callback( err );
								} else {
									callback( null, true );
								}
							} );
						}
					});
				}
			} );
		} else {
			callback(null, true);
		}
	});
};

/**
 * Простой поиск информации о пользователе
 *
 * @param callback (err, reply)
 * 		err - ошибки от node_redis и ...
 * 		reply - объект с информацией о пользователе	в виде {fieldName:value}
 */
ModuleUser.find = function find(client, sender, _id, login, callback){
	var objDescriptioneError;
	//Простой поиск пользователя
	if( _id ) {
		//Получаем кеш с данными пользователя
		client.GET( strUserCache( _id ), function( err, reply ) {
			if ( err ) {
				callback( err );
			} else if (reply) {
				callback( null, JSON.parse( reply ) );
			} else {
				objDescriptioneError = ModuleErrorLogging.error9( sender, _id );
				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} );
	} else if ( login ) {
		//Получаем идентификатор пользователя
		client.GET( strLoginToId( login ), function( err, _id ){
			if( err ){
				callback(err);
			} else if ( _id ){
				//Получаем кеш с данными пользователя
				client.GET( strUserCache( _id ), function( err, reply ) {
					if ( err ) {
						callback( err );
					} else if (reply) {
						callback( null, JSON.parse( reply ) );
					} else {
						objDescriptioneError = ModuleErrorLogging.error10( sender, _id, login );
						ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
					}
				} );

			} else {
				objDescriptioneError = ModuleErrorLogging.error11( sender, login );
				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		});
	} else {
		objDescriptioneError = ModuleErrorLogging.error12( sender );
		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

ModuleUser.findsPass = function findsPass(client, listDocuments, callback){
	//ToDo: хранить пары логин пароль, возможно???
	var multi = client.multi();

	for(var i=0; i<listDocuments.length; i++){
		multi.GET( strIdToLogin(listDocuments._id) );
	}

	multi.EXEC( function( err, replies ){
		if ( err ) {
			callback( err );
		} else {
			for( var i; i<replies.length; i++ ) {
				listDocuments[i].pass = JSON.parse(replies[i]).pass;
			}
			callback(null, listDocuments);
		}
	} );
};

ModuleUser.findListOfUsers = function findListOfUsers(client, callback){
	client.SMEMBERS( setListOfLogin(), function( err, replies ){
		if ( err ) {
			callback( err );
		} else {
			callback( null, replies );
		}
	});
};

ModuleUser.findObjUsers = function findObjUsers(client, callback){
	//ToDo:логирование ошибок связанных с запросом не существующих даных
	client.SMEMBERS( setListOfLogin(), function( err, listOfLogins ){
		if ( err ) {
			callback( err );
		} else {
			var multi = client.multi();

			for( var i = 0; i < listOfLogins.length; i++ ) {
				multi.GET(strLoginToId(listOfLogins[i]));
			}

			multi.EXEC(function( err, listOfUserId ){
				if ( err ) {
					callback( err );
				} else {
					var multi = client.multi();

					for( var i = 0; i < listOfUserId.length; i++ ) {
						multi.GET(strUserCache(listOfUserId[i]));
					}

					multi.EXEC(function( err, replies ){
						if ( err ) {
							callback( err );
						} else {

							var aResilt = [];
							for( var i = 0; i<replies.length; i++ ) {
								if ( replies[i] )
								aResilt.push(JSON.parse( replies[i] ));
							}

							callback( null, aResilt );
						}
					});
				}
			});
		}
	})
};

ModuleUser.findListOfRoles = function findListOfRoles(client, callback){
	client.SMEMBERS( setListOfRole(), function( err, replies ){
		if ( err ) {
			callback( err );
		} else {
			callback( null, replies );
		}
	})
};

ModuleUser.findObjRoles = function findObjRoles(client, callback){
	client.SMEMBERS( setListOfRole(), function( err, listOfRoles ){
		if ( err ) {
			callback( err );
		} else {
			if ( listOfRoles.length ) {
				var multi = client.multi();

				for( var i=0; i<listOfRoles.length; i++ ){
					var key = strObjOfRole( listOfRoles[i] );
					multi.GET( key );
				}

				multi.EXEC( function( err, replies ){
					if ( err ) {
						callback( err );
					} else {

						var result = [];

						for( var i=0; i<replies.length; i++ ) {
							if ( replies[i] )
							result.push(JSON.parse(replies[i]));
						}

						callback( null, result );
					}
				});
			} else {
				callback( null, [] );
			}
		}
	})
};

ModuleUser.findListOfViewsUser = function findListOfViewsUser(client, login, callback){
	client.SMEMBERS( setUserToAllViewAccess( login ), function( err, replies ){
		if ( err ) {
			callback( err );
		} else {
			callback( null, replies );
		}
	})
};

ModuleUser.findListOfFlexosUser = function findListOfFlexosUser(client, login, callback){
	client.SMEMBERS( setUserToAllFlexoSchemeAccess( login ), function( err, replies ){
		if ( err ) {
			callback( err );
		} else {
			callback( null, replies );
		}
	})
};

ModuleUser.findListOfViewsRole = function findListOfViewsRole(client, role, callback){
	client.SMEMBERS( setRoleToAllViewAccess( role ), function( err, replies ){
		if ( err ) {
			callback( err );
		} else {
			callback( null, replies );
		}
	})
};

ModuleUser.findListOfFlexosRole = function findListOfFlexosRole(client, role, callback){
	client.SMEMBERS( setRoleToAllFlexoSchemeAccess( role ), function( err, replies ){
		if ( err ) {
			callback( err );
		} else {
			callback( null, replies );
		}
	})
};

/**
 * Модификация данных о пользователе
 *
 * @param objNewData - бъект содержащий только измененные данные о пользователе в
 * виде {fieldName:value}
 * @param callback (err, reply)
 * 		err - ошибки от node_redis и ...
 * 		reply - возвращается true в случае успешного удаления
 */
ModuleUser.modify = function modify(client, sender, _id, objNewData, callback){
	var objDescriptioneError;

	if ( _id ) {
		//Получаем кеш из redis по _id
		client.GET( strUserCache( _id ), function( err, reply ){
			if( err ) {
				callback( err );
			} else if ( reply ) {
				var cache = JSON.parse(reply);
				//Получаю список изменяемых полей
				var listFields = Object.keys( objNewData );
				//Вносим изменения в кеш
				var multi = client.multi();
				for( var i = 0; i < listFields.length; i++ ) {
					//Проверяем изменение логина пользователя
					if(listFields[i] === 'login') {
						//ToDo:оптимизировать за счет проверки сравнением
						var lastLogin = cache['login'];
						var newLogin = objNewData['login'];

						multi.DEL(strLoginToId(lastLogin));
						multi.DEL(strIdToLogin(_id));
						multi.SET(strLoginToId(newLogin), _id);
						multi.SET(strIdToLogin(_id), newLogin);
						//ToDo:доделать изменение логина во всех справочниках
					}

					if(listFields[i] === 'role'){
						//ToDo:оптимизировать за счет проверки сравнением
						var lastRole = cache['role'];
						var newRole = objNewData['role'];

						multi.SREM( setRoleToAllUser( lastRole ), cache['login'] );
						multi.SADD( setRoleToAllUser( newRole ), objNewData['login'] );
					}

					//Отфильтровываем изменение поля _id
					if(listFields[i] !== '_id') {
						cache[listFields[i]] = objNewData[listFields[i]]
					}

				}

				//Сохраняем измененные кеш с данными о пользователе
				multi.SET( strUserCache( _id ), JSON.stringify( cache ));
				multi.EXEC( function( err ){
					if ( err ){
						callback( err );
					} else {
						callback( null, cache._id );
					}
				} );

			} else {

				objDescriptioneError = {
					type: 'non-existent_data',
					variant: 1,
					place: 'Controller.ModuleUser.modify',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						_idUser:_id,
						odjUser:objNewData
					},
					descriptione: {
						title:'Controller:Modification of data is not existing user',
						text:'Попытка модификировать не существующего в redis пользователя ' +
							'с указанным идентификатором'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} );
	} else {
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 1,
			place: 'Controller.ModuleUser.modify',
			time: new Date().getTime(),
			sender:sender,
			arguments:{
				odjUser:objNewData
			},
			descriptione: {
				title:'Controller: Not set _id in query.user',
				text:'При модификации данных о пользователе в объекте query.user не указан обезательный ' +
					'параметр _id пользователя'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

ModuleUser.modifyWithId = function modify(client, sender, lastId, _id, objNewData, callback){
	//ToDo:логирование ошибок

	//Получаем кеш из redis по _id
	client.GET( strUserCache( lastId ), function( err, reply ){
		if( err ) {
			callback( err );
		} else if ( reply ) {
			var cache = JSON.parse(reply);
			//Получаю список изменяемых полей
			var listFields = Object.keys( objNewData );
			//Вносим изменения в кеш
			var multi = client.multi();
			for( var i = 0; i < listFields.length; i++ ) {
				//Проверяем изменение логина пользователя
				if(listFields[i] === 'login') {
					//ToDo:оптимизировать за счет проверки сравнением
					var lastLogin = cache['login'];
					var newLogin = objNewData['login'];

					multi.DEL(strLoginToId(lastLogin));
					multi.DEL(strIdToLogin(lastId));
					multi.SET(strLoginToId(newLogin), _id);
					multi.SET(strIdToLogin(_id), newLogin);
					//ToDo:доделать изменение логина во всех справочниках
				}

				if(listFields[i] === 'role'){
					//ToDo:оптимизировать за счет проверки сравнением
					var lastRole = cache['role'];
					var newRole = objNewData['role'];

					multi.SREM( setRoleToAllUser( lastRole ), cache['login'] );
					multi.SADD( setRoleToAllUser( newRole ), objNewData['login'] );
				}

					cache[listFields[i]] = objNewData[listFields[i]];
			}

			//Зачищаем кешь со старым _id
			multi.DEL( strUserCache( lastId ) );

			//Сохраняем измененные кеш с данными о пользователе
			multi.SET( strUserCache( _id ), JSON.stringify( cache ));
			multi.EXEC( function( err ){
				if ( err ){
					callback( err );
				} else {
					callback( null, cache._id );
				}
			} );

		} else {

			objDescriptioneError = {
				type: 'non-existent_data',
				variant: 1,
				place: 'Controller.ModuleUser.modify',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					_idUser:_id,
					odjUser:objNewData
				},
				descriptione: {
					title:'Controller:Modification of data is not existing user',
					text:'Попытка модификировать не существующего в redis пользователя ' +
						'с указанным идентификатором'
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		}
	} );


};



/**
 * Удаление пользователя
 *
 * @param callback (err, reply)
 * 		err - ошибки от node_redis и ...
 * 		reply - возвращается true в случае успешного удаления
 */
ModuleUser.delete = function del(client, sender, _id, login, callback){
	if ( _id ) {
		//Получаем имя пользователя
		client.GET( strIdToLogin( _id ), function(err, login){
			if ( err ) {
				callback( err );
			} else if ( login ) {
				//Формируем запросы для получения связанных c ним объектов flexo и view прав
				var multi = client.multi();

				multi.SMEMBERS( setUserToAllFlexoSchemeAccess( login ) );
				multi.SMEMBERS( setUserToAllViewAccess( login ) );
				multi.GET( strUserCache( _id ) );

				multi.EXEC(function(err, replies){
					if ( err ) {
						callback( err );
					} else {
						//Список названий view у которых есть права связанные с данным юзером
						var listOfFlesoScheme = replies[0] || [];
						//Список названий view у которых есть права связанные с данным юзером
						var listOfView = replies[1] || [];
						//Объект с данными о пользователе
						var cache = JSON.parse(replies[2]);

						//Формируем команды на удаление пользователя
						var multi = client.multi();
						multi.DEL( strUserCache( _id ) );
						multi.DEL( strIdToLogin( _id ) );
						multi.DEL( strLoginToId( login ) );
						//Удаляем из списка логинов
						multi.SREM( setListOfLogin(), login );
						//Удаляем связанные с юзером объекты прав view
						for( var i = 0; i < listOfView.length; i++ ) {
							multi.DEL( strViewAccessUser( login, listOfView[i] ) );
						}
						multi.DEL( setUserToAllViewAccess( login ) );
						//Удаляем связанные с юзером объекты прав flexo
						for( var i = 0; i < listOfFlesoScheme.length; i++ ) {
							multi.DEL( strFlexoAccessUserScheme( login, listOfFlesoScheme[i] ) );
						}
						multi.DEL( setUserToAllFlexoSchemeAccess( login ) );

						//Удаляем привязку роли и пользователя
						multi.SREM( setRoleToAllUser( cache['role'] ), login );

						multi.EXEC(function( err, replies ) {
							if ( err ) {
								callback( err );
							} else {
								callback( null, true );
							}
						} );
					}
				});

			} else {
				objDescriptioneError = {
					type: 'non-existent_data',
					variant: 1,
					place: 'Controller.ModuleUser.delete',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						_idUser:_id
					},
					descriptione: {
						title:'Controller:Removal is not an existing user',
						text:'Попытка удалить не существующего в redis пользователя (удаление ' +
							'производится по идентификатору, и не был найден в redis ' +
							'логин соответствующий данному идентификатору) '
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} );
	} else if ( login ) {

		client.GET( strLoginToId( login ), function( err, _id) {
			if ( err ) {
				callback( err );
			} else if ( _id ) {
				var multi = client.multi();
				//Формируем запросы для получения связанных c ним объектов flexo и view прав
				multi.SMEMBERS( setUserToAllFlexoSchemeAccess( login ) );
				multi.SMEMBERS( setUserToAllViewAccess( login ) );
				multi.GET( strUserCache( _id ) );

				multi.EXEC( function(err, replies) {
					if ( err ) {
						callback( err );
					} else {
						//Список названий view у которых есть права связанные с данным юзером
						var listOfFlesoScheme = replies[0] || [];
						//Список названий view у которых есть права связанные с данным юзером
						var listOfView = replies[1] || [];
						//Объект с данными о пользователе
						var cache = JSON.parse(replies[2]);

						//Формируем команды на удаление пользователя
						var multi = client.multi();
						multi.DEL( strUserCache( _id ) );
						multi.DEL( strIdToLogin( _id ) );
						multi.DEL( strLoginToId( login ) );
						//Удаляем из списка логинов
						multi.SREM( setListOfLogin(), login );
						//Удаляем связанные с юзером объекты прав view
						for( var i = 0; i < listOfView.length; i++ ) {
							multi.DEL( strViewAccessUser( login, listOfView[i] ) );
						}
						multi.DEL( setUserToAllViewAccess( login ) );
						//Удаляем связанные с юзером объекты прав flexo
						for( var i = 0; i < listOfFlesoScheme.length; i++ ) {
							multi.DEL( strFlexoAccessUserScheme( login, listOfFlesoScheme[i] ) );
						}
						multi.DEL( setUserToAllFlexoSchemeAccess( login ) );

						//Удаляем привязку роли и пользователя
						multi.SREM( setRoleToAllUser( cache['role'] ), login );

						multi.EXEC(function( err, replies ) {
							if ( err ) {
								callback( err );
							} else {
								callback( null, true );
							}
						} );
					}
				} );
			} else {
				objDescriptioneError = {
					type: 'non-existent_data',
					variant: 2,
					place: 'Controller.ModuleUser.delete',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						login:login
					},
					descriptione: {
						title:'Controller:Removal is not an existing user',
						text:'Попытка удалить не существующего в redis пользователя (удаление ' +
							'производится по логину, и не был найден в redis ' +
							'идентификатор соответствующий данному логину пользователя) '
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} );
	} else {
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 1,
			place: 'Controller.ModuleUser.delete',
			time: new Date().getTime(),
			sender:sender,
			descriptione: {
				title:'Controller: Not set _id or login in query.user',
				text:'При удалении данных о пользователе в объекте query.user не указан ' +
					'обезательный параметр _id или login пользователя'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

ModuleUser.deleteRole = function deleteRole(client, sender, role, callback){
	//Получаем список логинов пользователя связанных с этой ролью
	client.SMEMBERS( setRoleToAllUser( role ), function( err, reply ) {
		if ( err ) {
			callback( err );
		} else if ( reply.length ) {

			objDescriptioneError = {
				type: 'operation_prohibited',
				variant: 1,
				place: 'Controller.ModuleUser.delete',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					role:role
				},
				descriptione: {
					title:'Controller: Removing the role of prohibited, as there are users ' +
						'that are associated with that role',
					text:'Операция удаления роли запрещена так как есть пользователи с ' +
						'которыми ассоциирована эта роль ',
					users:reply
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, function( err ){
				callback( err + ': ' + role, reply);
			});
		} else {
			//Удаление разрешено
			var multi = client.multi();
			//Получаем списки связанных с этой ролью view и flexo
			multi.SMEMBERS( setRoleToAllFlexoSchemeAccess( role ) );
			multi.SMEMBERS( setRoleToAllViewAccess( role ) );

			multi.EXEC(function( err, replies ){
				if ( err ) {
					callback( err );
				} else {
					var multi = client.multi();
					//Формируем команды на удаление
					var listOfFlesoScheme = replies[0];
					var listOfView = replies[1];
					//Удаляем роль из списка ролей и его описание
					multi.SREM( setListOfRole() , role);
					multi.DEL( strObjOfRole( role ) );

					//Удаляем связанные с ролью объекты прав view
					for( var i = 0; i < listOfView.length; i++ ) {
						multi.DEL( strViewAccessRole( role, listOfView[i] ) );
					}
					multi.DEL( setRoleToAllViewAccess( role ) );
					//Удаляем связанные с ролью объекты прав flexo
					for( var i = 0; i < listOfFlesoScheme.length; i++ ) {
						multi.DEL( strFlexoAccessRoleScheme( role, listOfFlesoScheme[i] ) );
					}
					multi.DEL( setRoleToAllFlexoSchemeAccess( role ) );

					multi.EXEC(function( err, replies ) {
						if ( err ) {
							callback( err );
						} else {
							callback( null, true );
						}
					} );
				}
			})
		}
	} );


};

//Формирование строки ключа Redis (STRING) для прав относящиеся к заданной flexo схемы и роли
function strFlexoAccessRoleScheme( role, flexoSchemeName ) {
	return 'flexo:role:access:' + role + ':' + flexoSchemeName;
}

//Формирование строки ключа Redis (STRING) для прав относящиеся к view для заданной роли
function strViewAccessRole( role, viewName ) {
	return 'view:role:access:' + role + ':' + viewName;
}

//Формирование ключа REDIS (SET) для сохранения связки роли пользователя и названия view по
// которым у него есть права
function setRoleToAllViewAccess( role ) {
	return 'role:all:viewName:' + role;
}

//Формирование ключа REDIS (SET) для сохранения связки роли юзера и названия flexo схем по
// которым у него есть права
function setRoleToAllFlexoSchemeAccess( role ) {
	return 'role:all:flexoSchemeName:' + role;
}

//Формирование ключа REDIS (SET) для сохранения связки роли пользователя и логина пользователя
function setRoleToAllUser( role ) {
	return 'role:all:user:' + role;
}

//Формирование ключа REDIS (SET) для сохранения связки логина юзера и названия flexo схем по
// которым у него есть права
function setUserToAllFlexoSchemeAccess( user ) {
	return 'user:all:flexoSchemeName:' + user;
}

//Формирование ключа REDIS (SET) для сохранения связки логина юзера и названия view по
// которым у него есть права
function setUserToAllViewAccess( user ) {
	return 'user:all:viewName:' + user;
}

//Формирование строки ключа Redis (STRING) для прав относящиеся к заданной flexo схемы и логина
//пользователя
function strFlexoAccessUserScheme( user, flexoSchemeName ) {
	return 'flexo:user:access:' + user + ':' + flexoSchemeName;
}

//Формирование строки ключа Redis (STRING) для прав относящиеся к view для заданной схемы и
//пользователю
function strViewAccessUser( user, viewName ) {
	return 'view:user:access:' + user + ':' + viewName;
}

//Формирование строки ключа Redis (SET) для хранения справочника о пользователей
function setListOfLogin( ) {
	return 'list:users:';
}

//Формирование строки ключа Redis (SET) для хранения справочника о ролях
function setListOfRole( ) {
	return 'list:roles:';
}

//Формирование строки ключа Redis (SET) для хранения справочника о ролях
function strObjOfRole( role ) {
	return 'obj:role:'+ role;
}

//Формирование строки ключа Redis (STRING) для хранения соответствия логина и _id пользователя
function strLoginToId( login ) {
	return 'login:_id:' + login;
}

//Формирование строки ключа Redis (STRING) для хранения соответствия _id и логина пользователя
function strIdToLogin( _id ) {
	return 'login:login:' + _id;
}

//Формирование строки ключа Redis (STRING) для хранения кеша данных о пользователе
function strUserCache( _id ) {
	return 'userCache:' + _id;
}

module.exports = ModuleUser;
