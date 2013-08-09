var underscore = require('underscore');

module.exports = AccessModelUserFlexo;

/**
 * Конструктор модели прав по роли для flexo схемы
 *
 * @constructor
 * @param client - объект redis клиент
 * @param strFlexoSchemeName - строка, название flexo схемы
 * @param strUser - строка, логин
 */
function AccessModelUserFlexo( client, strFlexoSchemeName, strUser ) {
	this.client = client;
	this.strFlexoSchemeName = strFlexoSchemeName;
	this.user = strUser;
	this.objAccess = {};
	return this;
}

/**
 * Импорт в модель данных о доступе к flexo схеме по роли
 *
 * @param objAccess - объект с правами одной flexo схемы по роли
 * @returns {boolean}
 */
AccessModelUserFlexo.prototype.setObjAccess = function setObjAccess( objAccess ) {
	//ToDo:Продумать проверку объекта доступа
	if ( typeof objAccess !== 'object' ) { throw new Error( 'objAccess required' ); }

	//ToDo:Доделать возможность добавления данных к уже имеющимся в модели
	this.objAccess = objAccess;

	return true;
};

/**
 * Сохранение модель в redis
 *
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - true в случае успешного сохранения
 */
AccessModelUserFlexo.prototype.save = function save( callback ){
	var multi = this.client.multi();
	var strFlexoSchemeName = this.strFlexoSchemeName;
	var user = this.user;
	var objAccess = this.objAccess;
	var key;

	//Сохранение объекта прав в redis
	key = strFlexoAccessUserScheme( user, strFlexoSchemeName );

	multi.SET( key, JSON.stringify(objAccess));

	//ToDo:Временно сохраняем ключ в множество для быстрого удаления всех прав
	multi.SADD( setAllAccess, key );

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
 * @param flexoSchemeName - строка, название flexo схемы
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - возвращается искомый объект прав
 */
AccessModelUserFlexo.prototype.find = function find( flexoSchemeName, callback ) {
	var user = this.user;
	var self = this;

	//Получаем объекты прав для заданной flexo схемы и роли
	this.client.GET(  strFlexoAccessUserScheme( user, flexoSchemeName ), function( err, reply ) {
		if ( err ) {
			callback( err );
		} else if ( reply ) {
			var objAccess = JSON.parse(reply);

			callback( null, objAccess );
		} else {
			callback(new Error( 'No requested object access (user: ' + user +', flexoScheme: ' +
				flexoSchemeName + ')' ) );
		}
	});
};

/**
 * Формирование объект права на чтение для запрашиваемых схем
 *
 * @param flexoSchemesName - массив строк, названия запрашиваемых схем
 * @param globalFlexoSchemes - объект с данными из схем flexo коллекций
 * @param callback
 */
AccessModelUserFlexo.prototype.findReadAccesses = function findReadAccesses( globalFlexoSchemes, flexoSchemesName, callback ) {
	var multi = this.client.multi();
	//Формируем команды для получения объектов прав по указанным схемам
	for( var i = 0; i < flexoSchemesName.length; i++ ) {
		multi.GET( strFlexoAccessUserScheme( this.user, flexoSchemesName[i] ) );
	}

	multi.EXEC( function ( err, replies ) {
		if ( err ) {
			callback ( err );
		} else {
			//Формируем объект прав
			var objAccessForOneScheme;
			var objReadAccess = {};

			for( var i = 0; i < replies.length; i++) {
				if( replies[i] ){
					objAccessForOneScheme = JSON.parse( replies[i] );

					objReadAccess[flexoSchemesName[i]] =
						accessDataPreparationForMethod('read', objAccessForOneScheme,
							globalFlexoSchemes[flexoSchemesName[i]]['read']);
				}
			}
			callback(null, objReadAccess)
		}
	} );
};

/**
 * Возвращает массив с двумя вложенными массивами разрешенных полей и не разрешенных полей
 * для выполнения указанной операции с БД, для указанной flexo схемы
 *
 * @param method - строка, тип операции
 * @param objAccess - объект с данными о доступе
 * @param fieldsGlobalFlexoScheme -  объект с данными из схем flexo коллекций
 * @returns {*}
 */
function accessDataPreparationForMethod(method, objAccess, fieldsGlobalFlexoScheme){
	var permissionFields = [];
	var notPermissionFields = [];

	if ( objAccess[method] ) {
		//Проверяем наличие спец команды (all)
		if( objAccess[method]['(all)'] ) {
			//Проверяется на равенство 1, так как запрет всех полей по роли должно
			// соответстввать отсутствию полей в правах
			if ( objAccess[method]['(all)'] === 1 ){
				//Получаем все поля из объекта прав
				var fields = Object.keys(objAccess[method]);
				//Формируем списки которые необходимо добавить или удалить
				for ( var j = 0; j < fields.length; j++) {
					if ( fields[j] !== '(all)' ) {
						if (objAccess[method][fields[j]] === 1){
							permissionFields.push(fields[j]);
						} else {
							notPermissionFields.push(fields[j]);
						}
					}
				}

				//Пересекаем права
				permissionFields = underscore.union(fieldsGlobalFlexoScheme, permissionFields);
			} else {
				//Получаем все поля из объекта прав
				var fields = Object.keys(objAccess[method]);
				//Формируем списки которые необходимо добавить или удалить
				for ( var j = 0; j < fields.length; j++) {
					if ( fields[j] !== '(all)' ) {
						if (objAccess[method][fields[j]] === 1){
							permissionFields.push(fields[j]);
						} else {
							notPermissionFields.push(fields[j]);
						}
					}
				}

				//Объединяем права
				notPermissionFields = underscore.union(fieldsGlobalFlexoScheme, notPermissionFields);
			}
		} else {
			//Получаем все поля из объекта прав
			var readFields = Object.keys(objAccess[method]);
			//Формируем списки которые необходимо добавить или удалить
			for ( var j = 0; j < readFields.length; j++) {
				//Проверяется, так как в роли при отсутствия спец команды (all) поля с
				// запретом равносильны отсутствию полей
				if (objAccess[method][readFields[j]] === 1){
					permissionFields.push(readFields[j]);
				} else {
					notPermissionFields.push(fields[j]);
				}
			}
		}
	}

	return [permissionFields, notPermissionFields];
}

/**
 * Удаление модели прав для flexo схемы и логина пользователя в redis
 *
 * @param flexoSchemeName - строка название flexo схемы
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - - true в случае успешного удаления
 */
AccessModelUserFlexo.prototype.delete = function remove( flexoSchemeName, callback ){
	var multi = this.client.multi();
	var user = this.user;
	var key;

	//Формируем команды на удаление
	key = strFlexoAccessUserScheme( user, flexoSchemeName );
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

//Формирование строки ключа Redis (STRING) для прав относящиеся к заданной flexo схемы и логина
//пользователя
function strFlexoAccessUserScheme( user, flexoSchemeName ) {
	return 'flexo:user:access:' + user + ':' + flexoSchemeName;
}

//Формирование ключа Redis (SET) для множества всех ключей с правами
function setAllAccess(){
	return 'all:access:';
}
