var _ = require( 'underscore' );
var ModuleErrorLogging = require('./module_error_logging.js');

var AccessModuleFlexo = {};

/**
 * Сохранение модель в redis
 *
 * @param objAccess - объект прав
 * @param role - строка роль
 * @param strFlexoSchemeName - строка, название flexo схемы
 * @param client - объект, редис клиент
 * @param callback (err, reply)
 *        err - ошибка от node_redis
 *        reply - true в случае успешного сохранения
 */
AccessModuleFlexo.saveForRole = function saveForRole( client, role, strFlexoSchemeName, objAccess,
	                                                  globalFlexo, callback ) {

	//Валидация и проверка целостности объекта flexo прав по роли
	validationAndCheckIntegrityAccess( objAccess, globalFlexo, function( err, objForSave ) {
		if ( err ) {
			callback( err );
		} else {
			//Сохранение объекта прав в redis
			var multi = client.multi();
			var key;

			key = strFlexoAccessRoleScheme( role, strFlexoSchemeName );

			multi.SET( key, JSON.stringify( objForSave ) );

			multi.SADD( setRoleToAllFlexoSchemeAccess( role ), strFlexoSchemeName );

			multi.EXEC( function( err ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, true );
				}
			});
		}
	} );

};

/**
 * Сохранение модель в redis
 *
 * @param client - ссылка на клиент redis
 * @param user - строка, логин пользователя
 * @param strFlexoSchemeName - строка, имя flexo схемы
 * @param objAccess - объект с описанием прав доступа по пользователю
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - true в случае успешного сохранения
 */
AccessModuleFlexo.saveForUser = function saveForUser( client, user, strFlexoSchemeName, objAccess,
													  globalFlexo, callback ){

	//Валидация и проверка целостности объекта flexo прав по пользователю
	validationAndCheckIntegrityAccess( objAccess, globalFlexo, function( err, objForSave ) {
		var multi = client.multi();
		var key;

		//Сохранение объекта прав в redis
		key = strFlexoAccessUserScheme( user, strFlexoSchemeName );

		multi.SET( key, JSON.stringify( objForSave ) );

		//Сохраняем связку юзера и названия flexo схем по которым есть права
		multi.SADD( setUserToAllFlexoSchemeAccess( user ), strFlexoSchemeName );

		multi.EXEC( function( err, replies ) {
			if ( err ) {
				callback( err );
			} else {
				callback( null, true );
			}
		} );
	} );
};

//Валидация и проверка целостности объекта flexo прав
function validationAndCheckIntegrityAccess(objectAccess, globalFlexo, callback){

	if ( _.isUndefined( objectAccess ) && _.isEmpty( objectAccess ) ) {
		callback( new Error( 'Controller: incorrect parameter object access' ) );
		return;
	}

	var objAccess = _.clone( objectAccess );

	var read = objAccess.read;

	if ( !_.isUndefined( read ) ) {

		if ( _.isUndefined( read['(all)'] ) && !_.isNumber( read['(all)'] ) ){
			callback(new Error('Controller: incorrect parameter read.["(all)"] in object access: ' +
				JSON.stringify( objAccess ) ) );
			return;
		} else if ( _.isUndefined( read.fields ) && !_.isArray( read.fields ) ){
			callback(new Error('Controller: incorrect parameter read.fields in object access: ' +
				JSON.stringify( objAccess ) ) );
			return;
		} else if( _.difference( read.fields, globalFlexo.read ).length !== 0 ) {
			callback(new Error('Controller: error integrity in read.fields in object access: ' +
				JSON.stringify( objAccess ) ) );
			return;
		}
	}

	var modify = objAccess.modify;

	if ( !_.isUndefined( modify ) ) {

		if ( _.isUndefined( modify['(all)'] ) && !_.isNumber( modify['(all)'] ) ) {
			callback(new Error('Controller: incorrect parameter modify.["(all)"] in object access: ' +
				JSON.stringify( objAccess ) ) );
			return;
		} else if ( _.isUndefined( modify.fields ) && !_.isArray( modify.fields ) ){
			callback(new Error('Controller: incorrect parameter modify.fields in object access: ' +
				JSON.stringify( objAccess ) ) );
			return;
		} else if( _.difference( modify.fields, globalFlexo.modify ).length !== 0 ) {
			callback(new Error('Controller: error integrity in modify.fields in object access: ' +
				JSON.stringify( objAccess ) ) );
			return;
		}
	}

	var create = objAccess.create;

	if ( !_.isUndefined( create ) ) {

		if ( _.isUndefined( create['(all)'] ) && !_.isNumber( create['(all)'] ) ) {
			callback(new Error('Controller: incorrect parameter create.["(all)"] in object access: ' +
				JSON.stringify( objAccess ) ) );
			return;
		} else if ( _.isUndefined( create.fields ) && !_.isArray( create.fields ) ) {
			callback(new Error('Controller: incorrect parameter create.fields in object access: ' +
				JSON.stringify( objAccess ) ) );
			return;
		} else if( _.difference( create.fields, globalFlexo.modify ).length !== 0 ) {
			callback(new Error('Controller: error integrity in create.fields in object access: ' +
				JSON.stringify( objAccess ) ) );
			return;
		}
	}

	if ( _.isUndefined( objAccess.createAll ) ) {
		if ( !_.isUndefined( create ) ) {
			if ( create['(all)'] === 0){
				if (create.fields.length ) {
					objAccess.createAll = 1;
				} else {
					objAccess.createAll = 0;
				}
			} else {
				if (create.fields.length === globalFlexo.modify.length ) {
					objAccess.createAll = 0;
				} else {
					objAccess.createAll = 1;
				}
			}
		}
	} else if ( !_.isNumber( objAccess.createAll ) ) {
		callback(new Error('Controller: incorrect parameter in createAll in object access: ' +
			JSON.stringify( objAccess ) ) );
		return;
	}

	if ( !_.isUndefined( objAccess.delete ) ){

		if ( !_.isNumber( objAccess.delete ) ) {
			callback(new Error('Controller: incorrect parameter in delete in object access: ' +
				JSON.stringify( objAccess ) ) );
			return;
		}
	}

	callback( null, objAccess );
}


/**
 * Поиск модели прав для flexo схемы и заданной роли в redis
 *
 * @param client - объект, клиент redis
 * @param role - строка, название роли
 * @param flexoSchemeName - строка, название flexo схемы
 * @param callback (err, reply)
 * 		err - ошибка от node_redis, или ошибка синализирующая об отсутствии запрашиваемого объекта
 * 		reply - возвращается искомый объект прав
 */
AccessModuleFlexo.findForRole = function findForRole( client, role, flexoSchemeName, callback ) {

	//Получаем объекты прав для заданной flexo схемы и роли
	client.GET( strFlexoAccessRoleScheme( role, flexoSchemeName ), function( err, reply ) {
		if ( err ) {
			callback( err );
		} else if ( reply ) {
			var objAccess = JSON.parse(reply);

			callback( null, objAccess );
		} else {
			callback(new Error( 'Controller: No requested object access (role: ' + role +', ' +
				'flexoScheme: ' + flexoSchemeName + ')' ) );
		}
	});
};

/**
 * Поиск модели прав для flexo схемы и заданной роли в redis
 *
 * @param client - ссылка на клиент redis
 * @param user - строка, логин пользоватея
 * @param flexoSchemeName - строка, название flexo схемы
 * @param callback (err, reply)
 * 		err - ошибка от node_redis или ошибка сигнализирующая об отсутствии объекта прав
 * 		reply - искомый объект прав
 */
AccessModuleFlexo.findForUser = function findForUser( client, user, flexoSchemeName, callback ) {

	//Получаем объекты прав для заданной flexo схемы и роли
	client.GET(  strFlexoAccessUserScheme( user, flexoSchemeName ), function( err, reply ) {
		if ( err ) {
			callback( err );
		} else if ( reply ) {
			var objAccess = JSON.parse( reply );

			callback( null, objAccess );
		} else {
			callback(new Error( 'Controller: No requested object access (user: ' + user +', ' +
				'flexoScheme: ' + flexoSchemeName + ')' ) );
		}
	});
};

/**
 * Получаем объекты прав и формируем в нужном виде права
 *
 * @param client - ссылка на объект клиента redis
 * @param role - строка, название роли
 * @param globalFlexoSchemes - ссылка на глобальный объект с описанием flexo схем
 * @param flexoSchemesName - массив, запрашиваемых flexo схем
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - возвращается искомый объект прав сгруппированный по flexo схемам
 */
function accessDataPreparationForRole( client, role, globalFlexoSchemes, flexoSchemesName, callback ) {

	var multi = client.multi();
	//Формируем команды для получения объектов прав по указанным схемам
	for( var i = 0; i < flexoSchemesName.length; i++ ) {
		multi.GET( strFlexoAccessRoleScheme( role, flexoSchemesName[i] ) );
	}

	multi.EXEC( function ( err, replies ) {
		if ( err ) {
			callback ( err );
		} else {
			//Формируем объект прав
			var objAccessForOneScheme;
			var objAccess = {};
			//Объект для сохранения информации об нарушениях целостности
			var aDescriptioneError = [];
			for( var i = 0; i < replies.length; i++) {
				if( replies[i] ){
					objAccessForOneScheme = JSON.parse( replies[i] );

					objAccess[flexoSchemesName[i]] = {};

					//Информация для заданной flexo из глобального конфига
					var dataFlexoConfig = globalFlexoSchemes[flexoSchemesName[i]];
					//Переменная для хранения полей разрешенных правами flexo
					var fields;
					//Переменная для хранения различия между полями из правами и полями из
					// глобального конфига
					var difference;

					//Права на чтение
					if ( _.isUndefined( objAccessForOneScheme.read ) ) {

						if ( objAccessForOneScheme.read['(all)'] ) {
							fields = _.difference( dataFlexoConfig.read,
								objAccessForOneScheme.read.fields );
						} else {
							fields = objAccessForOneScheme;

							//Проверяем целостность прав на чтение
							//Права на flexo не должны по полям превышать глобальных прав
							difference = _.difference( fields, dataFlexoConfig.read );
							if( difference.length !== 0 ) {
								//Логируем нарушение целостности
								aDescriptioneError.push({
									type:'loss_integrity',
									variant: 1,
									place: 'AccessModuleFlexo.accessDataPreparation',
									time: new Date().getTime(),
									descriptione: {
										flexoSchemesName: flexoSchemesName[i],
										role: role
									}
								});

								//Присутствует нарушение целостности, обрезаем права
								fields = _.difference( fields, difference );
							}

						}
						//Сохраняем права на чтение
						objAccess[flexoSchemesName[i]]['read'] = fields;

					} else {
						objAccess[flexoSchemesName[i]]['read'] = [];
					}

					//Права на модификацию
					if ( _.isUndefined( objAccessForOneScheme.modify ) ) {
						if ( objAccessForOneScheme.modify['(all)'] ) {
							fields = _.difference( dataFlexoConfig.modify,
								objAccessForOneScheme.modify.fields );
						} else {
							fields = objAccessForOneScheme;

							//Проверяем целостность прав на модификацию
							//Права на flexo не должны по полям превышать глобальных прав
							difference = _.difference( fields, dataFlexoConfig.modify );
							if( difference.length !== 0 ) {
								//Логируем нарушение целостности
								aDescriptioneError.push({
									type:'loss_integrity',
									variant: 2,
									place: 'AccessModuleFlexo.accessDataPreparation',
									time: new Date().getTime(),
									descriptione: {
										flexoSchemesName: flexoSchemesName[i],
										role: role
									}
								});

								//Присутствует нарушение целостности, обрезаем права
								fields = _.difference( fields, difference );
							}
						}
						//Сохраняем права на модификацию
						objAccess[flexoSchemesName[i]]['modify'] = fields;

					} else {
						//Сохраняем права на модификацию
						objAccess[flexoSchemesName[i]]['modify'] = [];
					}

					//Права на создание
					if ( _.isUndefined( objAccessForOneScheme.create ) ) {
						if ( objAccessForOneScheme.create['(all)'] ) {
							fields = _.difference( dataFlexoConfig.modify,
								objAccessForOneScheme.create.fields );
						} else {
							fields = objAccessForOneScheme;

							difference = _.difference( fields, dataFlexoConfig['modify']);

							if( difference.length !== 0 ) {
								//Логируем нарушение целостности
								aDescriptioneError.push({
									type:'loss_integrity',
									variant: 3,
									place: 'AccessModuleFlexo.accessDataPreparation',
									time: new Date().getTime(),
									descriptione: {
										flexoSchemesName: flexoSchemesName[i],
										role: role
									}
								});

								//Присутствует нарушение целостности, обрезаем права
								fields = _.difference( fields, difference );
							}
						}

						//Сохраняем права на создание
						objAccess[flexoSchemesName[i]]['create'] = fields;

						//Права на создание всего документа
						if( objAccessForOneScheme['createAll'] ) {
							objAccess[flexoSchemesName[i]]['createAll'] = 1;
						} else {
							objAccess[flexoSchemesName[i]]['createAll'] = 0;
						}

					} else {
						//Сохраняем права на создание
						objAccess[flexoSchemesName[i]]['create'] = [];
						objAccess[flexoSchemesName[i]]['createAll'] = 0;
					}

                    //Удаление
					if( objAccessForOneScheme['delete'] ) {
						objAccess[flexoSchemesName[i]]['delete'] = 1;
					} else {
						objAccess[flexoSchemesName[i]]['delete'] = 0;
					}
				} else {
					objAccess[flexoSchemesName[i]] = {
						read:[],
						modify:[],
						create:[],
						createAll:0,
						delete:0
					}
				}
			}
			if (aDescriptioneError.length !== 0 ){
				ModuleErrorLogging.save(client, aDescriptioneError, function( err, reply ) {
					if ( err ) {
						callback( err );
					} else {
						callback(null, objAccess);
					}
				});
			} else {
				callback(null, objAccess);
			}
		}
	} );
}

/**
 * Получаем объекты прав по пользователю и пересекаем права с правами по роли
 *
 * @param client - ссылка на клиент redis
 * @param user - строка, логин пользователя
 * @param globalFlexoSchemes - ссылка на глобальный объект с информацией о flexo схемах
 * @param flexoSchemesName - массив, запрашиваемых flexo схем
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - возвращается искомый объект прав сгруппированный по flexo схемам
 */
function accessDataPreparationForUser( client, user, globalFlexoSchemes, flexoSchemesName,
									   objAccessFromRole, callback ) {
	var multi = client.multi();
	//Формируем команды для получения объектов прав по указанным схемам
	for( var i = 0; i < flexoSchemesName.length; i++ ) {
		multi.GET( strFlexoAccessUserScheme( user, flexoSchemesName[i] ) );
	}

	multi.EXEC( function ( err, replies ) {
		if ( err ) {
			callback ( err );
		} else {
			//Формируем объект прав
			var objAccessForOneScheme;
			var objAccess = {};
			//Объект для сохранения информации об нарушениях целостности
			var aDescriptioneError = [];

			for( var i = 0; i < replies.length; i++) {
				if( replies[i] ){
					objAccessForOneScheme = JSON.parse( replies[i] );

					objAccess[flexoSchemesName[i]] = {};

					//Массив для хранения с разрешенными правами на flexo
					var fields;
					//Информация для заданной flexo из глобального конфига
					var dataFlexoConfig = globalFlexoSchemes[flexoSchemesName[i]];
					//Переменная для хранения различия между полями из правами и полями из
					// глобального конфига
					var difference;
					//Переманная для хранения flexo прав по пользователю
					var userAccess = objAccessFromRole[flexoSchemesName[i]];

					//Права на чтение
					if ( _.isUndefined( objAccessForOneScheme.read ) ) {

						if ( objAccessForOneScheme.read['(all)'] ) {
							fields = _.difference(dataFlexoConfig.read,
								objAccessForOneScheme.read.fields);
						} else {
							fields = _
							fields = [objAccessForOneScheme.read.fields, dataFlexoConfig.read];

							//Проверяем целостность прав на чтение
							//Права на flexo не должны по полям превышать глобальных прав
							var crossingFields = _.difference( fields[0], fields[1] );
							difference = _.difference( crossingFields, dataFlexoConfig.read );
							if( difference.length !== 0 ) {
								//Логируем нарушение целостности
								aDescriptioneError.push({
									type:'loss_integrity',
									variant: 1,
									place: 'AccessModuleFlexo.accessDataPreparation',
									time: new Date().getTime(),
									descriptione: {
										flexoSchemesName: flexoSchemesName[i],
										user: user
									}
								});

								//Присутствует нарушение целостности, обрезаем права
								fields[0] = _.difference( fields[0], difference );
							}
						}
						//Сохраняем права на чтение
						objAccess[flexoSchemesName[i]]['read'] = fields
					} else {
						objAccess[flexoSchemesName[i]]['read'] = userAccess['read'];
					}




					var readFields = accessDataPreparationForMethod( 'read', objAccessForOneScheme,
						dataFromFlexoConfig['read'] );
					//Проверяем целостность прав на чтение
					//Права на flexo не должны по полям превышать глобальных прав
					var resultReadFields = underscore.difference( readFields[0], readFields[1] );
					difference = underscore.difference( resultReadFields,
						dataFromFlexoConfig['read'] );
					if( difference.length !== 0 ){
						//Логируем нарушение целостности
						aDescriptioneError.push({
							type:'loss_integrity',
							variant: 1,
							place: 'AccessModuleUserFlexo.accessDataPreparation',
							time: new Date().getTime(),
							descriptione: {
								flexoSchemesName: flexoSchemesName[i],
								user: user
							}
						});

						//Присутствует нарушение целостности, обрезаем права
						readFields[0] = underscore.difference( readFields[0], difference );
					}
					//Сохраняем права на чтение
					if( readFields[0].length !== 0 || readFields[1].length !== 0 ){
						objAccess[flexoSchemesName[i]]['read'] = readFields;
					}

					//Права на модификацию
					var modifyFields = accessDataPreparationForMethod( 'modify',
						objAccessForOneScheme, dataFromFlexoConfig['modify'] );
					//Проверяем целостность прав на модификацию
					//Права на flexo не должны по полям превышать глобальных прав
					var resultModifyFields = underscore.difference( modifyFields[0],
						modifyFields[1] );
					difference = underscore.difference( resultModifyFields,
						dataFromFlexoConfig['modify'] );
					if( difference.length !== 0 ) {
						//Логируем нарушение целостности
						aDescriptioneError.push({
							type:'loss_integrity',
							variant: 2,
							place: 'AccessModuleUserFlexo.accessDataPreparation',
							time: new Date().getTime(),
							descriptione: {
								flexoSchemesName: flexoSchemesName[i],
								user: user
							}
						});

						//Присутствует нарушение целостности, обрезаем права
						modifyFields[0] = underscore.difference( modifyFields[0], difference );
					}
					//Сохраняем права на модификацию
					if( modifyFields[0].length !== 0 || modifyFields[1].length !== 0 ) {
						objAccess[flexoSchemesName[i]]['modify'] = modifyFields;
					}

					//Права на создание
					var createFields = accessDataPreparationForMethod( 'create',
						objAccessForOneScheme, dataFromFlexoConfig['modify']);
					//Проверяем целостность прав на создание
					//Права на flexo не должны по полям превышать глобальных прав
					var resultCreateFields = underscore.difference( createFields[0],
						createFields[1] );
					difference = underscore.difference( resultCreateFields,
						dataFromFlexoConfig['modify'] );
					if( difference.length !== 0 ){
						//Логируем нарушение целостности
						aDescriptioneError.push({
							type:'loss_integrity',
							variant: 3,
							place: 'AccessModuleUserFlexo.accessDataPreparation',
							time: new Date().getTime(),
							descriptione: {
								flexoSchemesName: flexoSchemesName[i],
								user: user
							}
						});

						//Присутствует нарушение целостности, обрезаем права
						createFields[0] = underscore.difference( createFields[0], difference );
					}
					//Сохраняем права на создание
					if( createFields[0].length !== 0 || createFields[1].length !== 0 ) {
						objAccess[flexoSchemesName[i]]['create'] = createFields;
					}

					//Права на создание всего документа
					if( !underscore.isUndefined( objAccessForOneScheme['createAll'] ) ) {
						if( objAccessForOneScheme['createAll'] ) {
							objAccess[flexoSchemesName[i]]['createAll'] = 1;
						} else {
							objAccess[flexoSchemesName[i]]['createAll'] = 0;
						}
					}

					//Удаление
					if( !underscore.isUndefined( objAccessForOneScheme['delete'] ) ) {
						if( objAccessForOneScheme['delete'] ) {
							objAccess[flexoSchemesName[i]]['delete'] = 1;
						} else {
							objAccess[flexoSchemesName[i]]['delete'] = 0;
						}
					}
				}
			}

			if (aDescriptioneError.length !== 0 ){
				ModuleErrorLogging.save(client, aDescriptioneError, function( err, reply ) {
					if ( err ) {
						callback( err );
					} else {
						callback(null, objAccess);
					}
				});
			} else {
				callback(null, objAccess);
			}
		}
	} );
};



/**
 * Удаление модели прав для flexo схемы по роли в redis
 * @param client - ссылка на клиент redis
 * @param role - строка, название роли
 * @param flexoSchemeName - строка, название flexo схемы
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - - true в случае успешного удаления
 */
AccessModuleFlexo.deleteForRole = function deleteForRole( client, role, flexoSchemeName, callback ){
	var multi = client.multi();
	var key;

	//Формируем команды на удаление
	key = strFlexoAccessRoleScheme( role, flexoSchemeName );
	multi.DEL( key );

	multi.SREM( setRoleToAllFlexoSchemeAccess( role ), flexoSchemeName);

	multi.EXEC( function( err ) {
		if ( err ) {
			callback( err );
		} else {
			callback( null, true );
		}
	});
};

//Формирование ключа REDIS (SET) для сохранения связки роли юзера и названия flexo схем по
// которым у него есть права
function setRoleToAllFlexoSchemeAccess( role ) {
	return 'role:all:flexoSchemeName:' + role;
}

//Формирование строки ключа Redis (STRING) для прав относящиеся к заданной flexo схемы и роли
function strFlexoAccessRoleScheme( role, flexoSchemeName ) {
	return 'flexo:role:access:' + role + ':' + flexoSchemeName;
}

//Формирование ключа Redis (SET) для множества всех ключей с правами
function setAllAccess(){
	return 'all:access:';
}

//Формирование ключа REDIS (SET) для сохранения связки логина юзера и названия flexo схем по
// которым у него есть права
function setUserToAllFlexoSchemeAccess( user ) {
	return 'user:all:flexoSchemeName:' + user;
}

//Формирование строки ключа Redis (STRING) для прав относящиеся к заданной flexo схемы и логина
//пользователя
function strFlexoAccessUserScheme( user, flexoSchemeName ) {
	return 'flexo:user:access:' + user + ':' + flexoSchemeName;
}

module.exports = AccessModuleFlexo;