var ModuleUser = {};
var ModuleErrorLogging = require('./module_error_logging.js');

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

		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 1,
			place: 'Controller.ModuleUser.create',
			time: new Date().getTime(),
			sender:sender,
			arguments:{
				odjUser:odjUser
			},
			descriptione: {
				title:'Controller: In the query.user field _id is missing',
				text:'При создании пользователя, в объекте query.user не  ' +
					'указан идентификатор пользователя'
			}
		};

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
	client.SADD( setListOfRole() , role, function( err, reply ) {
		if( err ) {
			callback( err );
		} else {
			callback( null, true );
		}
	} );
};

ModuleUser.checkUnique = function checkUnique(client, sender, login, callback){
	var objDescriptioneError;

	if(typeof login !== "string"){

		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 1,
			place: 'Controller.ModuleUser.checkUnique',
			time: new Date().getTime(),
			sender:sender,
			descriptione: {
				title:'Controller:  In the query.user field login is missing',
				text:'При создании пользователя, в объекте query.user не  ' +
					'указан логин пользователя'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		return;
	}

	//Проверяем уникальность создаваемого пользователя
	client.GET( strLoginToId( login ), function( err, reply ){
		if( err ){
			callback( err );
		} else if (reply) {
			objDescriptioneError = {
				type: 'non-existent_data',
				variant: 1,
				place: 'Controller.ModuleUser.checkUnique',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					login:login
				},
				descriptione: {
					title:'Controller:  User already exists in redis',
					text:'При создании пользователя проверка уникальности логина показала, что' +
						'пользователь с таким логином уже существует'
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
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
				objDescriptioneError = {
					type: 'non-existent_data',
					variant: 1,
					place: 'Controller.ModuleUser.find',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						_idUser:_id
					},
					descriptione: {
						title:'Controller: No cache in redis',
						text:'Не существует данных о пользователе в redis, поиск осуществляется по' +
							'идентификатору пользователя'
					}
				};

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
						objDescriptioneError = {
							type: 'non-existent_data',
							variant: 2,
							place: 'Controller.ModuleUser.find',
							time: new Date().getTime(),
							sender:sender,
							arguments:{
								login:login
							},
							descriptione: {
								title:'Controller: No cache in redis',
								text:'Не существует данных о пользователе в redis, поиск ' +
									'осуществляется по логину пользователя',
								_idUser:_id
							}
						};

						ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
					}
				} );

			} else {
				objDescriptioneError = {
					type: 'non-existent_data',
					variant: 3,
					place: 'Controller.ModuleUser.find',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						login:login
					},
					descriptione: {
						title:'Controller: Requested the login does not exist',
						text:'Не существует в redis пользователя с указанным логином ' +
							'(не удается найти _id пользователя по его логину)'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		});
	} else {
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 1,
			place: 'Controller.ModuleUser.find',
			time: new Date().getTime(),
			sender:sender,
			descriptione: {
				title:'Controller: Not set login or _id in query.user',
				text:'При поиске данных о пользователе в объекте query.user не указан параметр' +
					'login или _id пользователя'
			}
		};

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
				callback(new Error( err.message + ': ' + role ), reply);
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
					//Удаляем роль из списка ролей
					multi.SREM( setListOfRole() , role);

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
