var underscore = require('underscore');

module.exports = ModelMenu;

/**
 * Конструктор модели меню
 *
 * @constructor
 * @param client - объект redis клиент
 * @param [login] - строка, login пользователя
 * @param [role] - строка, роль пользователя
 */

function ModelMenu( client, login, role ) {
	this.client = client;
	this.login = login;
	this.role = role;
	this.objMenu = {};
	return this;
}

/**
 * Создаем данных о меню с правами и сохраняем в redis
 *
 * @param type
 * @param odjMenu - объект {материальный путь:доступ}
 * @param callback
 * 		err - ошибки от node_redis и ...
 * 		reply - возвращается true в случае успешного создания
 */
ModelMenu.prototype.create = function create(type, odjMenu, callback ) {
	var multi = this.client.multi();
	var keys = Object.keys(odjMenu);

	if( type === 'user' ) {
		for(var i = 0; i < keys.length; i++ ){
			multi.SET( strLoginMenu( this.login, keys[i] ), odjMenu[keys[i]] );
			//ToDo:временно
			multi.SADD( setAllAccess(), strLoginMenu( this.login, keys[i] ) );
			multi.SADD( setLoginMenuAll( this.login ), keys[i] );
		}
		multi.SADD( setAllAccess(), setLoginMenuAll( this.login ) );
	} else if ( type === 'role' ) {
		for(var i = 0; i < keys.length; i++ ){
			multi.SET( strRoleMenu( this.role, keys[i] ), odjMenu[keys[i]] );
			//ToDo:временно
			multi.SADD( setAllAccess(), strRoleMenu( this.role, keys[i] ) );
			multi.SADD( setRoleMenuAll( this.role ), keys[i] );
		}
		multi.SADD( setAllAccess(), setRoleMenuAll( this.role ) );
	}

	multi.EXEC(function( err ){
		if(err){
			callback( err );
		} else {
			callback( null, true );
		}
	});
};

ModelMenu.prototype.find = function create(type, callback ) {
	var self = this;

	if( type === 'user' ) {
		this.client.SMEMBERS( setLoginMenuAll( this.login ), function( err, keys ) {
			var multi = self.client.multi();

			for( var i=0; i<keys.length; i++){
				multi.GET( strLoginMenu( self.login, keys[i] ));
			}

			multi.EXEC(function( err, replies ){
				if(err){
					callback( err );
				} else {

					var obj = {};

					for(var i=0; i<replies.length; i++){
						obj[keys[i]] = replies[i];
					}
					callback( null, obj );
				}
			});

		} );
	} else if ( type === 'role' ) {
		this.client.SMEMBERS( setRoleMenuAll( this.role ), function( err, keys ) {
			var multi = self.client.multi();

			for( var i=0; i<keys.length; i++){
				multi.GET( strRoleMenu( self.role, keys[i] ));
			}

			multi.EXEC(function( err, replies ){
				if(err){
					callback( err );
				} else {

					var obj = {};

					for(var i=0; i<replies.length; i++){
						obj[keys[i]] = replies[i];
					}
					callback( null, obj );
				}
			});

		} );
	}

};

ModelMenu.prototype.getAccess = function getAccess(user, role, objGlobalMenu, callback){
	var self = this;

	findUserMenuAccess(user, this.client, function(err, reply){
		if(err){
			callback(err);
		} else {
			var accessFromUser = reply;
			findRoleMenuAccess(role, self.client, function(err, reply){
				if(err){
					callback(err);
				} else {
					var accessFromRole = reply;

					//Пересекаем права
					var listOfFields = crossingAccess(accessFromUser, accessFromRole, objGlobalMenu);

					callback(null, listOfFields);
				}
			});

		}
	});


};

function crossingAccess(accessFromUser, accessFromRole, objGlobalMenu){
	//Получаем список (all) элементов меню
	var allFields = listOfAllFields(objGlobalMenu);

	//Просматриваем справочники полей от роли и от пользователя на наличие (all)
	for(var i=0; i<accessFromRole.add.length; i++){
		if(accessFromRole.add[i] === '(all)'){
			accessFromRole.add = underscore.without(accessFromRole.add, '(all)');
			accessFromRole.add = underscore.union(accessFromRole.add, allFields);
			break;
		}
	}

	for(var i=0; i<accessFromRole.del.length; i++){
		if(accessFromRole.del[i] === '(all)'){
			accessFromRole.del = underscore.without(accessFromRole.del, '(all)');
			accessFromRole.del = underscore.union(accessFromRole.del, allFields);
			break;
		}
	}

	for(var i=0; i<accessFromUser.add.length; i++){
		if(accessFromUser.add[i] === '(all)'){
			accessFromUser.add = underscore.without(accessFromUser.add, '(all)');
			accessFromUser.add = underscore.union(accessFromUser.add, allFields);
			break;
		}
	}

	for(var i=0; i<accessFromUser.del.length; i++){
		if(accessFromUser.del[i] === '(all)'){
			accessFromUser.del = underscore.without(accessFromUser.del, '(all)');
			accessFromUser.del = underscore.union(accessFromUser.del, allFields);
			break;
		}
	}

	//Переcекаем права по роли
	var listForRemove = [];
	for(var i=0; i<accessFromRole.del.length; i++){
		var keyDel = accessFromRole.del[i].split('/');

		for(var j=0; j<accessFromRole.add.length; j++){

			var keyAdd = accessFromRole.add[j].split('/');

			for(var k=0; k<keyDel.length; k++){
				if(!keyAdd[k]){
					break;
				}

				if (keyDel[k] !== keyAdd[k]){
					break;
				}

				if(k === (keyDel.length - 1)) {
					listForRemove.push(accessFromRole.add[j]);
					break;
				}
			}
		}
	}

	var fieldsFromRole = underscore.difference(accessFromRole.add, listForRemove);
	//Перечекаем с правами по пользователю
	var permissionFields = underscore.union(fieldsFromRole, accessFromUser.add );

	var listForRemoveFromUser = [];
	for(var i=0; i<accessFromUser.del.length; i++){
		var keyDel = accessFromUser.del[i].split('/');

		for(var j=0; j<permissionFields.length; j++){

			var keyAdd = permissionFields[j].split('/');

			for(var k=0; k<keyDel.length; k++){
				if(!keyAdd[k]){
					break;
				}

				if (keyDel[k] !== keyAdd[k]){
					break;
				}

				if(k === (keyDel.length - 1)) {
					listForRemoveFromUser.push(permissionFields[j]);
					break;
				}
			}
		}
	}
	permissionFields = underscore.difference(permissionFields, listForRemoveFromUser);

	return permissionFields;
}

function listOfAllFields(objGlobalMenu){
	var keys = Object.keys(objGlobalMenu);
	var list = [];

	for(var i=0; i<keys.length; i++){

		var listNested = nestedFields(objGlobalMenu[keys[i]]);
		if(listNested.length !== 0){
			for(var k=0; k<listNested.length; k++){
				list.push(keys[i] + '/' + listNested[k]);
			}
			list.push(keys[i]);
		} else {
			list.push(keys[i]);
		}
	}
	return underscore.uniq(list);
}

function nestedFields(obj){
	var keys = Object.keys(obj);
	var list = [];
	for(var i=0; i<keys.length; i++){
		if(keys[i] === 'submenu'){
			var subKeys = Object.keys(obj[keys[i]]);
			for(var j=0; j<subKeys.length; j++){
				var listNested = nestedFields(obj[keys[i]][subKeys[j]]);
				if(listNested.length !== 0){
					for(var k=0; k<listNested.length; k++){
						list.push(subKeys[j] + '/' + listNested[k]);
					}
					list.push(subKeys[j]);
				} else {
					list.push(subKeys[j]);
				}
			}
		}
	}
	return list;
}

function findRoleMenuAccess(role, client, callback){
	client.SMEMBERS( setRoleMenuAll( role ), function( err, keys ) {
		var multi = client.multi();

		for( var i=0; i<keys.length; i++){
			multi.GET( strRoleMenu( role, keys[i] ));
		}

		multi.EXEC(function( err, replies ){
			if(err){
				callback( err );
			} else {

				var obj = {};
				obj.add = [];
				obj.del = [];

				for(var i=0; i<replies.length; i++){
					if( replies[i] === '1') {
						obj.add.push(keys[i]);
					} else {
						obj.del.push(keys[i]);
					}
				}
				callback( null, obj );
			}
		});

	} );
}

function findUserMenuAccess(login, client, callback){
	client.SMEMBERS( setLoginMenuAll( login ), function( err, keys ) {
		var multi = client.multi();

		for( var i=0; i<keys.length; i++){
			multi.GET( strLoginMenu( login, keys[i] ));
		}

		multi.EXEC(function( err, replies ){
			if(err){
				callback( err );
			} else {

				var obj = {};
				obj.add = [];
				obj.del = [];

				for(var i=0; i<replies.length; i++){
					if( replies[i] === '1' ) {
						obj.add.push(keys[i]);
					} else {
						obj.del.push(keys[i]);
					}
				}
				callback( null, obj );
			}
		});

	} );
}

//Формирование строки ключа Redis (STRING) для хранения права доступа к элементу меню по роли
function strRoleMenu( role, menu ) {
	return 'role:menu:' + role + ':' + menu;
}

//Формирование строки ключа Redis (STRING) для хранения права доступа к элементу меню по пользователю
function strLoginMenu( login, menu ) {
	return 'user:menu:' + login + ':' + menu;
}

//Формирование строки ключа Redis (SET) для хранения ссылок на все элементы меню по роли
function setRoleMenuAll( role ) {
	return 'all:role:menu' +  role ;
}

//Формирование строки ключа Redis (SET) для хранения ссылок на все элементы меню по пользователю
function setLoginMenuAll( login ) {
	return 'all:user:menu' + login ;
}

//Формирование ключа Redis (SET) для множества всех ключей с правами
function setAllAccess(){
	return 'all:access:';
}