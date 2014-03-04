var async = require( 'async' );
var _ = require('underscore');

var LibOfTestAccess = {};

LibOfTestAccess.init = function init(oController, o_views, o_flexos){
	controller = oController;
	_views = o_views;
	_flexos = o_flexos;
	return true;
};

LibOfTestAccess.generateAccessToView = function generateAccessToView(type, roleOrLogin, viewName, all, totalFields, listOfFlexos){
	if (type === 'role'){
		//Создаем пустой объект прав
		var oAccess = {
			'(all)':0,
			'viewIds':[],
			'(useId)':0
		};

		//Устанавливаем '(all)'
		oAccess['(all)'] = all;

		if ( all ) {

			//Формируем список доступных viewId для постановки прав
			var oViewIdForEachFlexo = {};
			for(var i=0; i<listOfFlexos.length; i++){
				oViewIdForEachFlexo[listOfFlexos[i]] = getViewId(viewName, listOfFlexos[i]);
			}

			for(var i=0; i<totalFields; i++){
				for(var j=0; j<listOfFlexos.length; j++){

					if(oViewIdForEachFlexo[listOfFlexos[j]].length){
						//Выбираем один случайный идентификатор
						var index = getRandom(0, (oViewIdForEachFlexo[listOfFlexos[j]].length-1));
						var view = oViewIdForEachFlexo[listOfFlexos[j]][index];
						oViewIdForEachFlexo[listOfFlexos[j]].splice(index, 1);
						oAccess.viewIds.push(view);

						if (j !== (listOfFlexos.length - 1)){
							i++;
						}

					}
				}
			}

		} else {

			//Формируем список доступных viewId для постановки прав
			var oViewIdForEachFlexo = {};
			for(var i=0; i<listOfFlexos.length; i++){
				oAccess.viewIds = _.union(oAccess.viewIds, getViewIdWith_idAndTsUpdate(viewName, listOfFlexos[i]));
				oViewIdForEachFlexo[listOfFlexos[i]] = getViewId(viewName, listOfFlexos[i]);
			}

			var newTotalFields = totalFields - oAccess.viewIds.length;

			for(var i=0; i<newTotalFields; i++){
				for(var j=0; j<listOfFlexos.length; j++){

					if(oViewIdForEachFlexo[listOfFlexos[j]].length){
						//Выбираем один случайный идентификатор
						var index = getRandom(0, (oViewIdForEachFlexo[listOfFlexos[j]].length-1));
						var view = oViewIdForEachFlexo[listOfFlexos[j]][index];
						oViewIdForEachFlexo[listOfFlexos[j]].splice(index, 1);
						oAccess.viewIds.push(view);

						if (j !== (listOfFlexos.length - 1)){
							i++;
						}

					}
				}
			}


		}

		return {
			access:{
				viewName:viewName,
				role:roleOrLogin,
				objAccess:oAccess
			}
		};
	} else if (type === 'user') {
		//Создаем пустой объект прав
		var oAccess = {
			'(all)':0,
			'viewIdsDel':[],
			'viewIdsAdd':[],
			'(useId)':0
		};

		//Устанавливаем '(all)'
		oAccess['(all)'] = all;

		if ( all ) {

			//Формируем список доступных viewId для постановки прав
			var oViewIdForEachFlexo = {};
			for(var i=0; i<listOfFlexos.length; i++){
				oViewIdForEachFlexo[listOfFlexos[i]] = getViewId(viewName, listOfFlexos[i]);
			}

			for(var i=0; i<totalFields; i++){
				for(var j=0; j<listOfFlexos.length; j++){

					if(oViewIdForEachFlexo[listOfFlexos[j]].length){
						//Выбираем один случайный идентификатор
						var index = getRandom(0, (oViewIdForEachFlexo[listOfFlexos[j]].length-1));
						var view = oViewIdForEachFlexo[listOfFlexos[j]][index];
						oViewIdForEachFlexo[listOfFlexos[j]].splice(index, 1);
						oAccess.viewIdsDel.push(view);

						if (j !== (listOfFlexos.length - 1)){
							i++;
						}

					}
				}
			}

		} else {

			//Формируем список доступных viewId для постановки прав
			var oViewIdForEachFlexo = {};
			for(var i=0; i<listOfFlexos.length; i++){
				oAccess.viewIdsAdd = _.union(oAccess.viewIdsAdd, getViewIdWith_idAndTsUpdate(viewName, listOfFlexos[i]));
				oViewIdForEachFlexo[listOfFlexos[i]] = getViewId(viewName, listOfFlexos[i]);
			}

			var newTotalFields = totalFields - oAccess.viewIds.length;

			for(var i=0; i<newTotalFields; i++){
				for(var j=0; j<listOfFlexos.length; j++){

					if(oViewIdForEachFlexo[listOfFlexos[j]].length){
						//Выбираем один случайный идентификатор
						var index = getRandom(0, (oViewIdForEachFlexo[listOfFlexos[j]].length-1));
						var view = oViewIdForEachFlexo[listOfFlexos[j]][index];
						oViewIdForEachFlexo[listOfFlexos[j]].splice(index, 1);
						oAccess.viewIdsAdd.push(view);

						if (j !== (listOfFlexos.length - 1)){
							i++;
						}

					}
				}
			}
		}

		return {
			access:{
				viewName:viewName,
				login:roleOrLogin,
				objAccess:oAccess
			}
		};
	} else {
		return false;
	}
};

LibOfTestAccess.saveAccessToView = function saveAccessToView(aObjAccesses, sender, callback){
	async.map(aObjAccesses,
		function( queryForSave, cb ){

			controller.create(queryForSave, sender, cb);
		},
		callback
	);
};

LibOfTestAccess.generateAccessToFlexo = function generateAccessToView(type, roleOrLogin, flexoName, all, totalFields){
	if (type === 'role'){
		var oAccess = {
			read: {
				'(all)':0,
				'fields':[]
			},
			modify: {
				'(all)':1,
				'fields':[]
			},
			create: {
				'(all)':1,
				'fields':[]
			},
			createAll: 0,
			delete: 1
		};

		//Устанавливаем '(all)'
		oAccess.read['(all)'] = all.read;
		oAccess.modify['(all)'] = all.modify;
		oAccess.create['(all)'] = all.create;
		oAccess.createAll = all.createAll;
		oAccess.delete = all.delete;

		//Формируем права на чтение
		//Список полей на чтение
		var listOfFieldsForRead = _.without(_flexos[flexoName].read, 'id', 'tsUpdate');

		for( var i=0; i<totalFields.read; i++ ){
			//Выбираем один случайный идентификатор
			var index = getRandom(0, (listOfFieldsForRead.length-1));
			listOfFieldsForRead.splice(index, 1);
			oAccess.read.fields.push(listOfFieldsForRead[index]);
		}

		//Формируем права на модификацию
		//Список полей на модификацию
		var listOfFieldsForModify = _.without(_flexos[flexoName].modify, 'id', 'tsUpdate');

		for( var i=0; i<totalFields.modify; i++ ){
			//Выбираем один случайный идентификатор
			var index = getRandom(0, (listOfFieldsForModify.length-1));
			listOfFieldsForModify.splice(index, 1);
			oAccess.modify.fields.push(listOfFieldsForModify[index]);
		}

		return {
			access:{
				flexoSchemeName:flexoName,
				role:roleOrLogin,
				objAccess:oAccess
			}
		}

	} else if ( type === 'user' ) {
		var oAccess = {
			read: {
				'(all)':1,
				'fieldsAdd':[],
				'fieldsDel':[]
			},
			modify: {
				'(all)':1,
				'fieldsAdd':[],
				'fieldsDel':[]
			},
			create: {
				'(all)':1,
				'fieldsAdd':[],
				'fieldsDel':[]
			},
			createAll: 0,
			delete: 1
		};

		//Устанавливаем '(all)'
		oAccess.read['(all)'] = all.read;
		oAccess.modify['(all)'] = all.modify;
		oAccess.create['(all)'] = all.create;
		oAccess.createAll = all.createAll;
		oAccess.delete = all.delete;

		if (all.read){
			//Формируем права на чтение
			//Список полей на чтение
			var listOfFieldsForRead = _.without(_flexos[flexoName].read, 'id', 'tsUpdate');

			for( var i=0; i<totalFields.read; i++ ){
				//Выбираем один случайный идентификатор
				var index = getRandom(0, (listOfFieldsForRead.length-1));
				listOfFieldsForRead.splice(index, 1);
				oAccess.read.fieldsDel.push(listOfFieldsForRead[index]);
			}
		} else {
			//Формируем права на чтение
			//Список полей на чтение
			var listOfFieldsForRead = _.without(_flexos[flexoName].read, 'id', 'tsUpdate');

			for( var i=0; i<totalFields.read; i++ ){
				//Выбираем один случайный идентификатор
				var index = getRandom(0, (listOfFieldsForRead.length-1));
				listOfFieldsForRead.splice(index, 1);
				oAccess.read.fieldsAdd.push(listOfFieldsForRead[index]);
			}
		}

		if (all.modify){
			//Формируем права на модификацию
			//Список полей на модификацию
			var listOfFieldsForModify = _.without(_flexos[flexoName].modify, 'id', 'tsUpdate');

			for( var i=0; i<totalFields.modify; i++ ){
				//Выбираем один случайный идентификатор
				var index = getRandom(0, (listOfFieldsForModify.length-1));
				listOfFieldsForModify.splice(index, 1);
				oAccess.modify.fieldsDel.push(listOfFieldsForModify[index]);
			}
		} else {
			//Формируем права на модификацию
			//Список полей на модификацию
			var listOfFieldsForModify = _.without(_flexos[flexoName].modify, 'id', 'tsUpdate');

			for( var i=0; i<totalFields.modify; i++ ){
				//Выбираем один случайный идентификатор
				var index = getRandom(0, (listOfFieldsForModify.length-1));
				listOfFieldsForModify.splice(index, 1);
				oAccess.modify.fieldsAdd.push(listOfFieldsForModify[index]);
			}
		}

		return {
			access:{
				flexoSchemeName:flexoName,
				login:roleOrLogin,
				objAccess:oAccess
			}
		}

	} else {
		return false;
	}

};

LibOfTestAccess.saveAccessToFlexo = function saveAccessToFlexo(aObjAccesses, sender, callback){
	async.map(aObjAccesses,
		function( queryForSave, cb ){

			controller.create(queryForSave, sender, cb);
		},
		callback
	);
};

function getViewId(viewName, flexoName){
	var listOfViewIds = Object.keys( _views[viewName] );
	var resultList = [];
	for( var i=0; i < listOfViewIds.length; i++ ) {
		if( _views[viewName][listOfViewIds[i]]._flexo &&
			(_views[viewName][listOfViewIds[i]]._flexo.type === 'read' ||
				_views[viewName][listOfViewIds[i]]._flexo.type === 'modify')&&
			_views[viewName][listOfViewIds[i]]._flexo.scheme[0] === flexoName &&
			_views[viewName][listOfViewIds[i]]._flexo.scheme[1] !== '_id' &&
			_views[viewName][listOfViewIds[i]]._flexo.scheme[1] !== 'tsUpdate') {
			resultList.push(listOfViewIds[i]);
		}
	}

	return resultList;
}

function getViewIdWith_idAndTsUpdate(viewName, flexoName){
	var listOfViewIds = Object.keys( _views[viewName] );
	var resultList = [];
	for( var i=0; i < listOfViewIds.length; i++ ) {
		if( _views[viewName][listOfViewIds[i]]._flexo &&
			(_views[viewName][listOfViewIds[i]]._flexo.type === 'read' ||
				_views[viewName][listOfViewIds[i]]._flexo.type === 'modify')&&
			_views[viewName][listOfViewIds[i]]._flexo.scheme[0] === flexoName &&
			(_views[viewName][listOfViewIds[i]]._flexo.scheme[1] === '_id' ||
			_views[viewName][listOfViewIds[i]]._flexo.scheme[1] === 'tsUpdate')) {
			resultList.push(listOfViewIds[i]);
		}
	}

	return resultList;
}

//Создаем случайное число в заданных пределах
function getRandom(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

module.exports = LibOfTestAccess;