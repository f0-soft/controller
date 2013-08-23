var underscore = require( 'underscore' );
var ModuleErrorLogging = require('./module_error_logging.js');

var AccessModuleRoleFlexo = {};

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
AccessModuleRoleFlexo.save = function save( client, role, strFlexoSchemeName, objAccess, callback ){
	var multi = client.multi();
	var key;

	//Сохранение объекта прав в redis
	key = strFlexoAccessRoleScheme( role, strFlexoSchemeName );

	multi.SET( key, JSON.stringify( objAccess ) );

	//ToDo:Временно сохраняем ключ в множество для быстрого удаления всех прав
	multi.SADD( setAllAccess(), key );

	multi.EXEC( function( err ) {
		if ( err ) {
			callback( err );
		} else {
			callback( null, true );
		}
	});
};

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
AccessModuleRoleFlexo.find = function find( client, role, flexoSchemeName, callback ) {

	//Получаем объекты прав для заданной flexo схемы и роли
	client.GET(  strFlexoAccessRoleScheme( role, flexoSchemeName ), function( err, reply ) {
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
AccessModuleRoleFlexo.accessDataPreparation = function accessDataPreparation( client, role,
	globalFlexoSchemes, flexoSchemesName, callback ) {

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
					//ToDo: доделать проверку на создание схемы если нет никаких прав
					objAccess[flexoSchemesName[i]] = {};

					//Информация для заданной flexo из глобального конфига
					var dataFromFlexoConfig = globalFlexoSchemes[flexoSchemesName[i]];
					//Переменная для хранения полей разрешенных правами flexo
					var fields;
					//Переменная для хранения различия между полями из правами и полями из
					// глобального конфига
					var difference;

					//Права на чтение
					fields = accessDataPreparationForMethod( 'read', objAccessForOneScheme,
						dataFromFlexoConfig['read'] );
					//Проверяем целостность прав на чтение
					//Права на flexo не должны по полям превышать глобальных прав
					difference = underscore.difference( fields, dataFromFlexoConfig['read'] );
					if( difference.length !== 0 ) {
						//Логируем нарушение целостности
						aDescriptioneError.push({
							type:'loss integrity',
							variant: 1,
							place: 'AccessModuleRoleFlexo.accessDataPreparation',
							time: new Date().getTime(),
							descriptione: {
								flexoSchemesName: flexoSchemesName[i],
								role: role
							}
						});

						//Присутствует нарушение целостности, обрезаем права
						fields = underscore.difference( fields, difference );
					}
					//Сохраняем права на чтение
					if( fields.length !== 0 ) {
						objAccess[flexoSchemesName[i]]['read'] = fields;
					}

					//Права на модификацию
					fields = accessDataPreparationForMethod( 'modify', objAccessForOneScheme,
						dataFromFlexoConfig['modify'] );
					//Проверяем целостность прав на модификацию
					//Права на flexo не должны по полям превышать глобальных прав
					difference = underscore.difference( fields, dataFromFlexoConfig['modify']);
					if( difference.length !== 0 ) {
						//Логируем нарушение целостности
						aDescriptioneError.push({
							type:'loss integrity',
							variant: 2,
							place: 'AccessModuleRoleFlexo.accessDataPreparation',
							time: new Date().getTime(),
							descriptione: {
								flexoSchemesName: flexoSchemesName[i],
								role: role
							}
						});

						//Присутствует нарушение целостности, обрезаем права
						fields = underscore.difference( fields, difference );
					}
					//Сохраняем права на модификацию
					if( fields.length !== 0 ) {
						objAccess[flexoSchemesName[i]]['modify'] = fields;
					}

					//Права на создание
					fields = accessDataPreparationForMethod( 'create', objAccessForOneScheme,
						dataFromFlexoConfig['modify'] );
					//Проверяем целостность прав на создание
					//Права на flexo не должны по полям превышать глобальных прав
					difference = underscore.difference( fields, dataFromFlexoConfig['modify']);
					if( difference.length !== 0 ) {
						//Логируем нарушение целостности
						aDescriptioneError.push({
							type:'loss integrity',
							variant: 3,
							place: 'AccessModuleRoleFlexo.accessDataPreparation',
							time: new Date().getTime(),
							descriptione: {
								flexoSchemesName: flexoSchemesName[i],
								role: role
							}
						});

						//Присутствует нарушение целостности, обрезаем права
						fields = underscore.difference( fields, difference );
					}
					//Сохраняем права на создание
					if( fields.length !== 0 ){
						objAccess[flexoSchemesName[i]]['create'] = fields;
					}

					//Права на создание всего документа
					if( objAccessForOneScheme['createAll'] ) {
						objAccess[flexoSchemesName[i]]['createAll'] = 1;
					} else {
						objAccess[flexoSchemesName[i]]['createAll'] = 0;
					}

					//Удаление
					if( objAccessForOneScheme['delete'] ) {
						objAccess[flexoSchemesName[i]]['delete'] = 1;
					} else {
						objAccess[flexoSchemesName[i]]['delete'] = 0;
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
 * Возвращает массив разрешенных полей для выполнения указанной операции с БД, для указанной flexo
 * схемы
 *
 * @param method - строка, тип операции
 * @param objAccess - объект с данными о доступе к одной схеме
 * @param fieldsGlobalFlexoScheme -  объект с данными из схем flexo коллекций
 * @returns {*}
 */
function accessDataPreparationForMethod( method, objAccess, fieldsGlobalFlexoScheme ){
	var permissionFields = [];

	if ( objAccess[method] ) {
		//Проверяем наличие спец команды (all)
		if( objAccess[method]['(all)'] ) {
			//Проверяется на равенство 1, так как запрет всех полей по роли должно
			// соответстввать отсутствию полей в правах
			if ( objAccess[method]['(all)'] === 1 ) {
				//Получаем все поля из объекта прав
				var fields = Object.keys( objAccess[method] );
				//Формируем списки которые необходимо добавить или удалить
				var addFields = [];
				var removeFields = [];
				for ( var j = 0; j < fields.length; j++ ) {
					if ( fields[j] !== '(all)' ) {
						if ( objAccess[method][fields[j]] === 1 ) {
							addFields.push( fields[j] );
						} else {
							removeFields.push( fields[j] );
						}
					}
				}

				//Пересекаем права
				permissionFields = underscore.union( fieldsGlobalFlexoScheme, addFields );
				permissionFields = underscore.difference( permissionFields, removeFields );
			}
		} else {
			//Получаем все поля из объекта прав
			var fields = Object.keys( objAccess[method] );
			//Формируем списки которые необходимо добавить или удалить
			var addReadFields = [];
			for ( var j = 0; j < fields.length; j++ ) {
				//Проверяется, так как в роли при отсутствия спец команды (all) поля с
				// запретом равносильны отсутствию полей
				if ( objAccess[method][fields[j]] === 1 ) {
					addReadFields.push( fields[j] );
				}
			}

			permissionFields = addReadFields;
		}
	}

	return permissionFields;
}


/**
 * Удаление модели прав для flexo схемы по роли в redis
 * @param client - ссылка на клиент redis
 * @param role - строка, название роли
 * @param flexoSchemeName - строка, название flexo схемы
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - - true в случае успешного удаления
 */
AccessModuleRoleFlexo.delete = function remove( client, role, flexoSchemeName, callback ){
	var multi = client.multi();
	var key;

	//Формируем команды на удаление
	key = strFlexoAccessRoleScheme( role, flexoSchemeName );
	multi.DEL( key );
	//ToDo:Временно удаляем ключ в множестве предназначенного для быстрого удаления всех прав
	multi.SREM( setAllAccess(), key);

	multi.EXEC( function( err ) {
		if ( err ) {
			callback( err );
		} else {
			callback( null, true );
		}
	});
};

//Формирование строки ключа Redis (STRING) для прав относящиеся к заданной flexo схемы и роли
function strFlexoAccessRoleScheme( role, flexoSchemeName ) {
	return 'flexo:role:access:' + role + ':' + flexoSchemeName;
}

//Формирование ключа Redis (SET) для множества всех ключей с правами
function setAllAccess(){
	return 'all:access:';
}

module.exports = AccessModuleRoleFlexo;