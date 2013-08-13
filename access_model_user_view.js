var underscore = require('underscore');
var ModelView = require('./model_view.js');

module.exports = AccessModelUserView;

/**
 * Конструктор модели прав по пользователю для view
 *
 * @constructor
 * @param client - объект redis клиент
 * @param strViewName - строка, название view
 * @param strUser - строка, логин пользователя
 */
function AccessModelUserView( client, strViewName, strUser ) {
	this.client = client;
	this.viewName = strViewName;
	this.user = strUser;
	this.objAccess = {};
	this.listFlexoSchemesNames = [];
	return this;
}

/**
 * Импорт в модель данных о доступе к view по пользователю
 *
 * @param objAccess - объект с правами на каждую схему входящую во view
 * @returns {boolean}
 */
AccessModelUserView.prototype.setObjAccess = function setObjAccess( objAccess ) {
	//ToDo:Продумать проверку объекта доступа
	if ( typeof objAccess !== 'object' ) { throw new Error( 'objAccess required' ); }

	//ToDo:Доделать возможность добавления данных к уже имеющимся в модели
	this.objAccess = objAccess;
	this.listFlexoSchemesNames = Object.keys( objAccess );

	if ( this.listFlexoSchemesNames.length === 0 ) { throw new Error( 'objAccess is empty' ); }

	return true;
};

/**
 * Сохранение модели в redis
 *
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - true в случае успешного сохранения
 */
AccessModelUserView.prototype.save = function save( callback ){
	var multi = this.client.multi();
	var viewName = this.viewName;
	var user = this.user;
	var listFlexoSchemesNames = this.listFlexoSchemesNames;
	var objAccess = this.objAccess;
	var key; //Формируемый ключ redis

	for ( var i = 0; i < listFlexoSchemesNames.length; i++ ) {
		//Сохранение объекта прав в redis
		key = strViewAccessUserFlexoScheme( viewName, user, listFlexoSchemesNames[i] );
		//ToDo:Проверка существования объекта objAccess[listFlexoSchemesNames[i]]
		multi.SET( key, JSON.stringify( objAccess[listFlexoSchemesNames[i]] ) );

		//ToDo:Временно сохраняем ключ в множество для быстрого удаления всех прав
		multi.SADD( setAllAccess, key );
	}

	multi.EXEC( function( err ) {
		if ( err ) {
			callback( err );
		} else {
			callback( null, true );
		}
	});
};

/**
 * Поиск модели прав для view в redis
 *
 * @param listFlexoSchemesNames - массив запрашиваемых flexo схем во view
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - возвращается искомый объект прав
 */
AccessModelUserView.prototype.find = function find( listFlexoSchemesNames, callback ) {
	var multi = this.client.multi();
	var viewName = this.viewName;
	var user = this.user;
	var self = this;

	//Получаем объекты прав для заданной view, пользователе и flexo схем
	for ( var i = 0; i < listFlexoSchemesNames.length; i++ ) {
		multi.GET(  strViewAccessUserFlexoScheme( viewName, user, listFlexoSchemesNames[i] ) );
	}

	multi.EXEC( function( err, reply ) {
		if ( err ) {
			callback( err );
		} else {
			//Формируем из массива объект прав:
			var objAccess = {};
			var listSchemesNames = [];
			for ( var i = 0; i < listFlexoSchemesNames.length; i++ ) {
				if ( reply[i] ) {
					objAccess[listFlexoSchemesNames[i]] = JSON.parse(reply[i]);
					listSchemesNames.push(listFlexoSchemesNames[i])
				}
			}
			//ToDo:Доделать возможность добавления данных к уже имеющимся в модели
			self.objAccess = objAccess;
			self.listFlexoSchemesNames = listSchemesNames;

			callback( null, objAccess );
		}
	});
};

/**
 * Удаление модели прав для view в redis по заданному списку flexo scheme
 *
 * @param listFlexoSchemesNames - массив запрашиваемых flexo схем во view
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - - true в случае успешного удаления
 */
AccessModelUserView.prototype.delete = function remove(listFlexoSchemesNames, callback){
	var multi = this.client.multi();
	var viewName = this.viewName;
	var user = this.user;
	var key;

	//Формируем команды на удаление
	for( var i = 0; i < listFlexoSchemesNames.length; i++ ) {
		key = strViewAccessUserFlexoScheme( viewName, user, listFlexoSchemesNames[i] );
		multi.DEL( key );
		//ToDo:Временно удаляем ключ в множестве предназначенного для быстрого удаления всех прав
		multi.SREM( setAllAccess(), key);
	}

	multi.EXEC( function( err ) {
		if ( err ) {
			callback( err );
		} else {
			//ToDo:Доделать возможность удаления не всех данных из уже имеющимся в модели
			callback( null, true );
		}
	});
};

/**
 * Возвращаем подготовленный объект с правами на view для будущего определения пересечения прав
 *
 * @returns {{}} - объект с подготовленными данными
 */
AccessModelUserView.prototype.accessDataPreparation = function accessDataPreparation(callback) {
	//Формируем объект со справочниками из полей для будущего определения пересечения прав
	var schemes = this.listFlexoSchemesNames;
	var self = this;
	//ToDo: сущность взята из model_view (Всё надо объединить в одну модель)
	var model = new ModelView(this.client);
	model.find(this.viewName, function( err, flexoSchemesWithFields ) {
		if( err ) {
			callback( err );
		} else {
			if ( schemes.length !== 0 ) {
				var objAccessForUser = {};


				for ( var i = 0; i < schemes.length; i++){
					objAccessForUser[schemes[i]] = {};

					//Чтение
					var readFields = accessDataPreparationForMethod('read', schemes[i], self.objAccess,
						flexoSchemesWithFields[schemes[i]]);

					if( readFields.length !== 0 ){
						objAccessForUser[schemes[i]]['read'] = readFields;
					}

					//Модификация
					var modifyFields = accessDataPreparationForMethod('modify', schemes[i], self.objAccess,
						flexoSchemesWithFields[schemes[i]]);

					if( modifyFields.length !== 0 ){
						objAccessForUser[schemes[i]]['modify'] = modifyFields;
					}

					//Создание
					var modifyFields = accessDataPreparationForMethod('create', schemes[i], self.objAccess,
						flexoSchemesWithFields[schemes[i]]);

					if( modifyFields.length !== 0 ){
						objAccessForUser[schemes[i]]['create'] = modifyFields;
					}

					//Удаление
					if(self.objAccess[schemes[i]]['delete']){
						objAccessForUser[schemes[i]]['delete'] = 1;
					} else {
						objAccessForUser[schemes[i]]['delete'] = 0;
					}
				}
				//Возвращаем объект с правами на пользователя
				callback(null, objAccessForUser);
			} else {
				callback(null, {});
			}
		}
	});
};

/**
 * Возвращает массив с двумя вложенными массивами разрешенных полей и не разрешенных полей
 * для выполнения указанной операции с БД, для указанной flexoсхемы
 *
 * @param method - строка, тип операции
 * @param scheme - строка, имя flexo схемы
 * @param objAccess - объект с данными о доступе
 * @param fieldsGlobalFlexoScheme -  объект с данными из схем flexo коллекций
 * @returns {*}
 */
function accessDataPreparationForMethod(method, scheme, objAccess, fieldsGlobalFlexoScheme){
	var permissionFields = [];
	var notPermissionFields = [];

	if ( objAccess[scheme][method] ) {
		//Проверяем наличие спец команды (all)
		if( objAccess[scheme][method]['(all)'] ) {
			//Проверяется на равенство 1, так как запрет всех полей по роли должно
			// соответстввать отсутствию полей в правах
			if ( objAccess[scheme][method]['(all)'] === 1 ){
				//Получаем все поля из объекта прав
				var fields = Object.keys(objAccess[scheme][method]);
				//Формируем списки которые необходимо добавить или удалить
				for ( var j = 0; j < fields.length; j++) {
					if ( fields[j] !== '(all)' ) {
						if (objAccess[scheme][method][fields[j]] === 1){
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
				var fields = Object.keys(objAccess[scheme][method]);
				//Формируем списки которые необходимо добавить или удалить
				for ( var j = 0; j < fields.length; j++) {
					if ( fields[j] !== '(all)' ) {
						if (objAccess[scheme][method][fields[j]] === 1){
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
			var readFields = Object.keys(objAccess[scheme][method]);
			//Формируем списки которые необходимо добавить или удалить
			for ( var j = 0; j < readFields.length; j++) {
				//Проверяется, так как в роли при отсутствия спец команды (all) поля с
				// запретом равносильны отсутствию полей
				if (objAccess[scheme][method][readFields[j]] === 1){
					permissionFields.push(readFields[j]);
				} else {
					notPermissionFields.push(readFields[j]);
				}
			}
		}
	}

	return [permissionFields, notPermissionFields];
}

//Формирование строки ключа Redis (STRING) для прав относящиеся к view для заданной схемы и
//пользователю
function strViewAccessUserFlexoScheme( viewName, user, flexoSchemeName ) {
	return 'view:user:access:' + viewName + ':' + user + ':' + flexoSchemeName;
}

//Формирование ключа Redis (SET) для множества всех ключей с правами
function setAllAccess(){
	return 'all:access:';
}
