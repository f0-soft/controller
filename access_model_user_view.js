var underscore = require('underscore');

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
	return this;
}

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
	var key; //Формируемый ключ redis

	//Сохранение объекта прав в redis
	key = strViewAccessUser( viewName, user );
	//ToDo:Проверка объекта objAccess
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
 * Поиск модели прав для view в redis
 *
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - возвращается искомый объект прав
 */
AccessModelUserView.prototype.find = function find( callback ) {
	var viewName = this.viewName;
	var user = this.user;
	var self = this;
	this.client.GET(  strViewAccessUser( viewName, role), function( err, reply ) {
		if ( err ) {
			callback( err );
		} else {
			//Формируем из массива объект прав:
			var objAccess  = JSON.parse(reply[i]);

			self.objAccess = objAccess;
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
	key = strViewAccessUser( viewName, user );
	multi.DEL( key );
	//ToDo:Временно удаляем ключ в множестве предназначенного для быстрого удаления всех прав
	multi.SREM( setAllAccess(), key);

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
AccessModelUserView.prototype.accessPreparation = function accessPreparation( viewConfig ) {
	var objAccess = this.objAccess;
	//Формируем объект со справочниками из полей для будущего определения пересечения прав
	var objReturnAccessForUser = {};
	objReturnAccessForUser['add'] = [];
	objReturnAccessForUser['del'] = [];

	var listOf_Vid = Object.keys(objAccess);
	for( var i = 0; i < listOf_Vid.length; i++ ) {
		if( objAccess[listOf_Vid[i]] === 1 ) {
			if( listOf_Vid[i] === '(all)' ) {
				objReturnAccessForUser['add'] = underscore.union( objReturnAccessForUser['add'],
					Object.keys(viewConfig) );
			} else {
				objReturnAccessForUser['add'].push(listOf_Vid[i]);
			}
		} else {
			if( listOf_Vid[i] === '(all)' ) {
				objReturnAccessForUser['del'] = underscore.union( objReturnAccessForUser['add'],
					Object.keys(viewConfig) );
			} else {
				objReturnAccessForUser['del'].push(listOf_Vid[i]);
			}
		}
	}

	//Возвращаем объект с правами на роль
	return objReturnAccessForUser;
};

//Формирование строки ключа Redis (STRING) для прав относящиеся к view для заданной схемы и
//пользователю
function strViewAccessUser( viewName, user ) {
	return 'view:user:access:' + viewName + ':' + user;
}

//Формирование ключа Redis (SET) для множества всех ключей с правами
function setAllAccess(){
	return 'all:access:';
}
