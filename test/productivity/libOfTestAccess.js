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
		return false;
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